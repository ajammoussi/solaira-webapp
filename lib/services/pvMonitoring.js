/**
 * PV Systems Monitoring API Service
 * Handles communication with the backend maintenance monitoring system
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8001';

export const pvMonitoringService = {
  /**
   * Configure number of PV systems to monitor
   * @param {number} numSystems - Number of PV systems (1-20)
   * @param {number} capacityPerSystem - Capacity per system in kW (default: 5.0)
   * @returns {Promise} - Configuration result
   */
  async configureSystems(numSystems, capacityPerSystem = 5.0) {
    try {
      const response = await axios.post(`${API_URL}/api/pv-systems/configure`, {
        num_systems: numSystems,
        capacity_per_system: capacityPerSystem
      }, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Error configuring PV systems:', error);
      throw error;
    }
  },

  /**
   * Start monitoring service
   * @param {number} intervalSeconds - Interval for data generation (default: 60)
   * @returns {Promise} - Status result
   */
  async startMonitoring(intervalSeconds = 60) {
    try {
      const response = await axios.post(`${API_URL}/api/pv-systems/monitoring`, {
        action: 'start',
        interval_seconds: intervalSeconds
      }, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Error starting monitoring:', error);
      throw error;
    }
  },

  /**
   * Stop monitoring service
   * @returns {Promise} - Status result
   */
  async stopMonitoring() {
    try {
      const response = await axios.post(`${API_URL}/api/pv-systems/monitoring`, {
        action: 'stop'
      });
      return response.data;
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      throw error;
    }
  },

  /**
   * Get status of all PV systems
   * @returns {Promise} - Array of system statuses
   */
  async getAllSystemsStatus() {
    try {
      const response = await axios.get(`${API_URL}/api/pv-systems/status`, {
        timeout: 10000 // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Error getting systems status:', error);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        throw new Error('Backend server is not running. Please start the backend on port 8001.');
      }
      throw error;
    }
  },

  /**
   * Get detailed status for a specific system
   * @param {number} systemId - System ID
   * @returns {Promise} - Detailed system status
   */
  async getSystemStatus(systemId) {
    try {
      const response = await axios.get(`${API_URL}/api/pv-systems/${systemId}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error getting system ${systemId} status:`, error);
      throw error;
    }
  },

  /**
   * Get historical data for a system
   * @param {number} systemId - System ID
   * @param {number} hours - Number of hours of history (default: 24)
   * @returns {Promise} - Historical data
   */
  async getSystemHistory(systemId, hours = 24) {
    try {
      const response = await axios.get(`${API_URL}/api/pv-systems/${systemId}/history`, {
        params: { hours }
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting system ${systemId} history:`, error);
      throw error;
    }
  },

  /**
   * Get current PV systems configuration
   * @returns {Promise} - Configuration details
   */
  async getConfig() {
    try {
      const response = await axios.get(`${API_URL}/api/pv-systems/config`);
      return response.data;
    } catch (error) {
      console.error('Error getting PV config:', error);
      throw error;
    }
  }
};

export default pvMonitoringService;
