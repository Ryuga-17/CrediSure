#!/usr/bin/env python3
"""
ML Prediction Service
Handles credit score and default predictions using trained models
"""

import sys
import json
import pickle
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import Normalizer
import lightgbm as lgb
import torch
import torch.nn as nn
import shap

# Get the project root directory (parent of Backend)
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
project_root = os.path.dirname(backend_dir)

# Model paths
CREDIT_SCORE_MODEL_PATH = os.path.join(project_root, 'creditscore_model.pkl')
DEFAULT_MODEL_PATH = os.path.join(project_root, 'default_model.pkl')
PREPROCESSING_PATH = os.path.join(project_root, 'ml_artifacts', 'preprocessing_v1.json')

# Version metadata for traceability
CREDIT_SCORE_MODEL_VERSION = "creditscore_model.pkl@v1"
DEFAULT_MODEL_VERSION = "default_model.pkl@v1"

# PyTorch Neural Network Model Class (must match training)
class CreditRiskNN(nn.Module):
    def __init__(self, input_size):
        super(CreditRiskNN, self).__init__()
        self.fc1 = nn.Linear(input_size, 64)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.sigmoid(self.fc3(x))
        return x

# Global model instances
credit_score_model = None
default_model = None
preprocessing_artifacts = None
shap_explainer = None

# Request/response schema keys (lightweight validation)
REQUIRED_REQUEST_KEYS = {"action", "data"}
REQUIRED_DATA_KEYS = {
    "age",
    "income",
    "loanAmount",
    "loanRate",
    "loanTerm",
    "existingDebtPayment",
    "loanPurpose",
    "hasMortgage",
    "hasDependents"
}

# Feature order for default model (must align with training)
DEFAULT_FEATURE_ORDER = [
    "Age",
    "Income",
    "LoanAmount",
    "CreditScore",
    "InterestRate",
    "LoanTerm",
    "DTIRatio",
    "LoanPurpose",
    "HasMortgage",
    "HasDependents"
]

def load_credit_score_model():
    """Load the LightGBM credit score model"""
    global credit_score_model
    if credit_score_model is None:
        credit_score_model = lgb.Booster(model_file=CREDIT_SCORE_MODEL_PATH)
    return credit_score_model

def load_default_model():
    """Load the PyTorch default prediction model"""
    global default_model
    if default_model is None:
        device = torch.device('cpu')
        input_size = 10  # Must match DEFAULT_FEATURE_ORDER
        
        try:
            # Try loading with torch.load (handles both state dicts and full models)
            loaded_data = torch.load(DEFAULT_MODEL_PATH, map_location=device)
            
            if isinstance(loaded_data, dict) and 'fc1.weight' in loaded_data or 'fc1.bias' in loaded_data:
                # It's a state dict
                default_model = CreditRiskNN(input_size)
                default_model.load_state_dict(loaded_data)
                default_model.eval()
            elif isinstance(loaded_data, nn.Module):
                # It's the full model
                default_model = loaded_data
                default_model.eval()
            else:
                # Try loading as pickle
                raise ValueError("Unexpected model format, trying pickle...")
                
        except Exception as e:
            # Try loading as pickle (if saved with pickle module)
            try:
                with open(DEFAULT_MODEL_PATH, 'rb') as f:
                    loaded_data = pickle.load(f)
                
                if isinstance(loaded_data, dict) and ('fc1.weight' in loaded_data or 'fc1.bias' in loaded_data):
                    # It's a state dict from pickle
                    default_model = CreditRiskNN(input_size)
                    default_model.load_state_dict(loaded_data)
                    default_model.eval()
                elif isinstance(loaded_data, nn.Module) or hasattr(loaded_data, 'forward'):
                    # It's the full model from pickle
                    default_model = loaded_data
                    if hasattr(default_model, 'eval'):
                        default_model.eval()
                else:
                    raise ValueError(f"Unknown model format in pickle file: {type(loaded_data)}")
            except Exception as e2:
                raise Exception(f"Failed to load default model. torch.load error: {str(e)}. pickle error: {str(e2)}")
    
    return default_model

