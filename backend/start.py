import subprocess
import sys
import os
import time

def start_services():
    # Check Python version
    if sys.version_info < (3, 10):
        print(f"WARNING: You are running this script with Python {sys.version_info.major}.{sys.version_info.minor}.")
        print("This project requires Python 3.10 or higher.")
        print("Please run with: py -3.10 backend/start.py (on Windows) or python3.10 backend/start.py")
        print("Continuing anyway in 3 seconds...")
        time.sleep(3)

    # Get the root directory (assuming start.py is in backend/)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(backend_dir)
    
    # Path to main.py
    main_py_path = os.path.join(backend_dir, "main.py")
    
    # Path to solar forecast api directory
    solar_forecast_dir = os.path.join(backend_dir, "models", "quartz-solar-forecast")
    
    processes = []

    print("Starting Main Backend on port 8001...")
    # Run main.py directly as it has uvicorn.run
    # We run it from root_dir so that imports like 'from backend.core...' work
    p1 = subprocess.Popen([sys.executable, main_py_path], cwd=root_dir)
    processes.append(p1)

    print("Starting Solar Forecast API on port 8002...")
    # Prefer running the forecast API using the forecast-specific venv if present
    venv_forecast_dir = os.path.join(backend_dir, ".venv-forecast")
    if sys.platform.startswith("win"):
        forecast_python = os.path.join(venv_forecast_dir, "Scripts", "python.exe")
    else:
        forecast_python = os.path.join(venv_forecast_dir, "bin", "python")

    if not os.path.exists(forecast_python):
        print(f"Forecast venv python not found at {forecast_python}. Falling back to current Python executable.")
        forecast_python = sys.executable

    # Run uvicorn using the selected python executable. We keep cwd pointed at the forecast package
    p2 = subprocess.Popen(
        [forecast_python, "-m", "uvicorn", "api.v1.api:app", "--host", "127.0.0.1", "--port", "8002"],
        cwd=solar_forecast_dir
    )
    processes.append(p2)

    print("Services started. Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        for p in processes:
            p.terminate()
        for p in processes:
            p.wait()
        print("Services stopped.")

if __name__ == "__main__":
    start_services()
