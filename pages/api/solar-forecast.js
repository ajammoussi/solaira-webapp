import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Proxy to the Python backend running on port 8002
    const response = await axios.post('http://localhost:8002/forecast/', req.body);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Solar Forecast Proxy Error:', error.message);
    res.status(error.response?.status || 500).json({ 
      message: 'Error fetching forecast from backend',
      error: error.message 
    });
  }
}
