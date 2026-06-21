import axiosInstance from "./axiosInstance";\nexport const getTracking = (id) => axiosInstance.get(`/tracking/${id}`);
