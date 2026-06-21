import axiosInstance from "./axiosInstance";\nexport const getFood = () => axiosInstance.get("/food");
