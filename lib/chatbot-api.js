

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/**
 * Send a message to the chatbot API
 * @param {string} message - The user's message
 * @param {string} userId - The user's ID
 * @param {Object} energyData - Optional energy data object
 * @returns {Promise<Object>} Response object with response and error fields
 */
export async function sendChatMessage(message, userId, energyData = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id: userId,
        energy_data: energyData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Check API health status
 * @returns {Promise<boolean>} True if API is healthy
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}