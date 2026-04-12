import requests
from sentence_transformers import SentenceTransformer

print("Loading model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

workouts = [
    {"id": 1, "name": "Beginner Full Body", "text": "Beginner full body workout: squats 3x12, pushups 3x8, plank 30 sec, lunges 3x10"},
    {"id": 2, "name": "Beginner Upper Body", "text": "Beginner upper body workout: incline pushups 3x10, dumbbell rows 3x12, shoulder taps 3x10"},
    {"id": 3, "name": "Beginner Lower Body", "text": "Beginner lower body workout: air squats 3x15, walking lunges 3x10, glute bridges 3x20"},
]

print("Adding workouts to Qdrant...")
for w in workouts:
    vec = model.encode(w["text"]).tolist()
    r = requests.put("http://localhost:6333/collections/workouts/points", 
                     json={"points": [{"id": w["id"], "vector": vec, "payload": {"text": w["text"], "name": w["name"]}}]})
    print(f"  Added {w['name']}: {r.status_code}")

# Verify
count = requests.post("http://localhost:6333/collections/workouts/points/count", json={})
print(f"Total workouts in Qdrant: {count.json()['result']['count']}")