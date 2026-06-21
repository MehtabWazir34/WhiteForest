import axiosInstance from "./axiosInstance";\nexport const createBooking = (data) => axiosInstance.post("/bookings", data);
