import axios from "axios";

export const fetchMe = async (token) => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/fetchMe`, {
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log("fetchMe response:", res);
  return res.data;
};
