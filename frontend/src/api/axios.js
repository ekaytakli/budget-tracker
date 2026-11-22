import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token && !["/auth/login", "/auth/register"].includes(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/auth/login", "/auth/register"].includes(error.config?.url)
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);
