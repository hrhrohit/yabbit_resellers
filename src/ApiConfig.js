// src/api/apiCalls.js
import axios from 'axios';

const API_BASE_URL = 'https://core1-sandbox.yabbit.com.au/ns-api/v2';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDomains = async (accessToken) => {
  try {
    const response = await apiClient.get('/domains', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching domains:', error);
    throw error;
  }
};

// Add more API calls here as needed
