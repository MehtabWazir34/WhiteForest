export const loadGuestToken = () => localStorage.getItem("guestToken");\nexport const saveGuestToken = (token) => localStorage.setItem("guestToken", token);
