# scripts/seed_workouts.py
"""
Seed workout data to Qdrant vector database
Run: python scripts/seed_workouts.py
"""
import uuid
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from qdrant_client.http.models import VectorParams, Distance

# Configuration
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "workouts"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_SIZE = 384

# Clean workout data (only what's needed for RAG)
WORKOUTS_DATA = [
    # Chest Exercises
    {"name": "Flat Barbell Bench Press", "body_part": "chest", "target": "Middle Chest", "level": "Intermediate", "equipment": "Barbell", "description": "Classic compound press that builds mass in the mid chest."},
    {"name": "Incline Barbell Bench Press", "body_part": "chest", "target": "Upper Chest", "level": "Intermediate", "equipment": "Barbell", "description": "Performed on a 30-45° bench to emphasize the upper fibers."},
    {"name": "Decline Barbell Bench Press", "body_part": "chest", "target": "Lower Chest", "level": "Intermediate", "equipment": "Barbell", "description": "Barbell press on a decline bench to hit the lower pectorals."},
    {"name": "Push-Up", "body_part": "chest", "target": "Middle Chest", "level": "Beginner", "equipment": "Bodyweight", "description": "Fundamental chest exercise with full range motion."},
    {"name": "Dumbbell Fly", "body_part": "chest", "target": "Inner Chest", "level": "Beginner", "equipment": "Dumbbell", "description": "Isolation move focusing on the chest contraction at the top."},
    {"name": "Chest Press Machine", "body_part": "chest", "target": "Middle Chest", "level": "Beginner", "equipment": "Machine", "description": "Safe version of bench press for controlled pressing."},
    {"name": "Dips", "body_part": "chest", "target": "Lower Chest", "level": "Intermediate", "equipment": "Bodyweight", "description": "Lean forward to target the lower chest fibers."},
    
    # Back Exercises
    {"name": "Barbell Bent-Over Row", "body_part": "back", "target": "Middle Back", "level": "Intermediate", "equipment": "Barbell", "description": "Classic back builder that targets the middle back and lats."},
    {"name": "Pull-Up", "body_part": "back", "target": "Lats", "level": "Intermediate", "equipment": "Bodyweight", "description": "Excellent compound movement for back width."},
    {"name": "Lat Pulldown", "body_part": "back", "target": "Lats", "level": "Beginner", "equipment": "Cable", "description": "Targets lats and upper back width."},
    {"name": "Seated Cable Row", "body_part": "back", "target": "Middle Back", "level": "Beginner", "equipment": "Cable", "description": "Controlled row for mid-back and rhomboid activation."},
    {"name": "Deadlift", "body_part": "back", "target": "Lower Back", "level": "Advanced", "equipment": "Barbell", "description": "Compound lift engaging the lower back, traps, and posterior chain."},
    {"name": "One-Arm Dumbbell Row", "body_part": "back", "target": "Lats", "level": "Intermediate", "equipment": "Dumbbell", "description": "Single-arm movement focusing on lats and mid-back thickness."},
    
    # Shoulder Exercises
    {"name": "Overhead Press", "body_part": "shoulder", "target": "Front Delts", "level": "Intermediate", "equipment": "Barbell", "description": "Classic compound press for overall shoulder development."},
    {"name": "Dumbbell Shoulder Press", "body_part": "shoulder", "target": "Front Delts", "level": "Intermediate", "equipment": "Dumbbell", "description": "Free-weight version of overhead press for balanced shoulder development."},
    {"name": "Lateral Raise", "body_part": "shoulder", "target": "Lateral Delts", "level": "Beginner", "equipment": "Dumbbell", "description": "Raises dumbbells to the sides to widen shoulder appearance."},
    {"name": "Front Raise", "body_part": "shoulder", "target": "Front Delts", "level": "Beginner", "equipment": "Dumbbell", "description": "Isolation movement for front shoulders."},
    {"name": "Face Pull", "body_part": "shoulder", "target": "Rear Delts", "level": "Intermediate", "equipment": "Cable", "description": "Strengthens rear delts, traps, and rotator cuff."},
    {"name": "Upright Row", "body_part": "shoulder", "target": "Lateral Delts", "level": "Intermediate", "equipment": "Barbell", "description": "Pull bar to chin level to target traps and side delts."},
    
    # Arm Exercises - Biceps
    {"name": "Barbell Curl", "body_part": "arms", "target": "Biceps", "level": "Beginner", "equipment": "Barbell", "description": "Classic curl focusing on the main biceps muscle."},
    {"name": "Dumbbell Curl", "body_part": "arms", "target": "Biceps", "level": "Beginner", "equipment": "Dumbbell", "description": "Fundamental exercise for overall biceps growth."},
    {"name": "Hammer Curl", "body_part": "arms", "target": "Biceps", "level": "Intermediate", "equipment": "Dumbbell", "description": "Neutral grip targets brachialis and forearms."},
    {"name": "Concentration Curl", "body_part": "arms", "target": "Biceps", "level": "Intermediate", "equipment": "Dumbbell", "description": "Isolates biceps for peak contraction."},
    {"name": "Preacher Curl", "body_part": "arms", "target": "Biceps", "level": "Beginner", "equipment": "Machine", "description": "Strict form machine for isolating biceps."},
    
    # Arm Exercises - Triceps
    {"name": "Close-Grip Bench Press", "body_part": "arms", "target": "Triceps", "level": "Intermediate", "equipment": "Barbell", "description": "Compound press that targets triceps while also involving chest and shoulders."},
    {"name": "Triceps Pushdown", "body_part": "arms", "target": "Triceps", "level": "Beginner", "equipment": "Cable", "description": "Most popular triceps exercise with constant tension."},
    {"name": "Skull Crusher", "body_part": "arms", "target": "Triceps", "level": "Intermediate", "equipment": "Barbell", "description": "Classic isolation movement that emphasizes triceps stretch."},
    {"name": "Overhead Triceps Extension", "body_part": "arms", "target": "Triceps", "level": "Beginner", "equipment": "Dumbbell", "description": "Stretches and contracts the long head of the triceps."},
    {"name": "Bench Dips", "body_part": "arms", "target": "Triceps", "level": "Beginner", "equipment": "Bodyweight", "description": "Easy bodyweight version for beginners to hit triceps."},
    
    # Leg Exercises
    {"name": "Barbell Back Squat", "body_part": "legs", "target": "Quadriceps", "level": "Intermediate", "equipment": "Barbell", "description": "Classic compound movement targeting quads and glutes."},
    {"name": "Leg Press", "body_part": "legs", "target": "Quadriceps", "level": "Beginner", "equipment": "Machine", "description": "Safe heavy leg builder with adjustable foot position."},
    {"name": "Leg Extension", "body_part": "legs", "target": "Quadriceps", "level": "Beginner", "equipment": "Machine", "description": "Isolation exercise for front thigh development."},
    {"name": "Romanian Deadlift", "body_part": "legs", "target": "Hamstrings", "level": "Intermediate", "equipment": "Barbell", "description": "Focuses on hamstring stretch and glute engagement."},
    {"name": "Lying Leg Curl", "body_part": "legs", "target": "Hamstrings", "level": "Beginner", "equipment": "Machine", "description": "Isolation exercise for hamstrings strength."},
    {"name": "Barbell Hip Thrust", "body_part": "legs", "target": "Glutes", "level": "Intermediate", "equipment": "Barbell", "description": "Top glute builder emphasizing contraction at the top."},
    {"name": "Goblet Squat", "body_part": "legs", "target": "Quadriceps", "level": "Beginner", "equipment": "Dumbbell", "description": "Great for beginners to learn squat form safely."},
    {"name": "Standing Calf Raise", "body_part": "legs", "target": "Calves", "level": "Beginner", "equipment": "Machine", "description": "Builds the gastrocnemius portion of the calves."},
    {"name": "Seated Calf Raise", "body_part": "legs", "target": "Calves", "level": "Beginner", "equipment": "Machine", "description": "Focuses on the soleus part of the calf muscle."},
    
    # Ab Exercises
    {"name": "Crunch", "body_part": "abs", "target": "Upper Abs", "level": "Beginner", "equipment": "Bodyweight", "description": "Classic ab exercise focusing on the upper section of the abs."},
    {"name": "Plank", "body_part": "abs", "target": "Core", "level": "Beginner", "equipment": "Bodyweight", "description": "Builds deep core stability and posture."},
    {"name": "Leg Raise", "body_part": "abs", "target": "Lower Abs", "level": "Intermediate", "equipment": "Bodyweight", "description": "Focuses on the lower abdominal region."},
    {"name": "Russian Twist", "body_part": "abs", "target": "Obliques", "level": "Intermediate", "equipment": "Bodyweight", "description": "Rotational move focusing on side abs."},
    {"name": "Cable Crunch", "body_part": "abs", "target": "Upper Abs", "level": "Intermediate", "equipment": "Cable", "description": "Adds resistance to upper ab movement for muscle growth."},
    {"name": "Hanging Knee Raise", "body_part": "abs", "target": "Lower Abs", "level": "Intermediate", "equipment": "Bodyweight", "description": "Builds strong lower abs and hip flexors."},
]

def main():
    print("🌱 Seeding workout data to Qdrant...")
    
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
    for workout in WORKOUTS_DATA:
        # Create descriptive text for embedding
        text = f"{workout['name']}: {workout['description']} Body part: {workout['body_part']}, Target: {workout['target']}. Level: {workout['level']}. Equipment: {workout['equipment']}."
        
        # Generate embedding
        vector = model.encode(text).tolist()
        
        # Create point with UUID (Qdrant handles ID)
        points.append({
            "id": str(uuid.uuid4()),  # Qdrant's unique ID
            "vector": vector,
            "payload": {
                "name": workout['name'],
                "body_part": workout['body_part'],
                "target": workout['target'],
                "level": workout['level'],
                "equipment": workout['equipment'],
                "description": workout['description']
            }
        })
    
    # Upsert points to Qdrant
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    
    print(f"✅ Seeded {len(points)} workout items to Qdrant")
    
    # Verify
    collection_info = client.get_collection(collection_name=COLLECTION_NAME)
    print(f"📊 Collection '{COLLECTION_NAME}' now has {collection_info.points_count} points")

if __name__ == "__main__":
    main()