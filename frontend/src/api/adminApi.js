import axiosInstance from "./axiosInstance";\nexport const getAdminDashboard = () => axiosInstance.get("/admin/dashboard");
