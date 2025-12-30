import axios from "axios";

export const api = axios.create({
  baseURL: "/api/crm", 
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // Do NOT attach Authorization for login/auth
    if (token && config.url && !config.url.includes("/auth/")) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
