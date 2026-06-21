import axiosInstance from "./axiosInstance";\nexport const pay = (data) => axiosInstance.post("/payments", data);
