# PV Production Prediction Backend

This directory contains the backend logic for the PV Production Prediction system.

## Structure

- `core/phase_1/`: Contains the ML models and data processing logic.
- `data/`: Contains the processed dataset.
- `models/`: Stores trained model files (`.pkl`, `.h5`, `.json`).
- `main.py`: FastAPI application entry point.
- `requirements.txt`: Python dependencies.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. (Optional) Retrain models:
   ```bash
   python core/phase_1/retrain_models.py
   ```
   Note: This will generate/overwrite files in `models/`.

## Running the API

Start the FastAPI server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## Endpoints

- `GET /`: Health check.
- `POST /predict`: Generate predictions.
  - Body: `{"data": [{"timestamp": "...", "ALLSKY_SFC_SW_DWN": ...}], "model_type": "xgboost"}`
- `POST /retrain`: Trigger model retraining.

## Models

- **XGBoost**: Primary production model.
- **LSTM**: Deep learning model (requires TensorFlow).
- **SARIMA**: Time series analysis (baseline Linear Regression used for production).