def load_preprocessing_artifacts():
    """Load preprocessing artifacts from disk with versioning."""
    global preprocessing_artifacts
    if preprocessing_artifacts is None:
        if not os.path.exists(PREPROCESSING_PATH):
            raise FileNotFoundError(f"Preprocessing artifacts not found: {PREPROCESSING_PATH}")
        with open(PREPROCESSING_PATH, "r") as f:
            preprocessing_artifacts = json.load(f)
    return preprocessing_artifacts

def map_loan_purpose(purpose, model_key="default_pd"):
    """Map loan purpose string to numeric value using versioned artifacts."""
    artifacts = load_preprocessing_artifacts()
    mapping = artifacts[model_key]["categorical_mapping"]["loanPurpose"]
    if purpose is None:
        return mapping.get("Other", 3)
    return mapping.get(str(purpose), mapping.get("Other", 3))

def safe_float(value, default_value):
    try:
        if value is None or value == "":
            return float(default_value)
        return float(value)
    except (TypeError, ValueError):
        return float(default_value)

def safe_bool(value, default_value=False):
    if value is None:
        return bool(default_value)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ["true", "1", "yes", "y"]
    return bool(value)

def calculate_dti(existing_debt, income):
    if income <= 0:
        return 0.0
    return (existing_debt / income) * 100

def normalize_credit_score(raw_score):
    """
    Normalize credit score to the 300–850 scale for business readability.
    Handles models that output 0–1, 0–100, or already-scaled scores.
    """
    score = raw_score
    if 0 <= score <= 1:
        score = 300 + (score * 550)
    elif 0 <= score <= 100:
        score = 300 + (score / 100.0 * 550)
    score = max(300.0, min(850.0, score))
    return float(score)

def scale_features(values, means, stds):
    scaled = []
    for value, mean, std in zip(values, means, stds):
        safe_std = std if std and std > 0 else 1.0
        scaled.append((value - mean) / safe_std)
    return scaled

def get_shap_explainer():
    """Create a SHAP explainer once and reuse it for all requests."""
    global shap_explainer
    if shap_explainer is None:
        artifacts = load_preprocessing_artifacts()
        background = np.array(artifacts["background"]["default_pd"]["samples"], dtype=np.float32)
        model = load_default_model()

        def model_predict(input_array):
            tensor = torch.tensor(input_array, dtype=torch.float32)
            with torch.no_grad():
                return model(tensor).numpy()

        shap_explainer = shap.Explainer(model_predict, background)
    return shap_explainer

def build_default_feature_row(data, credit_score):
    artifacts = load_preprocessing_artifacts()
    impute = artifacts["default_pd"]["numerical_impute"]
    scaler = artifacts["default_pd"]["scaler"]
    feature_order = artifacts["default_pd"].get("feature_order", DEFAULT_FEATURE_ORDER)

    income = safe_float(data.get("income"), impute["income"])
    existing_debt = safe_float(data.get("existingDebtPayment"), impute["existingDebtPayment"])
    dti_ratio = calculate_dti(existing_debt, income)

    raw_row = {
        "Age": safe_float(data.get("age"), impute["age"]),
        "Income": income,
        "LoanAmount": safe_float(data.get("loanAmount"), impute["loanAmount"]),
        "CreditScore": safe_float(credit_score, impute["creditScore"]),
        "InterestRate": safe_float(data.get("loanRate"), impute["loanRate"]),
        "LoanTerm": safe_float(data.get("loanTerm"), impute["loanTerm"]),
        "DTIRatio": dti_ratio,
        "LoanPurpose": map_loan_purpose(data.get("loanPurpose"), "default_pd"),
        "HasMortgage": 1 if safe_bool(data.get("hasMortgage"), False) else 0,
        "HasDependents": 1 if safe_bool(data.get("hasDependents"), False) else 0
    }

    numeric_features = [
        "Age",
        "Income",
        "LoanAmount",
        "CreditScore",
        "InterestRate",
        "LoanTerm",
        "DTIRatio"
    ]
    means = [scaler["mean"][key] for key in numeric_features]
    stds = [scaler["std"][key] for key in numeric_features]
    scaled_values = scale_features([raw_row[key] for key in numeric_features], means, stds)

    scaled_row = dict(raw_row)
    for key, value in zip(numeric_features, scaled_values):
        scaled_row[key] = value

    return [scaled_row[key] for key in feature_order], raw_row

