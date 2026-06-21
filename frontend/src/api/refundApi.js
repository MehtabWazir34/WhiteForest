import axiosInstance from "./axiosInstance";\nexport const requestRefund = (data) => axiosInstance.post("/refunds", data);
