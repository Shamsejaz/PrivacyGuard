# setup.ps1
Write-Host "Setting up Python PII Detection Service..."

# Create virtual environment
python -m venv venv

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Run Python script to download and verify models
python - <<EOF
import spacy
from transformers import AutoTokenizer, AutoModelForTokenClassification

# Verify spaCy model
try:
    nlp = spacy.load('en_core_web_sm')
    print('✓ spaCy model loaded successfully')
except Exception as e:
    print(f'✗ spaCy model failed: {e}')

# Download and cache transformers model
try:
    model_name = 'dbmdz/bert-large-cased-finetuned-conll03-english'
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForTokenClassification.from_pretrained(model_name)
    print('✓ Transformers model downloaded and cached')
except Exception as e:
    print(f'✗ Transformers model failed: {e}')

print('Setup complete!')
EOF

from fastapi import FastAPI, File, UploadFile
import face_recognition
from typing import Dict

app = FastAPI()

@app.post("/analyze/image-pii")
async def analyze_image_pii(file: UploadFile = File(...)) -> Dict:
    contents = await file.read()
    # Convert bytes to numpy array for face_recognition
    import numpy as np
    import cv2
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_img)
    return {
        "contains_pii": len(face_locations) > 0,
        "num_faces": len(face_locations)
    }

Write-Host "`nPython PII Detection Service setup complete!"
Write-Host "To start the service, run: python main.py"
Write-Host "The service will be available at: http://localhost:8000"
Write-Host "API documentation will be available at: http://localhost:8000/docs"
