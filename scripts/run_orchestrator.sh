#!/bin/bash
# Script to run the daily orchestrator
# Schedule as cron job: 0 6 * * * /path/to/run_orchestrator.sh

# Navigate to project directory
cd "$(dirname "$0")/.." || exit 1

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run orchestrator
python -m backend.orchestrator >> backend/logs/orchestrator.log 2>&1

# Exit with orchestrator's exit code
exit $?
