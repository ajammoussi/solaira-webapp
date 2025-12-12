# Bohm Energy Website & Solar Prediction Platform

This project is a Next.js-based marketing website for Bohm Energy, integrated with a Python FastAPI backend for solar energy forecasting and simulation.

## Project Overview

- **Frontend**: Next.js application for the user interface, featuring dashboards and marketing pages.
- **Backend**: Python FastAPI services handling data processing, energy simulation, and solar forecasting (using Quartz Solar Forecast).

## Prerequisites

- **Node.js**: >= 18.x
- **Python**: >= 3.10
- **Git**: For version control and dependency management.

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd peschallengeweb2
```

### 2. Frontend Setup

Install the Node.js dependencies:

```bash
npm install
```

### 3. Backend Setup

**Important:** Python 3.10 is required.

Create a virtual environment (optional but recommended):

```bash
py -3.10 -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r backend/requirements.txt
```

## Running the Application

### Backend

To start the backend services (Main API and Solar Forecast API), run:

```bash
py -3.10 backend/start.py
```

The services will start on:
- Main Backend: http://localhost:8001
- Solar Forecast API: http://localhost:8002

## Running the Application

### 1. Start the Backend Services

We have a helper script to start all backend services (Main API and Solar Forecast API) simultaneously.

**Important:** Ensure you are using Python 3.10+.

**Windows:**
```powershell
py -3.10 backend/start.py
# OR if you have a venv activated:
python backend/start.py
```

**Linux/Mac:**
```bash
python3 backend/start.py
```

This will start:
- **Main Backend**: http://localhost:8001
- **Solar Forecast API**: http://localhost:8002

### 2. Start the Frontend

In a new terminal window:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Project Structure

```
peschallengeweb2/
├── backend/                 # Python Backend
│   ├── main.py             # Main API Entry Point
│   ├── start.py            # Script to run all backend services
│   ├── core/               # Core logic (Phases 1, 2, 3)
│   ├── models/             # ML Models & Quartz Solar Forecast
│   └── requirements.txt    # Python Dependencies
├── components/              # React Components
├── pages/                   # Next.js Pages
├── public/                  # Static Assets
└── ...
```

## Features

- **Solar Forecasting**: Integrated Quartz Solar Forecast for accurate PV generation predictions.
- **Energy Simulation**: Simulates battery usage and energy flow.
- **Interactive Dashboard**: Visualizes energy data and forecasts.
