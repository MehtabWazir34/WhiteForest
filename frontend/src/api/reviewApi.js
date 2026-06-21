import axiosInstance from "./axiosInstance";\nexport const postReview = (data) => axiosInstance.post("/reviews", data);
