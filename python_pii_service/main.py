#!/usr/bin/env python3
"""
Advanced PII Detection Service using multiple Python libraries
Supports Presidio, spaCy, and Transformers for comprehensive PII detection
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import spacy
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import time
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for models
nlp_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup"""
    logger.info("Loading PII detection models...")
    
    try:
        # Load spaCy model
        import spacy
        nlp_models['spacy'] = spacy.load("en_core_web_sm")
        logger.info("✓ spaCy model loaded")
    except Exception as e:
        logger.warning(f"Failed to load spaCy model: {e}")
    
    try:
        # Load Presidio
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine
        nlp_models['presidio_analyzer'] = AnalyzerEngine()
        nlp_models['presidio_anonymizer'] = AnonymizerEngine()
        logger.info("✓ Presidio models loaded")
    except Exception as e:
        logger.warning(f"Failed to load Presidio: {e}")
    
    try:
        # Load Transformers model
        from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
        model_name = "dbmdz/bert-large-cased-finetuned-conll03-english"
        nlp_models['transformers_tokenizer'] = AutoTokenizer.from_pretrained(model_name)
        nlp_models['transformers_model'] = AutoModelForTokenClassification.from_pretrained(model_name)
        nlp_models['transformers_pipeline'] = pipeline("ner", 
                                                      model=nlp_models['transformers_model'], 
                                                      tokenizer=nlp_models['transformers_tokenizer'],
                                                      aggregation_strategy="simple")
        logger.info("✓ Transformers model loaded")
    except Exception as e:
        logger.warning(f"Failed to load Transformers model: {e}")
    
    logger.info("PII detection service ready!")
    yield
    
    # Cleanup
    logger.info("Shutting down PII detection service...")

app = FastAPI(
    title="Advanced PII Detection Service",
    description="Multi-engine PII detection using Presidio, spaCy, and Transformers",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PIIDetectionConfig(BaseModel):
    engine: str = "presidio"
    confidence_threshold: float = 0.5
    entities: List[str] = []
    language: str = "en"

class AnalysisRequest(BaseModel):
    text: str
    config: Optional[PIIDetectionConfig] = None

class PIIFinding(BaseModel):
    entity_type: str
    start: int
    end: int
    score: float
    text: str
    analysis_explanation: Optional[Dict[str, Any]] = None

class PIIAnalysisResult(BaseModel):
    findings: List[PIIFinding]
    anonymized_text: str
    processing_engine: str

class BenchmarkRequest(BaseModel):
    text: str

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": {
            "spacy": "spacy" in nlp_models,
            "presidio": "presidio_analyzer" in nlp_models,
            "transformers": "transformers_pipeline" in nlp_models
        },
        "timestamp": time.time()
    }

@app.post("/analyze/presidio", response_model=PIIAnalysisResult)
async def analyze_with_presidio(request: AnalysisRequest):
    """Analyze text using Microsoft Presidio"""
    if 'presidio_analyzer' not in nlp_models:
        raise HTTPException(status_code=503, detail="Presidio not available")
    
    try:
        analyzer = nlp_models['presidio_analyzer']
        anonymizer = nlp_models['presidio_anonymizer']
        
        config = request.config or PIIDetectionConfig()
        
        # Default entities for Presidio
        entities = config.entities or [
            "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", 
            "SSN", "IBAN_CODE", "IP_ADDRESS", "DATE_TIME", "LOCATION",
            "MEDICAL_LICENSE", "US_DRIVER_LICENSE", "US_PASSPORT",
            "CRYPTO", "US_BANK_NUMBER", "AGE", "ORGANIZATION"
        ]
        
        # Analyze text
        results = analyzer.analyze(
            text=request.text,
            entities=entities,
            language=config.language,
            score_threshold=config.confidence_threshold
        )
        
        # Convert to our format
        findings = []
        for result in results:
            findings.append(PIIFinding(
                entity_type=result.entity_type,
                start=result.start,
                end=result.end,
                score=result.score,
                text=request.text[result.start:result.end],
                analysis_explanation={
                    "recognizer": result.recognition_metadata.get("recognizer_name", ""),
                    "pattern_name": result.recognition_metadata.get("pattern_name", ""),
                    "pattern": result.recognition_metadata.get("pattern", ""),
                    "original_score": result.score,
                    "score_context_improvement": result.recognition_metadata.get("score_context_improvement", 0),
                    "supportive_context_word": result.recognition_metadata.get("supportive_context_word", ""),
                    "validation_result": result.recognition_metadata.get("validation_result", None)
                }
            ))
        
        # Anonymize text
        anonymized_result = anonymizer.anonymize(
            text=request.text,
            analyzer_results=results
        )
        
        return PIIAnalysisResult(
            findings=findings,
            anonymized_text=anonymized_result.text,
            processing_engine="presidio"
        )
        
    except Exception as e:
        logger.error(f"Presidio analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Presidio analysis failed: {str(e)}")

