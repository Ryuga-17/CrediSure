import pandas as pd
import numpy as np
import lightgbm as lgb
import os
import json
import pickle

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, 'train.csv')
models_dir = os.path.join(os.path.dirname(os.path.dirname(script_dir)), 'models')
artifacts_dir = os.path.join(os.path.dirname(os.path.dirname(script_dir)), 'ml-artifacts')

os.makedirs(models_dir, exist_ok=True)
os.makedirs(artifacts_dir, exist_ok=True)

model_path = os.path.join(models_dir, 'creditscore_classifier.pkl')
preprocessing_path = os.path.join(artifacts_dir, 'preprocessing_v3_creditscore.json')

print("Loading data...")
df = pd.read_csv(data_path)

# Features to use
features = [
    'Age',
    'Annual_Income',
    'Interest_Rate',
    'Outstanding_Debt',
    'Num_Bank_Accounts',
    'Num_Credit_Card',
    'Num_of_Delayed_Payment',
    'Credit_Mix'
]

target = 'Credit_Score'
df = df[features + [target]].copy()

# Basic cleaning based on dataset typical issues
print("Cleaning data...")
# Convert strings that are actually numbers with underscores etc.
for col in features:
    if col != 'Credit_Mix':
        df[col] = pd.to_numeric(df[col].astype(str).str.replace('_', '').replace('', np.nan), errors='coerce')

# Handle categorical Credit_Mix
df['Credit_Mix'] = df['Credit_Mix'].astype(str).str.replace('_', 'Unknown')
credit_mix_map = {
    'Bad': 0,
    'Standard': 1,
    'Good': 2,
    'Unknown': 3
}
df['Credit_Mix'] = df['Credit_Mix'].map(credit_mix_map).fillna(3).astype(int)

# Map Target
target_map = {'Poor': 0, 'Standard': 1, 'Good': 2}
df[target] = df[target].map(target_map)

# Drop rows where target is NaN (if any)
df = df.dropna(subset=[target])

# Compute imputation values for numerics (median)
impute_vals = {}
for col in features:
    if col != 'Credit_Mix':
        impute_vals[col] = df[col].median()
        df[col] = df[col].fillna(impute_vals[col])

X = df[features]
y = df[target]

print("Training model...")
train_data = lgb.Dataset(X, label=y)
params = {
    'objective': 'multiclass',
    'num_class': 3,
    'metric': 'multi_logloss',
    'learning_rate': 0.05,
    'max_depth': 6,
    'random_state': 42
}

model = lgb.train(params, train_data, num_boost_round=100)

print(f"Saving model to {model_path}...")
with open(model_path, 'wb') as f:
    pickle.dump(model, f)

# Save preprocessing artifact
artifact = {
    "version": "v3_classification",
    "credit_score": {
        "feature_order": features,
        "numerical_impute": impute_vals,
        "categorical_mapping": {
            "creditMix": credit_mix_map
        },
        "target_mapping": {
            "0": "Poor",
            "1": "Standard",
            "2": "Good"
        }
    }
}

print(f"Saving artifacts to {preprocessing_path}...")
with open(preprocessing_path, 'w') as f:
    json.dump(artifact, f, indent=4)

print("Done!")
