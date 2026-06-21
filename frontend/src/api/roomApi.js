import axiosInstance from "./axiosInstance";\nexport const getRooms = () => axiosInstance.get("/rooms");
