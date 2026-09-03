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
import joblib
# shap is imported lazily in the explanation functions: it is only needed
# for explanations, and a missing or broken install should not disable
# scoring.

# Walk up from Backend/src/services to the repository root, which is where the
# model files and ml_artifacts/ live. CREDITSURE_ROOT overrides this for
# containerised deployments where the layout differs.
script_dir = os.path.dirname(os.path.abspath(__file__))          # Backend/src/services
src_dir = os.path.dirname(script_dir)                            # Backend/src
backend_dir = os.path.dirname(src_dir)                           # Backend
project_root = os.environ.get("CREDITSURE_ROOT") or os.path.dirname(backend_dir)

# Model paths. The PD model is v2 (LightGBM, replacing the original
# PyTorch MLP -- see notebooks/model_for_default.ipynb): no CreditScore
# input (that was chained from the credit-score model's own prediction,
# which has no real signal in this dataset -- a genuine train/serve skew,
# not just a style choice), corrected DTIRatio scale, class-weighted loss,
# and isotonic probability calibration. The credit-score model stays on v1
# -- it needs real correlated training data before a v2 is worth shipping,
# see notebooks/model_for_creditscore.ipynb's own notes.
CREDIT_SCORE_MODEL_PATH = os.path.join(project_root, 'ml', 'models', 'creditscore_classifier.pkl')
DEFAULT_MODEL_PATH = os.path.join(project_root, 'ml', 'models', 'default_model_v2.txt')
DEFAULT_PD_CALIBRATOR_PATH = os.path.join(project_root, 'ml', 'models', 'default_pd_calibrator_v2.joblib')
PREPROCESSING_PATH = os.path.join(project_root, 'ml', 'ml-artifacts', 'preprocessing_v3_creditscore.json')
DEFAULT_PD_PREPROCESSING_PATH = os.path.join(project_root, 'ml', 'ml-artifacts', 'preprocessing_v2.json')

# Version metadata for traceability
CREDIT_SCORE_MODEL_VERSION = "creditscore_classifier.pkl@v3"
DEFAULT_MODEL_VERSION = "default_model_v2.txt@v2"

# Global model instances
credit_score_model = None
default_model = None
preprocessing_artifacts = None
default_pd_artifacts = None
default_pd_calibrator = None

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
    "hasDependents",
    "numBankAccounts",
    "numCreditCards",
    "numOfDelayedPayment",
    "creditMix"
}

def load_credit_score_model():
    """Load the LightGBM credit score model.

    The shipped artifact is a pickled Booster, so try pickle first and fall back
    to LightGBM's native text format for models exported that way.
    """
    global credit_score_model
    if credit_score_model is None:
        loaded = None
        try:
            with open(CREDIT_SCORE_MODEL_PATH, 'rb') as f:
                loaded = pickle.load(f)
        except Exception as pickle_error:
            try:
                loaded = lgb.Booster(model_file=CREDIT_SCORE_MODEL_PATH)
            except Exception as booster_error:
                raise Exception(
                    f"Failed to load credit score model. pickle error: {pickle_error}. "
                    f"booster error: {booster_error}"
                )

        # sklearn wrappers (LGBMRegressor/LGBMClassifier) expose the raw Booster.
        credit_score_model = getattr(loaded, 'booster_', loaded)

        if not hasattr(credit_score_model, 'predict'):
            raise Exception(f"Credit score model is not predictable: {type(credit_score_model)}")
    return credit_score_model

def load_default_model():
    """Load the LightGBM default-probability (PD) model."""
    global default_model
    if default_model is None:
        default_model = lgb.Booster(model_file=DEFAULT_MODEL_PATH)
    return default_model

def load_default_pd_calibrator():
    """Load the isotonic regression calibrator fit on validation data.

    scale_pos_weight (used to handle the ~88/12 class imbalance during
    training) skews the model's raw probability output away from true
    frequencies -- good discrimination (AUC), bad calibration (Brier). This
    calibrator corrects that: apply it to the model's raw probability
    output before treating the result as an actual probability. See
    notebooks/model_for_default.ipynb for how it was fit.
    """
    global default_pd_calibrator
    if default_pd_calibrator is None:
        default_pd_calibrator = joblib.load(DEFAULT_PD_CALIBRATOR_PATH)
    return default_pd_calibrator

