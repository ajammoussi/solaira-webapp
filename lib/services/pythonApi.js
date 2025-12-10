import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

/**
 * Python API Service
 * Wraps calls to the FastAPI backend
 */
const pythonApi = {
  /**
   * Get PV production predictions
   * @param {Array} weatherData - List of weather data objects
   * @returns {Promise} - Prediction results
   */
  getPredictions: async (weatherData) => {
    try {
      const response = await axios.post(`${API_URL}/predict`, {
        data: weatherData,
        model_type: 'xgboost'
      });
      return response.data;
    } catch (error) {
      console.error('Prediction API Error:', error);
      throw error;
    }
  },

  /**
   * Run energy simulation
   * @param {Array} weatherData - Weather forecast (Optional)
   * @param {number} currentSoc - Current Battery SOC %
   * @param {Array} consumptionProfile - Hourly consumption (kWh) (Optional)
   * @param {string} date - Date to simulate (YYYY-MM-DD)
   * @returns {Promise} - Simulation results and advice
   */
  runSimulation: async (weatherData, currentSoc, consumptionProfile, date) => {
    try {
      const response = await axios.post(`${API_URL}/simulate`, {
        weather_data: weatherData,
        current_soc: currentSoc,
        consumption_profile: consumptionProfile,
        date: date
      });
      return response.data;
    } catch (error) {
      console.error('Simulation API Error:', error);
      throw error;
    }
  },

  /**
   * Analyze maintenance status
   * @param {Array} dates - ISO date strings
   * @param {Array} actuals - Actual production values
   * @param {Array} predicteds - Predicted production values
   * @returns {Promise} - Maintenance analysis
   */
  analyzeMaintenance: async (dates, actuals, predicteds) => {
    try {
      const response = await axios.post(`${API_URL}/maintenance`, {
        dates: dates,
        actual_production: actuals,
        predicted_production: predicteds
      });
      return response.data;
    } catch (error) {
      console.error('Maintenance API Error:', error);
      throw error;
    }
  },
  
  /**
   * Trigger model retraining
   */
  retrainModels: async () => {
    try {
      const response = await axios.post(`${API_URL}/retrain`);
      return response.data;
    } catch (error) {
      console.error('Retrain API Error:', error);
      throw error;
    }
  }
};

export default pythonApi;
