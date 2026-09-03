import pandas as pd
import numpy as np
import lightgbm as lgb
import os
import pickle
from sklearn.metrics import roc_auc_score, f1_score, classification_report
from sklearn.model_selection import train_test_split

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, 'train.csv') # Using train.csv for train/test split since test.csv might lack target
models_dir = os.path.join(os.path.dirname(os.path.dirname(script_dir)), 'models')
model_path = os.path.join(models_dir, 'creditscore_classifier.pkl')

print("Loading data...")
df = pd.read_csv(data_path)

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

print("Cleaning data...")
for col in features:
    if col != 'Credit_Mix':
        df[col] = pd.to_numeric(df[col].astype(str).str.replace('_', '').replace('', np.nan), errors='coerce')

df['Credit_Mix'] = df['Credit_Mix'].astype(str).str.replace('_', 'Unknown')
credit_mix_map = {'Bad': 0, 'Standard': 1, 'Good': 2, 'Unknown': 3}
df['Credit_Mix'] = df['Credit_Mix'].map(credit_mix_map).fillna(3).astype(int)

target_map = {'Poor': 0, 'Standard': 1, 'Good': 2}
df[target] = df[target].map(target_map)
df = df.dropna(subset=[target])

impute_vals = {}
for col in features:
    if col != 'Credit_Mix':
        impute_vals[col] = df[col].median()
        df[col] = df[col].fillna(impute_vals[col])

X = df[features]
y = df[target]

# Split to get a holdout set (simulate exactly what we would get on unseen data)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Loading model...")
with open(model_path, 'rb') as f:
    model = pickle.load(f)

print("Evaluating...")
# Predict probabilities for AUC
y_pred_proba = model.predict(X_test)

# Predict classes for F1
y_pred_class = np.argmax(y_pred_proba, axis=1)

# Calculate metrics
# macro avg ROC AUC for multiclass
roc_auc = roc_auc_score(y_test, y_pred_proba, multi_class='ovr', average='macro')
f1 = f1_score(y_test, y_pred_class, average='macro')

print(f"\n--- RESULTS ---")
print(f"ROC-AUC (Macro): {roc_auc:.4f}")
print(f"F1-Score (Macro): {f1:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred_class, target_names=['Poor', 'Standard', 'Good']))
