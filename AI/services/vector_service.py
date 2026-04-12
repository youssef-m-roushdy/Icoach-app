import logging
from typing import List
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class VectorEngine:
    """
    Singleton pattern for SentenceTransformer embeddings.
    Loads the model once to avoid high memory usage and latency overhead per API call.
    """
    _model = None

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            logger.info("Initializing SentenceTransformer (all-MiniLM-L6-v2) into memory...")
            # Load once and keep in memory
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("SentenceTransformer model loaded successfully.")
        return cls._model

    @classmethod
    def encode_query(cls, query: str) -> List[float]:
        model = cls.get_model()
        return model.encode(query).tolist()
