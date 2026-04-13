# scripts/seed_foods.py
"""
Seed food data to Qdrant vector database
Run: python scripts/seed_foods.py
"""
import uuid
import json
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from qdrant_client.http.models import VectorParams, Distance

# Configuration
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "foods"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_SIZE = 384

# Food data from your JSON
FOODS_DATA = [
    {"name": "adds_soup", "calories": 70.0, "protein": 4.0, "carbs": 10.0, "fat": 2.0, "sugar": 0.0},
    {"name": "aesh_baldy", "calories": 260.0, "protein": 9.0, "carbs": 55.0, "fat": 2.0, "sugar": 0.0},
    {"name": "aolaas", "calories": 95.0, "protein": 2.0, "carbs": 20.0, "fat": 2.0, "sugar": 0.0},
    {"name": "apple", "calories": 52.0, "protein": 0.3, "carbs": 14.0, "fat": 0.3, "sugar": 0.0},
    {"name": "apple_pie", "calories": 237.0, "protein": 2.4, "carbs": 34.0, "fat": 11.0, "sugar": 0.0},
    {"name": "bamya", "calories": 90.0, "protein": 2.0, "carbs": 8.0, "fat": 5.0, "sugar": 0.0},
    {"name": "banana", "calories": 89.0, "protein": 1.1, "carbs": 23.0, "fat": 0.3, "sugar": 0.0},
    {"name": "basbousa", "calories": 350.0, "protein": 5.0, "carbs": 50.0, "fat": 15.0, "sugar": 0.0},
    {"name": "bashamil", "calories": 200.0, "protein": 10.0, "carbs": 25.0, "fat": 10.0, "sugar": 0.0},
    {"name": "breakfast_burrito", "calories": 270.0, "protein": 12.0, "carbs": 25.0, "fat": 15.0, "sugar": 0.0},
    {"name": "caesar_salad", "calories": 180.0, "protein": 10.0, "carbs": 7.0, "fat": 10.0, "sugar": 0.0},
    {"name": "cannoli", "calories": 350.0, "protein": 7.0, "carbs": 35.0, "fat": 21.0, "sugar": 20.0},
    {"name": "carrot", "calories": 41.0, "protein": 1.0, "carbs": 10.0, "fat": 0.2, "sugar": 0.0},
    {"name": "cheese_plate", "calories": 350.0, "protein": 22.0, "carbs": 3.0, "fat": 28.0, "sugar": 0.0},
    {"name": "cheesecake", "calories": 360.0, "protein": 6.0, "carbs": 30.0, "fat": 25.0, "sugar": 25.0},
    {"name": "chicken_wings", "calories": 300.0, "protein": 20.0, "carbs": 10.0, "fat": 22.0, "sugar": 0.0},
    {"name": "chocolate_cake", "calories": 390.0, "protein": 5.0, "carbs": 55.0, "fat": 18.0, "sugar": 40.0},
    {"name": "cinabon", "calories": 420.0, "protein": 4.0, "carbs": 60.0, "fat": 18.0, "sugar": 30.0},
    {"name": "creme_brulee", "calories": 300.0, "protein": 4.0, "carbs": 25.0, "fat": 20.0, "sugar": 25.0},
    {"name": "cucumber", "calories": 15.0, "protein": 0.6, "carbs": 3.6, "fat": 0.1, "sugar": 0.0},
    {"name": "cup_cakes", "calories": 390.0, "protein": 4.5, "carbs": 56.0, "fat": 18.0, "sugar": 38.0},
    {"name": "deviled_eggs", "calories": 200.0, "protein": 11.0, "carbs": 2.0, "fat": 16.0, "sugar": 0.0},
    {"name": "donuts", "calories": 400.0, "protein": 5.0, "carbs": 55.0, "fat": 20.0, "sugar": 0.0},
    {"name": "eggs_benedict", "calories": 230.0, "protein": 11.0, "carbs": 10.0, "fat": 14.0, "sugar": 0.0},
    {"name": "falafel", "calories": 340.0, "protein": 14.0, "carbs": 32.0, "fat": 18.0, "sugar": 0.0},
    {"name": "fatta", "calories": 200.0, "protein": 12.0, "carbs": 23.0, "fat": 10.0, "sugar": 0.0},
    {"name": "fig", "calories": 74.0, "protein": 0.8, "carbs": 19.0, "fat": 0.3, "sugar": 16.0},
    {"name": "fish", "calories": 240.0, "protein": 20.0, "carbs": 10.0, "fat": 12.0, "sugar": 0.0},
    {"name": "fish_and_chips", "calories": 250.0, "protein": 14.0, "carbs": 25.0, "fat": 13.0, "sugar": 0.0},
    {"name": "fool", "calories": 160.0, "protein": 8.0, "carbs": 16.0, "fat": 9.0, "sugar": 0.0},
    {"name": "french_fries", "calories": 300.0, "protein": 4.0, "carbs": 37.0, "fat": 15.0, "sugar": 0.0},
    {"name": "french_onion_soup", "calories": 55.0, "protein": 2.5, "carbs": 6.0, "fat": 4.0, "sugar": 3.0},
    {"name": "french_toast", "calories": 210.0, "protein": 8.0, "carbs": 22.0, "fat": 8.0, "sugar": 4.0},
    {"name": "fried_calamari", "calories": 230.0, "protein": 15.0, "carbs": 10.0, "fat": 14.0, "sugar": 0.0},
    {"name": "frozen_yogurt", "calories": 140.0, "protein": 4.0, "carbs": 25.0, "fat": 4.0, "sugar": 23.0},
    {"name": "garlic_bread", "calories": 350.0, "protein": 8.0, "carbs": 40.0, "fat": 18.0, "sugar": 3.0},
    {"name": "golash", "calories": 270.0, "protein": 10.0, "carbs": 22.0, "fat": 16.0, "sugar": 0.0},
    {"name": "grape", "calories": 69.0, "protein": 0.7, "carbs": 18.0, "fat": 0.2, "sugar": 0.0},
    {"name": "grilled_cheese_sandwich", "calories": 350.0, "protein": 12.0, "carbs": 28.0, "fat": 22.0, "sugar": 0.0},
    {"name": "grilled_salmon", "calories": 200.0, "protein": 22.0, "carbs": 0.0, "fat": 13.0, "sugar": 0.0},
    {"name": "hamburger", "calories": 300.0, "protein": 17.0, "carbs": 26.0, "fat": 16.0, "sugar": 0.0},
    {"name": "hawawshy", "calories": 250.0, "protein": 13.0, "carbs": 20.0, "fat": 16.0, "sugar": 0.0},
    {"name": "hot_dog", "calories": 300.0, "protein": 11.0, "carbs": 24.0, "fat": 19.0, "sugar": 0.0},
    {"name": "ice_cream", "calories": 210.0, "protein": 4.0, "carbs": 25.0, "fat": 13.0, "sugar": 23.0},
    {"name": "kebda", "calories": 200.0, "protein": 26.0, "carbs": 5.0, "fat": 7.0, "sugar": 0.0},
    {"name": "kofta", "calories": 250.0, "protein": 18.0, "carbs": 4.0, "fat": 13.0, "sugar": 0.0},
    {"name": "konafa", "calories": 380.0, "protein": 7.0, "carbs": 47.0, "fat": 25.0, "sugar": 27.0},
    {"name": "koshari", "calories": 160.0, "protein": 7.0, "carbs": 30.0, "fat": 5.0, "sugar": 0.0},
    {"name": "lasagna", "calories": 180.0, "protein": 9.0, "carbs": 18.0, "fat": 9.0, "sugar": 0.0},
    {"name": "macaroni_and_cheese", "calories": 190.0, "protein": 8.0, "carbs": 22.0, "fat": 9.0, "sugar": 0.0},
    {"name": "macarons", "calories": 480.0, "protein": 9.0, "carbs": 65.0, "fat": 20.0, "sugar": 57.0},
    {"name": "mahshi", "calories": 125.0, "protein": 3.0, "carbs": 16.0, "fat": 1.0, "sugar": 0.0},
    {"name": "mandi", "calories": 200.0, "protein": 16.0, "carbs": 14.0, "fat": 9.0, "sugar": 0.0},
    {"name": "mango", "calories": 60.0, "protein": 0.8, "carbs": 15.0, "fat": 0.4, "sugar": 14.0},
    {"name": "mansaf", "calories": 185.0, "protein": 10.0, "carbs": 16.0, "fat": 9.0, "sugar": 0.0},
    {"name": "meat", "calories": 230.0, "protein": 27.0, "carbs": 0.0, "fat": 13.0, "sugar": 0.0},
    {"name": "mesaqaa", "calories": 170.0, "protein": 10.0, "carbs": 10.0, "fat": 13.0, "sugar": 0.0},
    {"name": "molokhia", "calories": 65.0, "protein": 4.0, "carbs": 5.5, "fat": 3.0, "sugar": 0.0},
    {"name": "mombar", "calories": 250.0, "protein": 9.0, "carbs": 17.0, "fat": 17.0, "sugar": 0.0},
    {"name": "muaskhan", "calories": 250.0, "protein": 13.0, "carbs": 15.0, "fat": 15.0, "sugar": 0.0},
    {"name": "nachos", "calories": 230.0, "protein": 10.0, "carbs": 22.0, "fat": 13.0, "sugar": 0.0},
    {"name": "om_ali", "calories": 280.0, "protein": 7.0, "carbs": 30.0, "fat": 16.0, "sugar": 22.0},
    {"name": "omelette", "calories": 180.0, "protein": 11.0, "carbs": 1.0, "fat": 14.0, "sugar": 0.0},
    {"name": "onion", "calories": 40.0, "protein": 1.1, "carbs": 9.0, "fat": 0.1, "sugar": 4.0},
    {"name": "onion_rings", "calories": 280.0, "protein": 4.0, "carbs": 35.0, "fat": 14.0, "sugar": 0.0},
    {"name": "orange", "calories": 47.0, "protein": 0.9, "carbs": 12.0, "fat": 0.1, "sugar": 9.0},
    {"name": "pancakes", "calories": 260.0, "protein": 5.0, "carbs": 40.0, "fat": 9.0, "sugar": 18.0},
    {"name": "pastries", "calories": 400.0, "protein": 7.0, "carbs": 45.0, "fat": 20.0, "sugar": 25.0},
    {"name": "peach", "calories": 39.0, "protein": 0.9, "carbs": 10.0, "fat": 0.3, "sugar": 8.0},
    {"name": "pheno", "calories": 280.0, "protein": 9.0, "carbs": 53.0, "fat": 3.0, "sugar": 0.0},
    {"name": "pizza", "calories": 320.0, "protein": 14.0, "carbs": 30.0, "fat": 15.0, "sugar": 0.0},
    {"name": "pomegranate", "calories": 83.0, "protein": 1.7, "carbs": 19.0, "fat": 1.2, "sugar": 14.0},
    {"name": "qatayef", "calories": 350.0, "protein": 7.0, "carbs": 45.0, "fat": 16.0, "sugar": 0.0},
    {"name": "red_velvet_cake", "calories": 380.0, "protein": 5.0, "carbs": 47.0, "fat": 20.0, "sugar": 0.0},
    {"name": "rice", "calories": 130.0, "protein": 2.7, "carbs": 28.0, "fat": 0.3, "sugar": 0.0},
    {"name": "rice_with_milk", "calories": 140.0, "protein": 4.0, "carbs": 23.0, "fat": 3.0, "sugar": 16.0},
    {"name": "risotto", "calories": 140.0, "protein": 4.0, "carbs": 23.0, "fat": 5.0, "sugar": 0.0},
    {"name": "sambosa", "calories": 350.0, "protein": 12.0, "carbs": 22.0, "fat": 25.0, "sugar": 0.0},
    {"name": "scallops", "calories": 200.0, "protein": 20.0, "carbs": 5.0, "fat": 12.0, "sugar": 0.0},
    {"name": "shawrma", "calories": 250.0, "protein": 14.0, "carbs": 20.0, "fat": 15.0, "sugar": 0.0},
    {"name": "shrimp", "calories": 180.0, "protein": 24.0, "carbs": 5.0, "fat": 6.0, "sugar": 0.0},
    {"name": "shrimp_and_grits", "calories": 175.0, "protein": 12.0, "carbs": 14.0, "fat": 9.0, "sugar": 0.0},
    {"name": "sojoq", "calories": 300.0, "protein": 18.0, "carbs": 5.0, "fat": 22.0, "sugar": 0.0},
    {"name": "spaghetti_bolognese", "calories": 160.0, "protein": 8.0, "carbs": 20.0, "fat": 6.0, "sugar": 0.0},
    {"name": "spaghetti_carbonara", "calories": 200.0, "protein": 9.0, "carbs": 20.0, "fat": 11.0, "sugar": 0.0},
    {"name": "spring_rolls", "calories": 200.0, "protein": 8.0, "carbs": 20.0, "fat": 8.0, "sugar": 0.0},
    {"name": "steak", "calories": 280.0, "protein": 26.0, "carbs": 3.0, "fat": 20.0, "sugar": 0.0},
    {"name": "strawberry", "calories": 32.0, "protein": 0.7, "carbs": 7.7, "fat": 0.3, "sugar": 4.9},
    {"name": "sushi", "calories": 260.0, "protein": 8.0, "carbs": 25.0, "fat": 12.0, "sugar": 0.0},
    {"name": "tacos", "calories": 200.0, "protein": 9.0, "carbs": 15.0, "fat": 11.0, "sugar": 0.0},
    {"name": "takoyaki", "calories": 170.0, "protein": 8.0, "carbs": 20.0, "fat": 8.0, "sugar": 0.0},
    {"name": "tiramisu", "calories": 320.0, "protein": 6.0, "carbs": 29.0, "fat": 20.0, "sugar": 24.0},
    {"name": "tomato", "calories": 18.0, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "sugar": 2.6},
    {"name": "tuna", "calories": 200.0, "protein": 27.0, "carbs": 0.0, "fat": 10.0, "sugar": 0.0},
    {"name": "tuna_tartare", "calories": 160.0, "protein": 21.0, "carbs": 2.0, "fat": 8.0, "sugar": 0.0},
    {"name": "waffles", "calories": 350.0, "protein": 6.0, "carbs": 50.0, "fat": 18.0, "sugar": 25.0},
    {"name": "waraa_enb", "calories": 120.0, "protein": 3.0, "carbs": 16.0, "fat": 6.0, "sugar": 0.0},
    {"name": "yougurt", "calories": 60.0, "protein": 3.5, "carbs": 5.0, "fat": 3.0, "sugar": 0.0},
    {"name": "zalbya", "calories": 400.0, "protein": 5.0, "carbs": 60.0, "fat": 20.0, "sugar": 36.0},
]

