import axios from 'axios';

const API_BASE_URL = 'https://core1-sandbox.yabbit.com.au/ns-api/v2';
const TIMEOUT = 30000; // 30 seconds

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (accessToken) => {
  if (accessToken) {
    apiClient.defaults.headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    delete apiClient.defaults.headers['Authorization'];
  }
};

// Retry logic
const retryDelay = (retryNumber = 0) => {
  const delays = [1000, 2000, 3000, 5000];
  return delays[retryNumber] || delays[delays.length - 1];
};

const retryRequest = (apiCall, retries = 3) => {
  return new Promise((resolve, reject) => {
    const attempt = async (attemptNumber) => {
      try {
        const response = await apiCall();
        resolve(response);
      } catch (error) {
        if (attemptNumber <= retries) {
          console.log(`Attempt ${attemptNumber} failed. Retrying...`);
          setTimeout(() => attempt(attemptNumber + 1), retryDelay(attemptNumber));
        } else {
          reject(error);
        }
      }
    };
    attempt(1);
  });
};

// API calls with retry logic
export const getResellers = () => retryRequest(() => apiClient.get('/resellers'));
export const getDomains = () => retryRequest(() => apiClient.get('/domains'));
export const getUserCount = (domain) => retryRequest(() => apiClient.get(`/domains/${domain}/users/count`));
export const getUser = (domain) => retryRequest(() => apiClient.get(`/domains/${domain}/users`));
export const getCallqueues = (domain) => retryRequest(() => apiClient.get(`/domains/${domain}/callqueues`));
export const getDomainInfo = (domain) => retryRequest(() => apiClient.get(`/domains/${domain}`));
export const getDeviceCount = (domain, user) => retryRequest(() => apiClient.get(`/domains/${domain}/users/${user}/devices/count`));
export const getDomainMeetings = (domain, user) => retryRequest(() => apiClient.get(`/domains/${domain}/users/${user}/meetings/count`));
export const getAutoAttendents = (domain) => retryRequest(() => apiClient.get(`/domains/${domain}/autoattendants`));
export const getCallHistory = (domain, startDate, endDate) => retryRequest(() => 
  apiClient.get(`/domains/${domain}/cdrs`, {
    params: {
      'datetime-start': startDate,
      'datetime-end': endDate
    }
  })
);

export default apiClient;
