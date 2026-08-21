#!/bin/bash
set -e

echo "=========================================="
echo "Running Backend Tests..."
echo "=========================================="
cd backend
pytest
cd ..

echo "=========================================="
echo "Running Frontend Build..."
echo "=========================================="
cd frontend
npm run build
cd ..

echo "=========================================="
echo "Running Smoke Test..."
echo "=========================================="
python scripts/smoke_test.py

echo "=========================================="
echo "[PASS] All checks passed successfully!"
echo "=========================================="
