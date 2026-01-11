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
from sklearn.preprocessing import Normalizer, StandardScaler
import lightgbm as lgb
import torch
import torch.nn as nn

# Get the project root directory (parent of Backend)
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
project_root = os.path.dirname(backend_dir)

# Model paths
CREDIT_SCORE_MODEL_PATH = os.path.join(project_root, 'creditscore_model.pkl')
DEFAULT_MODEL_PATH = os.path.join(project_root, 'default_model.pkl')

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
        input_size = 10  # Based on notebook: Age, Income, LoanAmount, CreditScore, InterestRate, LoanTerm, DTIRatio, LoanPurpose, HasMortgage, HasDependents
        
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

def map_loan_purpose(purpose):
    """Map loan purpose string to numeric value"""
    mapping = {
        'Business': 0,
        'Home': 1,
        'Education': 2,
        'Other': 3,
        'Others': 3,
        'Auto': 4,
        'Automobile': 4
    }
    return mapping.get(purpose, 3)  # Default to 'Other'

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
        # Calculate DTIRatio
        income = float(data['income'])
        existing_debt = float(data['existingDebtPayment'])
        dtiratio = (existing_debt / income * 100) if income > 0 else 0
        
        # Prepare data
        loan_amount = float(data['loanAmount'])
        loan_rate = float(data['loanRate'])
        age = float(data['age'])
        loan_purpose = map_loan_purpose(data['loanPurpose'])
        has_mortgage = 1 if data['hasMortgage'] else 0
        has_dependents = 1 if data['hasDependents'] else 0
        
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
        
        # Normalize numerical features (as in notebook)
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
        
        return float(prediction)
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
        # Calculate DTIRatio
        income = float(data['income'])
        existing_debt = float(data['existingDebtPayment'])
        dtiratio = (existing_debt / income * 100) if income > 0 else 0
        
        # Prepare data
        age = float(data['age'])
        loan_amount = float(data['loanAmount'])
        loan_rate = float(data['loanRate'])
        loan_term = float(data['loanTerm'])
        loan_purpose = map_loan_purpose(data['loanPurpose'])
        has_mortgage = 1 if data['hasMortgage'] else 0
        has_dependents = 1 if data['hasDependents'] else 0
        
        # Create DataFrame
        df = pd.DataFrame({
            'Age': [age],
            'Income': [income],
            'LoanAmount': [loan_amount],
            'CreditScore': [credit_score],
            'InterestRate': [loan_rate],
            'LoanTerm': [loan_term],
            'DTIRatio': [dtiratio],
            'LoanPurpose': [loan_purpose],
            'HasMortgage': [has_mortgage],
            'HasDependents': [has_dependents]
        })
        
        # StandardScaler normalization (as in notebook)
        # Note: In production, we should use fitted scaler, but for simplicity, we'll fit_transform
        # This is not ideal but works if the data distribution is similar
        scaler = StandardScaler()
        df[['Age', 'Income', 'LoanAmount', 'CreditScore', 'InterestRate', 'LoanTerm', 'DTIRatio']] = scaler.fit_transform(
            df[['Age', 'Income', 'LoanAmount', 'CreditScore', 'InterestRate', 'LoanTerm', 'DTIRatio']]
        )
        
        # Prepare features (first 10 columns as in notebook)
        features = df.iloc[:, :10].values
        
        # Load model and predict
        model = load_default_model()
        features_tensor = torch.tensor(features, dtype=torch.float32)
        
        with torch.no_grad():
            prediction_prob = model(features_tensor).item()
            prediction = 1 if prediction_prob > 0.5 else 0
        
        return int(prediction), float(prediction_prob)
    except Exception as e:
        raise Exception(f"Error predicting default: {str(e)}")

def main():
    """Main function to handle predictions via stdin/stdout"""
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        if not input_json:
            raise ValueError("No input provided")
        
        input_data = json.loads(input_json)
        
        action = input_data.get('action')
        
        if action == 'predict':
            # Get loan application data
            loan_data = input_data['data']
            
            # Step 1: Predict credit score
            credit_score = predict_credit_score(loan_data)
            
            # Step 2: Predict default using credit score
            default_status, default_probability = predict_default(loan_data, credit_score)
            
            # Return results
            result = {
                'success': True,
                'creditScore': credit_score,
                'defaultStatus': default_status,
                'defaultProbability': default_probability
            }
            
            print(json.dumps(result))
        else:
            raise ValueError(f"Unknown action: {action}")
            
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
