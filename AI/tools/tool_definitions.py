# tools/tool_definitions.py 
 
""" 
ICoach AI - Tool Definitions (Sprint 2A) 
This file contains the "contracts" (JSON Schemas) for the tools. 
They are sent to the model so it knows its capabilities and how to call them. 
""" 
 
ICoach_Tools = [ 
    # 1. Food nutrition search tool 
    { 
        "type": "function", 
        "function": { 
            "name": "search_food_nutrition", 
            "description": "Use this tool ONLY when the user asks about food calories, macros (protein, carbs, fat), or nutrition facts for a specific food item.", 
            "parameters": { 
                "type": "object", 
                "properties": { 
                    "food_name": { 
                        "type": "string", 
                        "description": "The exact or partial name of the food item. YOU MUST TRANSLATE IT TO ENGLISH BEFORE SEARCHING. (e.g., if user says 'موز', send 'banana')." 
                    } 
                }, 
                "required": ["food_name"] 
            } 
        } 
    }, 
     
    # 2. Workout search tool 
    { 
        "type": "function", 
        "function": { 
            "name": "search_workouts", 
            "description": "Use this tool when the user asks for exercises, workout routines, or alternative exercises based on target muscle, difficulty, or equipment.", 
            "parameters": { 
                "type": "object", 
                "properties": { 
                    "target_muscle": { 
                        "type": "string", 
                        "description": "The main muscle group targeted. YOU MUST TRANSLATE IT TO ENGLISH BEFORE SEARCHING. (e.g., if user says 'صدر' or 'بنج', send 'chest'). Leave empty if not specified." 
                    }, 
                    "difficulty_level": { 
                        "type": "string", 
                        "enum": ["beginner", "intermediate", "advanced"], 
                        "description": "The difficulty level of the exercise." 
                    }, 
                    "equipment": { 
                        "type": "string", 
                        "description": "The equipment needed (e.g., 'dumbbell', 'bodyweight'). TRANSLATE TO ENGLISH IF NEEDED." 
                    } 
                }, 
                "required": [] # All parameters are optional in case the user asks a general question 
            } 
        } 
    }, 
 
    # 3. Medical record update tool (logging injuries) 
    { 
        "type": "function", 
        "function": { 
            "name": "update_medical_record", 
            "description": "CRITICAL: Use this tool whenever the user mentions an injury, physical pain, illness, or medical condition that affects their ability to workout or eat.", 
            "parameters": { 
                "type": "object", 
                "properties": { 
                    "issue": { 
                        "type": "string", 
                        "description": "A short description of the medical issue. TRANSLATE TO ENGLISH (e.g., 'shoulder_pain', 'knee_injury')." 
                    }, 
                    "body_part": { 
                        "type": "string", 
                        "description": "The specific body part affected, normalized in English (e.g., 'shoulder', 'knee', 'lower_back'). Use 'general' for allergies or systemic issues." 
                    }, 
                    "status": { 
                        "type": "string", 
                        "enum": ["active", "resolved"], 
                        "description": "Set to 'active' if the user is currently suffering from it, or 'resolved' if they say they are healed." 
                    } 
                }, 
                "required": ["issue", "body_part", "status"] 
            } 
        } 
    }, 
 
    # 4. Knowledge base search tool (Qdrant - Fallback) 
    { 
        "type": "function", 
        "function": { 
            "name": "search_knowledge_base", 
            "description": "Use this tool ONLY as a fallback when the user asks semantic, scientific, or general knowledge questions about fitness/nutrition that cannot be answered by structured SQL tools.", 
            "parameters": { 
                "type": "object", 
                "properties": { 
                    "query": { 
                        "type": "string", 
                        "description": "The semantic search query in the user's language." 
                    } 
                }, 
                "required": ["query"] 
            } 
        } 
    } 
]