def main():
    print("🌱 Seeding food data to Qdrant...")
    
    # Connect to Qdrant
    client = QdrantClient(url=QDRANT_URL)
    
    # Create collection if not exists
    try:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_SIZE, distance=Distance.COSINE)
        )
        print(f"✅ Created collection: {COLLECTION_NAME}")
    except Exception as e:
        print(f"⚠️ Collection already exists: {e}")
    
    # Load embedding model
    print(f"📦 Loading embedding model: {EMBEDDING_MODEL}...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    
    # Prepare points
    points = []
    for food in FOODS_DATA:
        # Create descriptive text for embedding
        text = f"{food['name']}: {food['calories']} calories, {food['protein']}g protein, {food['carbs']}g carbs, {food['fat']}g fat"
        
        # Generate embedding
        vector = model.encode(text).tolist()
        
        # Create point
        points.append({
            "id": str(uuid.uuid4()),
            "vector": vector,
            "payload": {
                "name": food['name'],
                "text": text,
                "calories": food['calories'],
                "protein": food['protein'],
                "carbs": food['carbs'],
                "fat": food['fat'],
                "sugar": food.get('sugar', 0.0)
            }
        })
    
    # Upsert points to Qdrant
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    
    print(f"✅ Seeded {len(points)} food items to Qdrant")
    
    # Verify
    collection_info = client.get_collection(collection_name=COLLECTION_NAME)
    print(f"📊 Collection '{COLLECTION_NAME}' now has {collection_info.points_count} points")

if __name__ == "__main__":
    main()