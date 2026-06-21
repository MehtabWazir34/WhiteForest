import axiosInstance from "./axiosInstance";\nexport const getCart = () => axiosInstance.get("/cart");
