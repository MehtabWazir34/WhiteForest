import axiosInstance from "./axiosInstance";\nexport const applyCoupon = (code) => axiosInstance.post("/coupons/apply", { code });
