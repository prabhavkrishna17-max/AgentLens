@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Running Backend Tests...
echo ==========================================
cd backend
call venv\Scripts\pytest
if %errorlevel% neq 0 (
    echo [FAIL] Backend tests failed.
    exit /b %errorlevel%
)
cd ..

echo ==========================================
echo Running Frontend Build...
echo ==========================================
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [FAIL] Frontend build failed.
    exit /b %errorlevel%
)
cd ..

echo ==========================================
echo Running Smoke Test...
echo ==========================================
call backend\venv\Scripts\python scripts\smoke_test.py
if %errorlevel% neq 0 (
    echo [FAIL] Smoke test failed.
    exit /b %errorlevel%
)

echo ==========================================
echo [PASS] All checks passed successfully!
echo ==========================================
