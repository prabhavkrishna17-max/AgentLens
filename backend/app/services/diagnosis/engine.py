import os
from sqlalchemy.orm import Session
from .providers import DevelopmentDiagnosisProvider, GeminiProvider
from ...models import AgentRun, ExecutionStep, Diagnosis

class DiagnosisEngine:
    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            self.provider = GeminiProvider(api_key=self.api_key)
        else:
            self.provider = DevelopmentDiagnosisProvider()

    def diagnose(self, run: AgentRun, all_steps: list[ExecutionStep], failed_step: ExecutionStep) -> Diagnosis:
        try:
            result_json = self.provider.generate_diagnosis(run.task, failed_step, all_steps)
            
            diagnosis = Diagnosis(
                run_id=run.id,
                step_id=failed_step.id,
                failure_category=result_json.get("failure_category", "Unknown"),
                root_cause=result_json.get("root_cause", "Unknown root cause"),
                severity=result_json.get("severity", "Medium"),
                confidence_score=result_json.get("confidence_score", 0.5),
                explanation=result_json.get("explanation", ""),
                evidence=result_json.get("evidence", []),
                suggested_fixes=result_json.get("suggested_fixes", []),
                prevention_tips=result_json.get("prevention_tips", []),
                technical_details=result_json.get("technical_details", "")
            )
            self.db.add(diagnosis)
            self.db.commit()
            self.db.refresh(diagnosis)
            return diagnosis
            
        except Exception as e:
            print(f"Error during diagnosis generation: {e}")
            # Fallback to DevelopmentDiagnosisProvider if Gemini fails
            if isinstance(self.provider, GeminiProvider):
                print("Falling back to DevelopmentDiagnosisProvider")
                fallback_provider = DevelopmentDiagnosisProvider()
                result_json = fallback_provider.generate_diagnosis(run.task, failed_step, all_steps)
                
                diagnosis = Diagnosis(
                    run_id=run.id,
                    step_id=failed_step.id,
                    failure_category=result_json.get("failure_category", "Unknown"),
                    root_cause=result_json.get("root_cause", "Unknown root cause"),
                    severity=result_json.get("severity", "Medium"),
                    confidence_score=result_json.get("confidence_score", 0.5),
                    explanation=result_json.get("explanation", "") + f"\n\nNote: Fell back to structural analysis due to error: {str(e)}",
                    evidence=result_json.get("evidence", []),
                    suggested_fixes=result_json.get("suggested_fixes", []),
                    prevention_tips=result_json.get("prevention_tips", []),
                    technical_details=result_json.get("technical_details", str(e))
                )
                self.db.add(diagnosis)
                self.db.commit()
                self.db.refresh(diagnosis)
                return diagnosis
            else:
                raise e
