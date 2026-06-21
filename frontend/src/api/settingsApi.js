import axiosInstance from "./axiosInstance";\nexport const getSettings = () => axiosInstance.get("/settings");
