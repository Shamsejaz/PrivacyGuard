# Python PII Detection Service

Advanced PII detection service using multiple Python libraries for maximum accuracy.

## Features

- **Multiple Detection Engines**:
  - **Presidio**: Microsoft's enterprise-grade PII detection
  - **spaCy**: Fast and accurate NLP with named entity recognition
  - **Transformers**: BERT-based models for context-aware detection
  - **Hybrid Mode**: Combines all engines for best results

- **Comprehensive PII Types**:
  - Person names, email addresses, phone numbers
  - Social Security Numbers, credit card numbers
  - Medical records, driver's licenses, passports
  - IP addresses, locations, organizations
  - Custom entity types and patterns

- **Advanced Features**:
  - Confidence scoring and thresholds
  - Detailed analysis explanations
  - Text anonymization/redaction
  - Performance benchmarking
  - Multi-language support

## Quick Start

1. **Setup the service**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Start the service**:
   ```bash
   source venv/bin/activate
   python main.py
   ```

3. **Access the API**:
   - Service: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

## API Endpoints

### Health Check
```bash
GET /health
```

### Presidio Analysis
```bash
POST /analyze/presidio
{
  "text": "John Doe's email is john.doe@email.com",
  "config": {
    "confidence_threshold": 0.5,
    "entities": ["PERSON", "EMAIL_ADDRESS"]
  }
}
```

### spaCy Analysis
```bash
POST /analyze/spacy
{
  "text": "Apple Inc. is located in Cupertino, California",
  "config": {
    "confidence_threshold": 0.7,
    "entities": ["PERSON", "ORG", "GPE"]
  }
}
```

### Transformers Analysis
```bash
POST /analyze/transformers
{
  "text": "Barack Obama was the 44th President",
  "config": {
    "confidence_threshold": 0.8
  }
}
```

### Hybrid Analysis (Recommended)
```bash
POST /analyze/hybrid
{
  "text": "Contact Sarah Johnson at sarah.j@company.com or call 555-123-4567"
}
```

### Benchmark All Engines
```bash
POST /benchmark
{
  "text": "Test text with PII data"
}
```

## Integration with Frontend

The frontend automatically detects and uses this service when available. Set the environment variable:

```bash
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000
```

## Supported Entity Types

### Presidio
- PERSON, EMAIL_ADDRESS, PHONE_NUMBER
- CREDIT_CARD, SSN, IBAN_CODE
- IP_ADDRESS, DATE_TIME, LOCATION
- MEDICAL_LICENSE, US_DRIVER_LICENSE
- US_PASSPORT, CRYPTO, US_BANK_NUMBER

### spaCy
- PERSON, ORG, GPE (locations)
- DATE, TIME, MONEY, CARDINAL
- NORP (nationalities), FAC (facilities)
- EVENT, WORK_OF_ART, LAW, LANGUAGE

### Transformers (BERT NER)
- PER (Person), ORG (Organization)
- LOC (Location), MISC (Miscellaneous)

## Performance

- **Presidio**: Highest accuracy, moderate speed
- **spaCy**: Fast processing, good accuracy
- **Transformers**: Best context understanding, slower
- **Hybrid**: Best overall results, combines all engines

## Requirements

- Python 3.8+
- 4GB+ RAM (for Transformers models)
- Internet connection (for initial model downloads)

## Troubleshooting

1. **Model download issues**: Ensure stable internet connection
2. **Memory errors**: Increase available RAM or disable Transformers
3. **Port conflicts**: Change port in main.py if 8000 is occupied
4. **Permission errors**: Ensure proper file permissions for setup.sh

## Production Deployment

For production use:
1. Use a proper WSGI server (gunicorn)
2. Set up proper logging and monitoring
3. Configure rate limiting and authentication
4. Use environment variables for configuration
5. Set up health checks and auto-restart