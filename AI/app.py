import streamlit as st
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
import json
from PIL import Image
import io # Needed for camera input

# --- CONFIGURATION ---
st.set_page_config(
    page_title="Food Lens AI",
    page_icon="🍲",
    layout="centered",
    initial_sidebar_state="expanded"
)

# --- Constants ---
IMG_SIZE = 224
NUM_CLASSES = 100
MODEL_WEIGHTS_PATH = "best_model_food100.keras" # Make sure this matches your file name
CLASS_NAMES_PATH = "class_names.json"

# --- Custom CSS (Keep as before) ---
st.markdown("""
<style>
    /* ... (Your existing CSS rules) ... */
    .main-title { text-align: center; color: #4CAF50; font-weight: bold; margin-bottom: 20px; }
    .prediction-text { font-size: 1.5em; font-weight: bold; text-align: center; color: #1E88E5; }
    .confidence-text { font-size: 1.1em; text-align: center; color: #555; }
    .result-box { border: 1px solid #ddd; border-radius: 10px; padding: 20px; margin-top: 20px; background-color: #f9f9f9; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stImage > img { margin: auto; border-radius: 10px; }
</style>
""", unsafe_allow_html=True)


# --- MODEL BUILDING & WEIGHTS LOADING (Corrected Again) ---
@st.cache_resource
def build_and_load_model():
    """Builds the EfficientNetB0 model structure and loads the trained weights."""
    try:
        # --- FIX: Use the EXACT layers from Kaggle ---
        # 1. Build the Data Augmentation Layer
        data_augmentation = keras.Sequential([
            layers.RandomFlip("horizontal"), # No seed needed for inference
            layers.RandomRotation(0.2),
            layers.RandomZoom(0.2),
            layers.RandomContrast(0.2) # Use same layers as training
        ], name="data_augmentation")

        # --- FIX: Use the EXACT initialization from Kaggle ---
        # 2. Build the Base Model (EfficientNetB0)
        base_model = tf.keras.applications.EfficientNetB0(
            include_top=False,
            weights=None, # Crucial: Don't load imagenet weights
            input_shape=(IMG_SIZE, IMG_SIZE, 3) # Define input shape
        )
        base_model.trainable = False # Keep it frozen for inference

        # 3. Build the Full Model Structure (Must match Kaggle EXACTLY)
        inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3), name="input_layer")
        # --- Apply augmentation layer ---
        x = data_augmentation(inputs)
        # Pass through base model
        x = base_model(x, training=False)
        x = layers.GlobalAveragePooling2D(name="pooling_layer")(x)
        x = layers.Dropout(0.3, name="dropout_layer")(x) # Use same dropout rate
        outputs = layers.Dense(NUM_CLASSES, activation="softmax", name="output_layer")(x)
        model = keras.Model(inputs, outputs, name="EfficientNetB0_Food100") # Model name

        # 4. Load the Trained Weights
        model.load_weights(MODEL_WEIGHTS_PATH)
        # st.success("Model loaded successfully!") # Optional success message
        return model

    except FileNotFoundError:
        st.error(f"Model weights file ('{MODEL_WEIGHTS_PATH}') not found.")
        return None
    except ValueError as ve:
         st.error(f"Error loading weights - Structure mismatch? {ve}")
         return None
    except Exception as e:
        st.error(f"An unexpected error occurred building/loading model: {e}")
        return None


@st.cache_data
def load_my_class_names():
    # ... (Your existing class names loading code - seems correct) ...
    try:
        with open(CLASS_NAMES_PATH, 'r') as f:
            class_names = json.load(f)
        if len(class_names) != NUM_CLASSES:
             st.warning(f"Class names count mismatch.")
        return class_names
    except FileNotFoundError:
        st.error(f"Class names file ('{CLASS_NAMES_PATH}') not found.")
        return None
    except Exception as e:
        st.error(f"Error loading class names: {e}")
        return None

# Load resources
model = build_and_load_model()
class_names = load_my_class_names()

# --- HELPER FUNCTION (process_image - Keep as before) ---
def process_image(image_input, img_shape=IMG_SIZE):
    # ... (Your existing image processing code - seems correct) ...
    try:
        if isinstance(image_input, bytes):
            image_pil = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
             image_pil = image_input
        else: return None
        if image_pil.mode != "RGB": image_pil = image_pil.convert("RGB")
        img = image_pil.resize((img_shape, img_shape))
        img_array = np.array(img)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        st.error(f"Error processing image: {e}")
        return None