def load_default_pd_artifacts():
    """Load the PD model's own preprocessing artifacts (v2) -- separate
    from load_preprocessing_artifacts()'s v1, which the credit-score model
    still uses. Unlike v1, there's no scaler here: LightGBM splits on raw
    feature values and doesn't need one."""
    global default_pd_artifacts
    if default_pd_artifacts is None:
        if not os.path.exists(DEFAULT_PD_PREPROCESSING_PATH):
            raise FileNotFoundError(f"PD preprocessing artifacts not found: {DEFAULT_PD_PREPROCESSING_PATH}")
        with open(DEFAULT_PD_PREPROCESSING_PATH, "r") as f:
            full_artifacts = json.load(f)
        if "default_pd" not in full_artifacts or "feature_order" not in full_artifacts["default_pd"]:
            raise ValueError(f"{DEFAULT_PD_PREPROCESSING_PATH} is missing default_pd.feature_order")
        default_pd_artifacts = full_artifacts["default_pd"]
        # "version" lives at the top level of the file, not nested under
        # default_pd -- copy it down so callers only need this one dict.
        default_pd_artifacts["version"] = full_artifacts.get("version", "unknown")
    return default_pd_artifacts

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
    if model_key == "default_pd":
        artifacts = load_default_pd_artifacts()
        mapping = artifacts["categorical_mapping"]["loanPurpose"]
    else:
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
    # Kept on the same 0-1 ratio scale the models are trained on -- the
    # source dataset's DTIRatio column is e.g. 0.44, not 44. The old `* 100`
    # here fed every prediction a DTI value ~100x outside the training
    # distribution.
    if income <= 0:
        return 0.0
    return existing_debt / income

CREDIT_SCORE_MIN = 300.0
CREDIT_SCORE_MAX = 850.0

def denormalize_credit_score(raw_score, row_norm):
    """
    Convert the model's row-normalized output back to a 300-850 credit score.

    Training applied sklearn's Normalizer to
    [Income, LoanAmount, CreditScore, InterestRate, DTIRatio]. Normalizer works
    per row, so the target the model learned is CreditScore divided by that
    row's L2 norm. Recovering the score means multiplying by the same norm;
    without this every applicant collapses to ~300.
    """
    score = float(raw_score) * float(row_norm)
    return max(CREDIT_SCORE_MIN, min(CREDIT_SCORE_MAX, score))

def get_credit_score_explanation(model, feature_values, feature_names, predicted_class):
    """
    Exact SHAP attribution for the LightGBM multi-class credit score model.
    """
    import shap

    explainer = shap.TreeExplainer(model)
    shap_result = explainer(feature_values)
    
    # shap_result.values is shape (1, n_features, n_classes) for LightGBM multiclass
    if len(shap_result.values.shape) == 3:
        raw_shap_values = shap_result.values[0, :, predicted_class]
    else:
        raw_shap_values = shap_result.values[0]

    top_features = sorted(
        zip(feature_names, raw_shap_values),
        key=lambda item: abs(item[1]),
        reverse=True
    )
    return [
        {
            "feature": name,
            "impact": float(impact),
            "direction": "increases" if impact >= 0 else "decreases"
        }
        for name, impact in top_features
    ]

