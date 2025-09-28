// Helper function to get auth headers for API requests
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("consentiq_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Enhanced fetch wrapper that includes auth headers
export const authenticatedFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
};