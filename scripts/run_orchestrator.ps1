# PowerShell script to run the daily orchestrator
# Schedule as Windows Task Scheduler job

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Activate virtual environment if exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
}

# Run orchestrator
python -m backend.orchestrator *>&1 | Tee-Object -Append -FilePath "backend\logs\orchestrator.log"

# Exit with orchestrator's exit code
exit $LASTEXITCODE
