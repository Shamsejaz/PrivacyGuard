#!/bin/bash

# Setup script for Python PII Detection Service

echo "Setting up Python PII Detection Service..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Download additional models for better accuracy
python -c "
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
"

echo "Python PII Detection Service setup complete!"
echo "To start the service, run: python main.py"
echo "The service will be available at: http://localhost:8000"
echo "API documentation will be available at: http://localhost:8000/docs"