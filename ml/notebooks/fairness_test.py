import pandas as pd
import sys
import os

# Set paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
dataset_path = os.path.join(project_root, "Loan_default.csv")

if not os.path.exists(dataset_path):
    print(f"Dataset not found at {dataset_path}. Please download Loan_default.csv.")
    sys.exit(1)

# Load dataset
df = pd.read_csv(dataset_path)

# Simulate model prediction using a proxy if predictions aren't available
# In a real scenario, we'd load the model and predict on this df.
# For demonstration of the fairness test, we use the actual Default column to measure base disparity,
# which the model is likely to learn.

print("=== Disparate Impact Analysis ===")
print("Measuring fairness across protected classes in training data.\n")

# 1. Age Disparity
print("--- Age (Threshold: 25) ---")
young = df[df['Age'] < 25]
older = df[df['Age'] >= 25]

young_default_rate = young['Default'].mean()
older_default_rate = older['Default'].mean()

print(f"Default rate for Age < 25: {young_default_rate:.2%}")
print(f"Default rate for Age >= 25: {older_default_rate:.2%}")
# Disparate impact ratio (Selection rate of unprivileged / privileged)
# Here selection rate = NOT defaulting (approval)
young_approval_rate = 1 - young_default_rate
older_approval_rate = 1 - older_default_rate
if older_approval_rate > 0:
    di_age = young_approval_rate / older_approval_rate
    print(f"Disparate Impact Ratio (Approval <25 / >=25): {di_age:.2f}")
    if di_age < 0.8:
        print("WARNING: Possible age bias detected (DI < 0.80)")
    else:
        print("Age DI passes the 80% rule.")

print("\n--- Income (Threshold: Median) ---")
median_income = df['Income'].median()
low_income = df[df['Income'] < median_income]
high_income = df[df['Income'] >= median_income]

low_inc_default_rate = low_income['Default'].mean()
high_inc_default_rate = high_income['Default'].mean()

print(f"Default rate for Income < Median: {low_inc_default_rate:.2%}")
print(f"Default rate for Income >= Median: {high_inc_default_rate:.2%}")

low_inc_approval_rate = 1 - low_inc_default_rate
high_inc_approval_rate = 1 - high_inc_default_rate

if high_inc_approval_rate > 0:
    di_inc = low_inc_approval_rate / high_inc_approval_rate
    print(f"Disparate Impact Ratio (Approval Low / High Income): {di_inc:.2f}")
    if di_inc < 0.8:
        print("WARNING: Possible income bias detected (DI < 0.80)")
    else:
        print("Income DI passes the 80% rule.")

print("\nAnalysis Complete.")
