import axiosInstance from "./axiosInstance";\nexport const getInvoice = (id) => axiosInstance.get(`/invoices/${id}`);