def get_default_probability_explanation(model, feature_values, feature_names):
    """
    Exact SHAP attribution for the PD (LightGBM) model via TreeExplainer --
    same method as get_credit_score_explanation, and for the same reason:
    no background sample needed, so none of the approximation issues a
    fabricated/sampled background carried (see git history for the old
    KernelExplainer + synthetic-marginal-background approach this
    replaced, back when the PD model was a PyTorch net).

    UNITS: TreeExplainer explains a binary classifier's raw margin (log-odds)
    output by default -- additive there (base_value + sum(shap_values) ==
    model.predict(X, raw_score=True)), NOT additive in probability space.
    The final probability shown to a user goes through two more nonlinear
    steps after this (sigmoid, then the isotonic calibrator in
    load_default_pd_calibrator), so these impact values are log-odds
    contributions, not "probability points" or calibrated-probability
    points. The sign/direction of each contribution is still meaningful and
    correct (log-odds and probability move together, since sigmoid and the
    calibrator are both monotonically increasing) -- what does NOT transfer
    is a linear reading of the magnitude.
    """
    import shap

    explainer = shap.TreeExplainer(model)
    shap_result = explainer(feature_values)
    shap_values = shap_result.values[0]

    top_features = sorted(
        zip(feature_names, shap_values),
        key=lambda item: abs(item[1]),
        reverse=True
    )
    return [
        {
            "feature": name,
            "impact": float(impact),
            "direction": "increases" if impact >= 0 else "decreases"
        }
        for name, impact in top_features
    ]

def build_default_feature_row(data):
    artifacts = load_default_pd_artifacts()
    impute = artifacts["numerical_impute"]
    feature_order = artifacts["feature_order"]

    income = safe_float(data.get("income"), impute["income"])
    existing_debt = safe_float(data.get("existingDebtPayment"), impute["existingDebtPayment"])
    dti_ratio = calculate_dti(existing_debt, income)

    # map_loan_purpose reads v1's default_pd.categorical_mapping (same
    # loanPurpose -> int values as v2's, just not duplicated here).
    raw_row = {
        "Age": safe_float(data.get("age"), impute["age"]),
        "Income": income,
        "LoanAmount": safe_float(data.get("loanAmount"), impute["loanAmount"]),
        "InterestRate": safe_float(data.get("loanRate"), impute["loanRate"]),
        "LoanTerm": safe_float(data.get("loanTerm"), impute["loanTerm"]),
        "DTIRatio": dti_ratio,
        "LoanPurpose": map_loan_purpose(data.get("loanPurpose"), "default_pd"),
        "HasMortgage": 1 if safe_bool(data.get("hasMortgage"), False) else 0,
        "HasDependents": 1 if safe_bool(data.get("hasDependents"), False) else 0
    }

    # No scaling: LightGBM splits on raw feature values.
    return [raw_row[key] for key in feature_order], raw_row

def predict_credit_score(data):
    """
    Predict credit score class (Good/Standard/Poor) using LightGBM multi-class model
    """
    try:
        artifacts = load_preprocessing_artifacts()
        impute = artifacts["credit_score"]["numerical_impute"]
        credit_mix_map = artifacts["credit_score"]["categorical_mapping"]["creditMix"]
        target_map = artifacts["credit_score"]["target_mapping"]
        
        # Prepare data mapped from frontend fields to model features
        age = safe_float(data.get('age'), impute.get("Age", 30))
        annual_income = safe_float(data.get('income'), impute.get("Annual_Income", 50000))
        interest_rate = safe_float(data.get('loanRate'), impute.get("Interest_Rate", 10))
        outstanding_debt = safe_float(data.get('existingDebtPayment'), impute.get("Outstanding_Debt", 1000))
        
        # New features from expanded UI
        num_bank_accounts = safe_float(data.get('numBankAccounts'), impute.get("Num_Bank_Accounts", 3))
        num_credit_cards = safe_float(data.get('numCreditCards'), impute.get("Num_Credit_Card", 3))
        num_delayed_payments = safe_float(data.get('numOfDelayedPayment'), impute.get("Num_of_Delayed_Payment", 5))
        
        # Categorical feature
        credit_mix_val = data.get('creditMix', 'Unknown')
        credit_mix = credit_mix_map.get(str(credit_mix_val), credit_mix_map.get("Unknown", 3))

        # Create DataFrame
        df = pd.DataFrame({
            'Age': [age],
            'Annual_Income': [annual_income],
            'Interest_Rate': [interest_rate],
            'Outstanding_Debt': [outstanding_debt],
            'Num_Bank_Accounts': [num_bank_accounts],
            'Num_Credit_Card': [num_credit_cards],
            'Num_of_Delayed_Payment': [num_delayed_payments],
            'Credit_Mix': [credit_mix]
        })
        
        features = df[['Age', 'Annual_Income', 'Interest_Rate', 'Outstanding_Debt', 
                       'Num_Bank_Accounts', 'Num_Credit_Card', 'Num_of_Delayed_Payment', 'Credit_Mix']]
        
        model = load_credit_score_model()
        # LightGBM multiclass predict() returns probabilities of shape (1, num_classes)
        probs = model.predict(features.values)
        predicted_class_idx = int(np.argmax(probs[0]))
        
        credit_score_class = target_map.get(str(predicted_class_idx), "Unknown")

        credit_score_explanation = []
        try:
            credit_score_explanation = get_credit_score_explanation(
                model, features.values, list(features.columns), predicted_class_idx
            )
        except Exception as shap_error:
            print(f"Credit score SHAP explanation unavailable: {shap_error}", file=sys.stderr, flush=True)

        return credit_score_class, credit_score_explanation
    except Exception as e:
        raise Exception(f"Error predicting credit score: {str(e)}")

