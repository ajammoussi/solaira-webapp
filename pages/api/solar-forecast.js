import axios from 'axios';

import { SOLAR_FORECAST_SERVICE_URL } from '../../lib/config/env';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await axios.post(`${SOLAR_FORECAST_SERVICE_URL}/forecast/`, req.body);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Solar Forecast Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({
      message: 'Error fetching forecast from backend',
      error: error.message,
    });
  }
}