# --- Initialize Session State ---
if 'show_camera' not in st.session_state:
    st.session_state.show_camera = False

# --- STREAMLIT APP LAYOUT ---
st.markdown("<h1 class='main-title'>🍲 Food Lens AI 📸</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center;'>Identify food items from images using AI.</p>", unsafe_allow_html=True)

# Sidebar (Make sure content is filled in)
st.sidebar.title("About Food Lens AI")
st.sidebar.image("https://placehold.co/300x100/4CAF50/FFFFFF?text=App+Logo", use_column_width=True) # Placeholder Logo
st.sidebar.info(
    "This app uses an **EfficientNetB0** model trained on **100 food classes** "
    "(including common dishes and Arabic cuisine) to predict the food item in your image."
    "\n\nUpload an image or use your camera!"
    "\n\n**Note:** This model identifies the food type, not calorie count directly."
    "\n\n**Developed by:** Mazen Ashraf (AI/ML Engineer)"
)
st.sidebar.markdown("---")
st.sidebar.header("How it Works")
st.sidebar.markdown(
    "1.  **Input:** Upload or capture an image.\n"
    "2.  **Processing:** Image is resized and prepared.\n"
    "3.  **Prediction:** The AI model analyzes the image.\n"
    "4.  **Output:** The predicted food name and confidence score are shown."
)


st.divider()

# --- Input Options ---
col1_input, col2_input = st.columns(2)

with col1_input:
    uploaded_file = st.file_uploader(
        "📂 Upload an Image",
        type=["jpg", "jpeg", "png", "webp"],
        help="Select a food image file from your device."
    )
    if uploaded_file is not None:
        st.session_state.show_camera = False # Hide camera if file is uploaded

with col2_input:
    if st.button("📷 Open Camera"):
        st.session_state.show_camera = True
        # uploaded_file = None # Attempt to clear uploader state (might not work perfectly)

    camera_photo = None
    if st.session_state.show_camera:
        camera_photo = st.camera_input(
            "Capture Photo (Click below)",
            key="camera",
            help="Use your device's camera to capture a food image."
            )
        if camera_photo:
             st.session_state.show_camera = False

st.divider()

# Determine input source
image_source_data = None
image_display = None

if uploaded_file is not None:
    try:
        image_display = Image.open(uploaded_file)
        image_source_data = image_display # Pass PIL
    except Exception as e:
        st.error(f"Error opening uploaded file: {e}")
elif camera_photo is not None:
    try:
        img_bytes = camera_photo.getvalue()
        image_display = Image.open(io.BytesIO(img_bytes)) # PIL for display
        image_source_data = img_bytes # Pass bytes for processing
    except Exception as e:
        st.error(f"Error opening camera photo: {e}")

# --- Main Logic & Display Area ---
if model is None or class_names is None:
    st.warning("Model or class names failed to load. Cannot proceed.")
elif image_source_data is not None:
    if image_display:
         st.image(image_display, caption="Selected Image", use_column_width=True)
    else:
         st.warning("Could not display the selected image.")

    with st.container():
        st.markdown("<div class='result-box'>", unsafe_allow_html=True)
        st.subheader("🧠 AI Prediction:")

        with st.spinner("🔍 Analyzing image..."):
            processed_img = process_image(image_source_data, img_shape=IMG_SIZE) # Pass PIL or bytes

            if processed_img is not None:
                try:
                    prediction = model.predict(processed_img)
                    index = np.argmax(prediction[0])
                    confidence = np.max(prediction[0]) * 100

                    if 0 <= index < len(class_names):
                        food_name = class_names[index]
                        st.markdown(f"<p class='prediction-text'>{food_name.replace('_', ' ').title()}</p>", unsafe_allow_html=True)
                        st.markdown(f"<p class='confidence-text'>Confidence: {confidence:.2f}%</p>", unsafe_allow_html=True)
                        st.progress(int(confidence))
                        st.caption("Note: Confidence indicates how sure the model is.")
                    else:
                        st.error(f"Prediction index {index} out of range.")
                except Exception as e:
                    st.error(f"Prediction error: {e}")
            else:
                st.error("Image processing failed.")

        st.markdown("</div>", unsafe_allow_html=True)
else:
    st.info("👆 Please upload an image or click 'Open Camera' to get started!")

# Footer
st.markdown("---")
st.caption("Food Lens AI © 2025")