@app.post("/analyze/spacy", response_model=PIIAnalysisResult)
async def analyze_with_spacy(request: AnalysisRequest):
    """Analyze text using spaCy NER"""
    if 'spacy' not in nlp_models:
        raise HTTPException(status_code=503, detail="spaCy not available")
    
    try:
        nlp = nlp_models['spacy']
        config = request.config or PIIDetectionConfig()
        
        # Process text
        doc = nlp(request.text)
        
        # Extract entities
        findings = []
        for ent in doc.ents:
            if ent.label_ in (config.entities or ["PERSON", "ORG", "GPE", "DATE", "TIME", "MONEY", "CARDINAL"]):
                # Calculate confidence (spaCy doesn't provide confidence scores directly)
                confidence = 0.8 if ent.label_ in ["PERSON", "ORG"] else 0.7
                
                if confidence >= config.confidence_threshold:
                    findings.append(PIIFinding(
                        entity_type=ent.label_,
                        start=ent.start_char,
                        end=ent.end_char,
                        score=confidence,
                        text=ent.text,
                        analysis_explanation={
                            "recognizer": "spacy_ner",
                            "entity_label": ent.label_,
                            "entity_description": spacy.explain(ent.label_) if hasattr(spacy, 'explain') else ""
                        }
                    ))
        
        # Simple anonymization
        anonymized_text = request.text
        for finding in sorted(findings, key=lambda x: x.start, reverse=True):
            replacement = f"[{finding.entity_type}]"
            anonymized_text = anonymized_text[:finding.start] + replacement + anonymized_text[finding.end:]
        
        return PIIAnalysisResult(
            findings=findings,
            anonymized_text=anonymized_text,
            processing_engine="spacy"
        )
        
    except Exception as e:
        logger.error(f"spaCy analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"spaCy analysis failed: {str(e)}")

@app.post("/analyze/transformers", response_model=PIIAnalysisResult)
async def analyze_with_transformers(request: AnalysisRequest):
    """Analyze text using Transformers NER"""
    if 'transformers_pipeline' not in nlp_models:
        raise HTTPException(status_code=503, detail="Transformers not available")
    
    try:
        pipeline = nlp_models['transformers_pipeline']
        config = request.config or PIIDetectionConfig()
        
        # Process text
        results = pipeline(request.text)
        
        # Convert to our format
        findings = []
        for result in results:
            if result['score'] >= config.confidence_threshold:
                findings.append(PIIFinding(
                    entity_type=result['entity_group'],
                    start=result['start'],
                    end=result['end'],
                    score=result['score'],
                    text=result['word'],
                    analysis_explanation={
                        "recognizer": "transformers_bert",
                        "model": "dbmdz/bert-large-cased-finetuned-conll03-english",
                        "entity_group": result['entity_group'],
                        "original_score": result['score']
                    }
                ))
        
        # Simple anonymization
        anonymized_text = request.text
        for finding in sorted(findings, key=lambda x: x.start, reverse=True):
            replacement = f"[{finding.entity_type}]"
            anonymized_text = anonymized_text[:finding.start] + replacement + anonymized_text[finding.end:]
        
        return PIIAnalysisResult(
            findings=findings,
            anonymized_text=anonymized_text,
            processing_engine="transformers"
        )
        
    except Exception as e:
        logger.error(f"Transformers analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transformers analysis failed: {str(e)}")

@app.post("/analyze/hybrid", response_model=PIIAnalysisResult)
async def analyze_hybrid(request: AnalysisRequest):
    """Hybrid analysis using multiple engines and consolidating results"""
    try:
        all_findings = []
        engines_used = []
        
        # Run Presidio if available
        if 'presidio_analyzer' in nlp_models:
            try:
                presidio_result = await analyze_with_presidio(request)
                all_findings.extend(presidio_result.findings)
                engines_used.append("presidio")
            except Exception as e:
                logger.warning(f"Presidio failed in hybrid mode: {e}")
        
        # Run spaCy if available
        if 'spacy' in nlp_models:
            try:
                spacy_result = await analyze_with_spacy(request)
                all_findings.extend(spacy_result.findings)
                engines_used.append("spacy")
            except Exception as e:
                logger.warning(f"spaCy failed in hybrid mode: {e}")
        
        # Run Transformers if available
        if 'transformers_pipeline' in nlp_models:
            try:
                transformers_result = await analyze_with_transformers(request)
                all_findings.extend(transformers_result.findings)
                engines_used.append("transformers")
            except Exception as e:
                logger.warning(f"Transformers failed in hybrid mode: {e}")
        
        # Consolidate overlapping findings
        consolidated_findings = consolidate_findings(all_findings)
        
        # Create anonymized text
        anonymized_text = request.text
        for finding in sorted(consolidated_findings, key=lambda x: x.start, reverse=True):
            replacement = f"[{finding.entity_type}]"
            anonymized_text = anonymized_text[:finding.start] + replacement + anonymized_text[finding.end:]
        
        return PIIAnalysisResult(
            findings=consolidated_findings,
            anonymized_text=anonymized_text,
            processing_engine="hybrid"
        )
        
    except Exception as e:
        logger.error(f"Hybrid analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Hybrid analysis failed: {str(e)}")

def consolidate_findings(findings: List[PIIFinding]) -> List[PIIFinding]:
    """Consolidate overlapping findings from multiple engines"""
    if not findings:
        return []
    
    # Sort by start position
    sorted_findings = sorted(findings, key=lambda x: x.start)
    consolidated = []
    
    for finding in sorted_findings:
        # Check for overlap with existing findings
        overlapping = None
        for existing in consolidated:
            if (finding.start <= existing.end and finding.end >= existing.start):
                overlapping = existing
                break
        
        if overlapping:
            # Merge findings - keep the one with higher confidence
            if finding.score > overlapping.score:
                consolidated.remove(overlapping)
                consolidated.append(finding)
        else:
            consolidated.append(finding)
    
    return consolidated

@app.post("/benchmark")
async def benchmark_engines(request: BenchmarkRequest):
    """Benchmark all available engines"""
    results = {}
    performance = {}
    
    # Benchmark Presidio
    if 'presidio_analyzer' in nlp_models:
        start_time = time.time()
        try:
            results['presidio'] = await analyze_with_presidio(AnalysisRequest(text=request.text))
            performance['presidio_time'] = time.time() - start_time
        except Exception as e:
            logger.error(f"Presidio benchmark failed: {e}")
            performance['presidio_time'] = -1
    
    # Benchmark spaCy
    if 'spacy' in nlp_models:
        start_time = time.time()
        try:
            results['spacy'] = await analyze_with_spacy(AnalysisRequest(text=request.text))
            performance['spacy_time'] = time.time() - start_time
        except Exception as e:
            logger.error(f"spaCy benchmark failed: {e}")
            performance['spacy_time'] = -1
    
    # Benchmark Transformers
    if 'transformers_pipeline' in nlp_models:
        start_time = time.time()
        try:
            results['transformers'] = await analyze_with_transformers(AnalysisRequest(text=request.text))
            performance['transformers_time'] = time.time() - start_time
        except Exception as e:
            logger.error(f"Transformers benchmark failed: {e}")
            performance['transformers_time'] = -1
    
    # Add accuracy comparison
    performance['accuracy_comparison'] = {
        'presidio_findings': len(results.get('presidio', {}).get('findings', [])),
        'spacy_findings': len(results.get('spacy', {}).get('findings', [])),
        'transformers_findings': len(results.get('transformers', {}).get('findings', []))
    }
    
    return {
        **results,
        'performance': performance
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)