def predict_default(data):
    """
    Predict default status using the LightGBM PD model (v2).

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

    No longer takes a credit_score argument: the old version chained the
    credit-score model's own prediction in as an input feature here, but
    that model has no real signal in the current training data (see
    notebooks/model_for_creditscore.ipynb), which made this a genuine
    train/serve skew -- this model was trained on the dataset's real
    CreditScore column, not the near-random values the live credit-score
    model actually produces. Dropping the feature cost negligible accuracy
    (AUC 0.7322 -> 0.7301, PR-AUC 0.2868 -> 0.2847 on held-out test data --
    confirming CreditScore was carrying almost no real signal for this
    model either) in exchange for removing that skew entirely.
    """
    try:
        artifacts = load_default_pd_artifacts()
        feature_order = artifacts["feature_order"]
        features, raw_row = build_default_feature_row(data)

        model = load_default_model()
        raw_prob = float(model.predict([features])[0])

        # scale_pos_weight during training skewed raw_prob away from true
        # frequencies (better discrimination, worse calibration) -- correct
        # it before treating this as an actual probability.
        calibrator = load_default_pd_calibrator()
        prediction_prob = float(calibrator.predict([raw_prob])[0])

        # 0.5 is a poor operating point for an ~88/12 imbalanced target
        # (F1 0.10 at 0.5 vs 0.34 at the tuned threshold below, measured on
        # held-out test data) -- use the threshold tuned on validation data
        # during training instead of assuming the naive default.
        threshold = artifacts.get("decision_threshold", 0.5)
        prediction = 1 if prediction_prob > threshold else 0

        # SHAP explainability. Best-effort: a scored application without an
        # explanation is still useful, so failures here must not lose the score.
        explanation_summary = []
        try:
            explanation = get_default_probability_explanation(
                model, np.array([features], dtype=np.float32), feature_order
            )
            explanation_summary = explanation[:5]
        except Exception as shap_error:
            print(f"SHAP explanation unavailable: {shap_error}", file=sys.stderr, flush=True)

        return int(prediction), prediction_prob, explanation_summary, raw_row
    except Exception as e:
        raise Exception(f"Error predicting default: {str(e)}")

def initialize_models():
    """Load models and preprocessing artifacts once at startup.

    Both models now use shap.TreeExplainer (no background sample to build),
    which is cheap to construct fresh per-request -- unlike the old PD
    model's KernelExplainer, there's no expensive explainer state left to
    preload here (the former ML_PRELOAD_SHAP flag controlled exactly that,
    and is gone along with it).
    """
    load_preprocessing_artifacts()
    load_credit_score_model()
    load_default_pd_artifacts()
    load_default_model()
    load_default_pd_calibrator()

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

def generate_adverse_action_notice(explanation_summary):
    if not explanation_summary:
        return None
    risk_drivers = [f["feature"] for f in explanation_summary if f["direction"] == "increases"]
    if not risk_drivers:
        return None
    
    reason_map = {
        "DTIRatio*InterestRate": "High Debt-to-Income ratio and Interest Rate combination",
        "LoanAmount/Income": "High Loan Amount relative to Income",
        "Age": "Applicant Age",
        "DTIRatio": "High Debt-to-Income ratio",
        "InterestRate": "High Interest Rate",
        "LoanAmount": "Large Loan Amount",
        "Income": "Insufficient Income",
        "HasMortgage": "Existing Mortgage Obligations",
        "HasDependents": "Number of Dependents",
        "LoanPurpose": "Stated Loan Purpose"
    }
    
    reasons = [reason_map.get(f, f) for f in risk_drivers[:3]]
    return "Application declined primarily due to: " + ", ".join(reasons) + "."

