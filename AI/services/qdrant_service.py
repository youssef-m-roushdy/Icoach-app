# services/qdrant_service.py

import logging
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

# استيراد محرك الفيكتور اللي إنت عملته
from services.vector_service import VectorEngine

logger = logging.getLogger(__name__)

class QdrantService:
    def __init__(self):
        # التوصيل بـ Qdrant
        self.host = "qdrant" 
        self.port = 6333
        
        try:
            self.client = QdrantClient(host=self.host, port=self.port)
            self.collection_name = "user_long_term_memory"
            self.vector_size = 384  # حجم الفيكتور لموديل all-MiniLM-L6-v2
            
            # نأمر السيرفر يتأكد إن الـ Collection موجودة أول ما يشتغل
            self._ensure_collection_exists()
        except Exception as e:
            logger.error(f"❌ Failed to connect to Qdrant at {self.host}:{self.port} - {e}")

    def _ensure_collection_exists(self):
        """تأكد من وجود الـ Collection أو إنشائها لو مش موجودة"""
        try:
            if not self.client.collection_exists(self.collection_name):
                logger.info(f"🚀 Creating Qdrant collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                )
                logger.info("✅ Qdrant Collection created successfully.")
            else:
                logger.info("✅ Qdrant Collection already exists.")
        except Exception as e:
            logger.error(f"❌ Error initializing Qdrant Collection: {e}")

    async def save_memory(self, user_id: int, text: str, metadata: dict = None):
        """تحويل النص لفيكتور وتخزينه في Qdrant"""
        try:
            vector = VectorEngine.encode_query(text)
            
            point_id = str(uuid.uuid4())
            payload = {
                "user_id": user_id,
                "content": text,
                "metadata": metadata or {}
            }
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    PointStruct(id=point_id, vector=vector, payload=payload)
                ]
            )
            logger.info(f"🧠 Memory saved to Qdrant for user {user_id}: {text}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to save memory to Qdrant: {e}")
            return False

    async def search_similar_memories(self, user_id: int, query: str, limit: int = 3):
        """البحث عن ذكريات قديمة مرتبطة بسؤال اليوزر الحالي"""
        try:
            # 1. تحويل السؤال الحالي لفيكتور عشان ندور بيه
            query_vector = VectorEngine.encode_query(query)
            
            # 2. البحث في Qdrant باستخدام دالة query_points المحدثة
            search_result = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id)
                        )
                    ]
                ),
                limit=limit
            )
            
            # 3. استخراج النصوص (الذكريات) من النتائج
            # لاحظ: النسخة الجديدة بترجع الـ points جوه attribute اسمه points
            memories = [hit.payload["content"] for hit in search_result.points]
            
            if memories:
                logger.info(f"🔍 Found {len(memories)} memories for user {user_id}")
            
            return memories
        except Exception as e:
            logger.error(f"❌ Qdrant search error: {e}")
            return []

# عمل instance واحدة (Singleton) لاستخدامها في كل التطبيق
qdrant_svc = QdrantService()