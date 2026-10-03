from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from ..core.db import get_db
from ..models import AgentRun, ExecutionStep, Diagnosis

router = APIRouter()

@router.get("/projects/{project_id}/analytics")
def get_project_analytics(
    project_id: str, 
    timeframe: str = "7d", # 24h, 7d, 30d
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    if timeframe == "24h":
        start_date = now - timedelta(days=1)
        group_by_format = "%Y-%m-%d %H:00:00" # group by hour
    elif timeframe == "30d":
        start_date = now - timedelta(days=30)
        group_by_format = "%Y-%m-%d" # group by day
    else: # default 7d
        start_date = now - timedelta(days=7)
        group_by_format = "%Y-%m-%d" # group by day
        
    # Base query for timeframe
    base_query = db.query(AgentRun).filter(
        AgentRun.project_id == project_id,
        AgentRun.started_at >= start_date
    )

    # Total Runs in timeframe
    total_runs = base_query.count()
    
    # Status breakdown in timeframe
    success_runs = base_query.filter(AgentRun.status.in_(["success", "completed"])).count()
    failed_runs = base_query.filter(AgentRun.status == "failed").count()
    running_runs = base_query.filter(AgentRun.status == "running").count()
    
    success_rate = (success_runs / total_runs * 100) if total_runs > 0 else 0
    failure_rate = (failed_runs / total_runs * 100) if total_runs > 0 else 0
    
    # Average Duration
    avg_duration = db.query(func.avg(AgentRun.duration)).filter(
        AgentRun.project_id == project_id, 
        AgentRun.started_at >= start_date,
        AgentRun.status.in_(["success", "completed", "failed"])
    ).scalar() or 0
    
    # Failure Categories (from Diagnosis)
    diagnoses = db.query(Diagnosis.failure_category, func.count(Diagnosis.id)).join(
        AgentRun, AgentRun.id == Diagnosis.run_id
    ).filter(
        AgentRun.project_id == project_id,
        AgentRun.started_at >= start_date
    ).group_by(
        Diagnosis.failure_category
    ).all()
    
    failure_categories = [{"category": row[0], "count": row[1]} for row in diagnoses]
    
    # Time-series data
    # In SQLite, we can use strftime
    time_series = db.query(
        func.strftime(group_by_format, AgentRun.started_at).label('ts'),
        func.count(AgentRun.id).label('count')
    ).filter(
        AgentRun.project_id == project_id,
        AgentRun.started_at >= start_date
    ).group_by('ts').order_by('ts').all()
    
    runs_over_time = [{"timestamp": row.ts, "count": row.count} for row in time_series if row.ts]
    
    return {
        "total_runs": total_runs,
        "success_runs": success_runs,
        "failed_runs": failed_runs,
        "success_rate": round(success_rate, 1),
        "failure_rate": round(failure_rate, 1),
        "active_runs": running_runs,
        "avg_duration_seconds": round(avg_duration, 2),
        "failure_categories": failure_categories,
        "runs_over_time": runs_over_time,
        "timeframe": timeframe
    }