def predict_credit_score(data):
    """
    Predict credit score using LightGBM model
    
    Input data structure:
    {
        'loanAmount': float,
        'income': float,
        'loanRate': float,
        'existingDebtPayment': float,
        'age': float,
        'loanPurpose': string,
        'hasMortgage': boolean,
        'hasDependents': boolean
    }
    """
    try:
        artifacts = load_preprocessing_artifacts()
        impute = artifacts["credit_score"]["numerical_impute"]

        # Calculate DTIRatio
        income = safe_float(data.get('income'), impute["income"])
        existing_debt = safe_float(data.get('existingDebtPayment'), impute["existingDebtPayment"])
        dtiratio = calculate_dti(existing_debt, income)
        
        # Prepare data
        loan_amount = safe_float(data.get('loanAmount'), impute["loanAmount"])
        loan_rate = safe_float(data.get('loanRate'), impute["loanRate"])
        age = safe_float(data.get('age'), impute["age"])
        loan_purpose = map_loan_purpose(data.get('loanPurpose'), "credit_score")
        has_mortgage = 1 if safe_bool(data.get('hasMortgage'), False) else 0
        has_dependents = 1 if safe_bool(data.get('hasDependents'), False) else 0
        
        # Create DataFrame for preprocessing (matching notebook structure)
        df = pd.DataFrame({
            'LoanAmount': [loan_amount],
            'Income': [income],
            'InterestRate': [loan_rate],
            'DTIRatio': [dtiratio],
            'Age': [age],
            'LoanPurpose': [loan_purpose],
            'HasMortgage': [has_mortgage],
            'HasDependents': [has_dependents],
            'CreditScore': [0]  # Placeholder, will be normalized
        })
        
        # Normalize numerical features (as in notebook).
        # We keep this deterministic and versioned via preprocessing artifacts.
        norm = Normalizer()
        df[['Income', 'LoanAmount', 'CreditScore', 'InterestRate', 'DTIRatio']] = norm.fit_transform(
            df[['Income', 'LoanAmount', 'CreditScore', 'InterestRate', 'DTIRatio']]
        )
        
        # Feature engineering
        df['DTIRatio*InterestRate'] = np.log(df['DTIRatio'] * df['InterestRate'] + 1e-10)  # Add small epsilon to avoid log(0)
        df['LoanAmount/Income'] = (np.abs(np.log(df['LoanAmount'] / df['Income'] + 1e-10)) ** 0.30)
        
        # Prepare features for prediction (drop original columns)
        features = df[['Age', 'LoanPurpose', 'HasMortgage', 'HasDependents', 'DTIRatio*InterestRate', 'LoanAmount/Income']]
        
        # Load model and predict
        model = load_credit_score_model()
        prediction = model.predict(features.values)[0]
        return normalize_credit_score(float(prediction))
    except Exception as e:
        raise Exception(f"Error predicting credit score: {str(e)}")

def predict_default(data, credit_score):
    """
    Predict default status using PyTorch neural network
    
    Input data structure:
    {
        'age': float,
        'income': float,
        'loanAmount': float,
        'loanRate': float,
        'loanTerm': float,
        'existingDebtPayment': float,
        'loanPurpose': string,
        'hasMortgage': boolean,
        'hasDependents': boolean
    }
    credit_score: predicted credit score from first model
    """
    try:
        artifacts = load_preprocessing_artifacts()
        feature_order = artifacts["default_pd"].get("feature_order", DEFAULT_FEATURE_ORDER)
        features, raw_row = build_default_feature_row(data, credit_score)
        
        # Load model and predict
        model = load_default_model()
        features_tensor = torch.tensor([features], dtype=torch.float32)
        
        with torch.no_grad():
            prediction_prob = float(model(features_tensor).item())
            prediction = 1 if prediction_prob > 0.5 else 0

        # SHAP explainability
        explainer = get_shap_explainer()
        shap_values = explainer(np.array([features], dtype=np.float32))
        shap_array = shap_values.values[0]
        top_features = sorted(
            zip(feature_order, shap_array),
            key=lambda item: abs(item[1]),
            reverse=True
        )[:5]

        explanation_summary = []
        for feature_name, impact in top_features:
            explanation_summary.append({
                "feature": feature_name,
                "impact": float(impact),
                "direction": "increases" if impact >= 0 else "decreases"
            })

        return int(prediction), float(prediction_prob), explanation_summary, raw_row
    except Exception as e:
        raise Exception(f"Error predicting default: {str(e)}")

