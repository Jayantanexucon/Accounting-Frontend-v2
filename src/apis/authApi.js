import axios from "axios";

export const fetchMe = async (token) => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/fetchMe`, {
    withCredentials: true,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return res.data;
};