def build_response(request_id, credit_score, credit_score_explanation, default_status, default_probability, risk_bucket, explanation_summary, raw_row, adverse_action_notice):
    # The two models are on different preprocessing versions now (credit
    # score: v1: still unchanged; PD: v2, see predict_default's docstring),
    # so a single combined version string would be misleading -- report both.
    credit_score_version = load_preprocessing_artifacts().get("version", "unknown")
    default_pd_version = load_default_pd_artifacts().get("version", "v2")
    return {
        "success": True,
        "requestId": request_id,
        "creditScore": credit_score,
        "creditScoreExplanation": credit_score_explanation,
        "defaultStatus": default_status,
        "defaultProbability": default_probability,
        "riskBucket": risk_bucket,
        "explanationSummary": explanation_summary,
        "preprocessingVersion": f"credit_score@{credit_score_version};default_pd@{default_pd_version}",
        "modelVersions": {
            "creditScore": CREDIT_SCORE_MODEL_VERSION,
            "defaultProbability": DEFAULT_MODEL_VERSION
        },
        "rawFeatureRow": raw_row,
        # Business-friendly aliases for API responses
        "credit_score": credit_score,
        "credit_score_explanation": credit_score_explanation,
        "probability_of_default": default_probability,
        "risk_bucket": risk_bucket,
        "explanation_summary": explanation_summary,
        "adverseActionNotice": adverse_action_notice
    }

def handle_predict(request):
    loan_data = request["data"]
    # Two independent predictions now, not a chained pipeline: the PD model
    # no longer consumes the credit-score model's output as an input
    # feature (see predict_default's docstring for why).
    credit_score, credit_score_explanation = predict_credit_score(loan_data)
    default_status, default_probability, explanation_summary, raw_row = predict_default(loan_data)

    # Low Risk's cutoff MUST match predict_default's own decision_threshold
    # (currently 0.17, tuned for the ~88/12 class imbalance -- see
    # predict_default's docstring), not an independent hardcoded number.
    # These two previously disagreed (Low Risk was hardcoded at < 0.30): any
    # probability in (decision_threshold, 0.30) got defaultStatus=1
    # ("predicted default") alongside riskBucket="Low Risk" in the same
    # response -- a direct contradiction shown to the lender, and routinely
    # hit given the calibrated ~12% base rate, not an edge case.
    decision_threshold = load_default_pd_artifacts().get("decision_threshold", 0.5)
    # High Risk's cutoff is independent of the classifier's operating point
    # (0.5 = "more likely than not to default" reads correctly regardless of
    # where decision_threshold sits) -- max() just guards against a future
    # retrain producing a decision_threshold >= 0.5, which would otherwise
    # invert the Medium/High ordering.
    high_risk_threshold = max(0.5, decision_threshold)

    if default_probability < decision_threshold:
        risk_bucket = "Low Risk"
    elif default_probability < high_risk_threshold:
        risk_bucket = "Medium Risk"
    else:
        risk_bucket = "High Risk"

    adverse_action_notice = None
    if default_status == 1 or risk_bucket == "High Risk":
        adverse_action_notice = generate_adverse_action_notice(explanation_summary)

    return credit_score, credit_score_explanation, default_status, default_probability, risk_bucket, explanation_summary, raw_row, adverse_action_notice

def process_request(payload):
    validate_request(payload)
    request_id = payload.get("request_id") or payload.get("requestId")
    credit_score, credit_score_explanation, default_status, default_probability, risk_bucket, explanation_summary, raw_row, adverse_action_notice = handle_predict(payload)
    return build_response(request_id, credit_score, credit_score_explanation, default_status, default_probability, risk_bucket, explanation_summary, raw_row, adverse_action_notice)

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