def initialize_models():
    """Load models and preprocessing artifacts once at startup."""
    load_preprocessing_artifacts()
    load_credit_score_model()
    load_default_model()
    # SHAP explainer is heavier; keep lazy unless preloading is required.
    if os.environ.get("ML_PRELOAD_SHAP", "false").lower() in ["true", "1", "yes"]:
        get_shap_explainer()

def validate_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("Request payload must be an object")
    missing = REQUIRED_REQUEST_KEYS - set(payload.keys())
    if missing:
        raise ValueError(f"Missing request keys: {sorted(missing)}")
    if payload.get("action") != "predict":
        raise ValueError(f"Unknown action: {payload.get('action')}")
    if not isinstance(payload.get("data"), dict):
        raise ValueError("Request data must be an object")
    data_missing = REQUIRED_DATA_KEYS - set(payload["data"].keys())
    if data_missing:
        raise ValueError(f"Missing data keys: {sorted(data_missing)}")

def build_response(request_id, credit_score, default_status, default_probability, risk_bucket, explanation_summary, raw_row):
    artifacts = load_preprocessing_artifacts()
    return {
        "success": True,
        "requestId": request_id,
        "creditScore": credit_score,
        "defaultStatus": default_status,
        "defaultProbability": default_probability,
        "riskBucket": risk_bucket,
        "explanationSummary": explanation_summary,
        "preprocessingVersion": artifacts.get("version", "unknown"),
        "modelVersions": {
            "creditScore": CREDIT_SCORE_MODEL_VERSION,
            "defaultProbability": DEFAULT_MODEL_VERSION
        },
        "rawFeatureRow": raw_row,
        # Business-friendly aliases for API responses
        "credit_score": credit_score,
        "probability_of_default": default_probability,
        "risk_bucket": risk_bucket,
        "explanation_summary": explanation_summary
    }

def handle_predict(request):
    loan_data = request["data"]
    credit_score = predict_credit_score(loan_data)
    default_status, default_probability, explanation_summary, raw_row = predict_default(loan_data, credit_score)

    if default_probability < 0.30:
        risk_bucket = "Low Risk"
    elif default_probability < 0.60:
        risk_bucket = "Medium Risk"
    else:
        risk_bucket = "High Risk"

    return credit_score, default_status, default_probability, risk_bucket, explanation_summary, raw_row

def process_request(payload):
    validate_request(payload)
    request_id = payload.get("request_id") or payload.get("requestId")
    credit_score, default_status, default_probability, risk_bucket, explanation_summary, raw_row = handle_predict(payload)
    return build_response(request_id, credit_score, default_status, default_probability, risk_bucket, explanation_summary, raw_row)

def main():
    """Main function to handle predictions via stdin/stdout."""
    try:
        initialize_models()
        # Read line-delimited JSON requests (streaming mode).
        processed_any = False
        for line in sys.stdin:
            if not line.strip():
                continue
            processed_any = True
            input_data = {}
            try:
                input_data = json.loads(line)
                result = process_request(input_data)
                print(json.dumps(result), flush=True)
            except Exception as inner_error:
                error_result = {
                    "success": False,
                    "requestId": input_data.get("request_id") if isinstance(input_data, dict) else None,
                    "error": str(inner_error)
                }
                print(json.dumps(error_result), flush=True)

        if not processed_any:
            raise ValueError("No input provided")
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
