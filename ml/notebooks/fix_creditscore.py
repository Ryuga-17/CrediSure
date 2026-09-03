import pandas as pd
import numpy as np
import lightgbm as lgb
import pickle
import os
from sklearn.preprocessing import Normalizer

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
model_path = os.path.join(project_root, "models", "creditscore_model.pkl")

# Generate synthetic dataset
np.random.seed(42)
n_samples = 1000

df_train = pd.DataFrame({
    'Age': np.random.randint(18, 70, n_samples),
    'Income': np.random.uniform(20000, 150000, n_samples),
    'LoanAmount': np.random.uniform(1000, 50000, n_samples),
    'InterestRate': np.random.uniform(0.05, 0.25, n_samples),
    'DTIRatio': np.random.uniform(0.1, 0.6, n_samples),
    'LoanPurpose': np.random.choice([0, 1, 2, 3], n_samples),
    'HasMortgage': np.random.choice([0, 1], n_samples),
    'HasDependents': np.random.choice([0, 1], n_samples)
})

# Generate target
raw_score = 600 + (np.log1p(df_train['Income']) * 10) - (df_train['DTIRatio'] * 200) + (df_train['Age'] * 1.5) + np.random.normal(0, 20, size=n_samples)
df_train['CreditScore'] = np.clip(raw_score, 300, 850)
y = df_train['CreditScore']

# Normalization matching production
norm = Normalizer()
cols_to_norm = ['Income', 'LoanAmount', 'CreditScore', 'InterestRate', 'DTIRatio']
df_train[cols_to_norm] = norm.fit_transform(df_train[cols_to_norm])

df_train['DTIRatio*InterestRate'] = np.log(df_train['DTIRatio'] * df_train['InterestRate'] + 1e-10)
df_train['LoanAmount/Income'] = (np.abs(np.log(df_train['LoanAmount'] / df_train['Income'] + 1e-10)) ** 0.30)

features = ['Age', 'LoanPurpose', 'HasMortgage', 'HasDependents', 'DTIRatio*InterestRate', 'LoanAmount/Income']
X = df_train[features]

train_data = lgb.Dataset(X, label=y)
params = {
    'objective': 'regression',
    'metric': 'rmse',
    'learning_rate': 0.05,
    'max_depth': 4,
    'random_state': 42
}

model = lgb.train(params, train_data, num_boost_round=50)

os.makedirs(os.path.dirname(model_path), exist_ok=True)
with open(model_path, 'wb') as f:
    pickle.dump(model, f)

print(f"Synthetic CreditScore target generated and model saved to {model_path}.")
