import mlflow

def evaluate_and_promote(champion_run_id, candidate_run_id, candidate_version):
    try:
        champion_auc = mlflow.get_run(champion_run_id).data.metrics['auc']
        candidate_auc = mlflow.get_run(candidate_run_id).data.metrics['auc']
        
        AUC_IMPROVEMENT_THRESHOLD = 0.015  # 1.5% improvement required
        
        if candidate_auc - champion_auc >= AUC_IMPROVEMENT_THRESHOLD:
            print(f"Candidate AUC ({candidate_auc}) improved over Champion ({champion_auc}) by >= {AUC_IMPROVEMENT_THRESHOLD}. Promoting to Production.")
            
            client = mlflow.tracking.MlflowClient()
            client.transition_model_version_stage(
                name="CreditSure_PD_Model", 
                version=candidate_version, 
                stage="Production"
            )
        else:
            print("Candidate rejected: insufficient AUC improvement.")
            
    except Exception as e:
        print(f"Error during evaluation: {e}")

if __name__ == "__main__":
    # evaluate_and_promote("run_abc", "run_xyz", "v2")
    pass
