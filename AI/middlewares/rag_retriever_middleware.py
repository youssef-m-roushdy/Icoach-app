"""
RAG Retriever Middleware
Fixes:
  - full try/except around Qdrant (graceful fallback when DB is down)
  - reads from request.state.cached_body
  - scores are rounded before storing
  - not_found_strategy computed here to keep ResponseFormatter clean
  - de-duplication of chunks by text content (same chunk from two domains)
  - embedding errors are caught separately so we know exactly what failed
  - Uses sentence-transformers for local embeddings (no OpenAI)
"""

import json
import logging
import sys
from pathlib import Path

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sentence_transformers import SentenceTransformer
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize sentence-transformers for local embeddings (free, no API key)
_embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
_qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)

# Minimum cosine similarity to treat a result as relevant
SIMILARITY_THRESHOLD = getattr(settings, "RAG_SIMILARITY_THRESHOLD", 0.72)
TOP_K                = getattr(settings, "RAG_TOP_K_RESULTS", 3)


def _choose_not_found_strategy(clf: dict, message: str) -> str:
    """Decide how ResponseFormatter should handle a zero-result query."""
    if clf.get("needs_web_search", False):
        # web_context may already be populated by ScopeGuard
        return "use_web_context"
    word_count = len(message.split())
    if word_count < 4:
        return "ask_clarification"
    return "general_knowledge"   # let LLM answer from its own knowledge + disclaimer


class RAGRetrieverMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        clf     = getattr(request.state, "classification", {})
        domains = clf.get("domains", [])

        # ── parse message ────────────────────────────────────────────
        try:
            data    = json.loads(request.state.cached_body)
            message = data.get("message", "").strip()
        except Exception:
            message = ""

        # No domains → nothing to retrieve
        if not domains or not message:
            request.state.not_found          = True
            request.state.chunks             = []
            request.state.not_found_strategy = _choose_not_found_strategy(clf, message)
            return await call_next(request)

        # ── generate query embedding using sentence-transformers ─────
        try:
            # Generate embedding locally (no API call)
            query_vector = _embedding_model.encode(message).tolist()
            logger.info(f"Generated embedding for: {message[:50]}...")
        except Exception as exc:
            logger.error(f"Embedding generation failed: {exc}")
            request.state.not_found          = True
            request.state.chunks             = []
            request.state.not_found_strategy = "general_knowledge"
            return await call_next(request)

        # ── vector search across all relevant domains ───────────────
        all_chunks  = []
        seen_texts  = set()   # de-duplicate identical chunks

        for domain in domains:
            try:
                # Use query_points instead of search (qdrant-client >= 1.17)
                response = await _qdrant.query_points(
                    collection_name=domain,
                    query=query_vector,
                    limit=TOP_K,
                    score_threshold=SIMILARITY_THRESHOLD,
                )
                for r in response.points:
                    text = r.payload.get("text", "").strip()
                    if not text or text in seen_texts:
                        continue
                    seen_texts.add(text)
                    all_chunks.append({
                        "domain": domain,
                        "text":   text,
                        "score":  round(r.score, 4),
                        "id":     str(r.id),
                    })
                logger.info(
                    f"Qdrant [{domain}] — {len(response.points)} results "
                    f"(threshold={SIMILARITY_THRESHOLD})"
                )
            except UnexpectedResponse as exc:
                # Collection might not exist yet
                logger.warning(f"Qdrant collection '{domain}' error: {exc}")
            except Exception as exc:
                logger.error(f"Qdrant search failed for '{domain}': {exc}")

        # Sort by relevance score descending
        all_chunks.sort(key=lambda c: c["score"], reverse=True)

        if all_chunks:
            request.state.not_found = False
            request.state.chunks    = all_chunks
            logger.info(
                f"RAG retrieved {len(all_chunks)} chunks from "
                f"{list({c['domain'] for c in all_chunks})}"
            )
        else:
            request.state.not_found          = True
            request.state.chunks             = []
            request.state.not_found_strategy = _choose_not_found_strategy(clf, message)
            logger.info(
                f"RAG found nothing in {domains} for message: {message[:60]!r} "
                f"— strategy: {request.state.not_found_strategy}"
            )

        return await call_next(request)