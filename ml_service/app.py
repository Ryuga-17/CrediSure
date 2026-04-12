import mlflow.pyfunc
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import logging
import json

app = FastAPI()
logging.basicConfig(level=logging.INFO, format='%(message)s')

# Loads the model tagged as 'Production' from the model registry at startup
model_name = "CreditSure_PD_Model"
stage = "Production"

try:
    prod_model = mlflow.pyfunc.load_model(f"models:/{model_name}/{stage}")
    logging.info(f"Successfully loaded {model_name} stage {stage}")
except Exception as e:
    logging.error(f"Could not load model: {e}")
    prod_model = None

class LoanRequest(BaseModel):
    income: float
    loan_amount: float
    credit_length: float
    purpose: str

@app.post("/predict")
def predict(request: LoanRequest):
    if not prod_model:
        return {"error": "Model not loaded properly"}
        
    df = pd.DataFrame([request.dict()])
    
    # Query feature store logic here if resolving IDs, otherwise direct inference
    prediction = prod_model.predict(df)
    pd_score = float(prediction[0])
    
    # Complete Traceability JSON Log
    log_data = {
        "event": "inference_prediction",
        "model_version": f"{model_name}_{stage}",
        "input_features": request.dict(),
        "prediction_output": pd_score
    }
    logging.info(json.dumps(log_data))
    
    return {"probability_of_default": pd_score}
