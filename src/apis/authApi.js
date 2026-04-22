import axios from "axios";

export const fetchMe = async (token) => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/fetchMe`, {
      withCredentials: true,
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    console.log("📡 fetchMe response:", {
      userId: res.data?.user?._id,
      selectedCompanyId: res.data?.selectedCompany?._id,
      selectedCompanyName: res.data?.selectedCompany?.name,
      companiesCount: res.data?.companies?.length,
    });
    
    return res.data;
  } catch (error) {
    console.error("❌ fetchMe error:", error.response?.data || error.message);
    throw error;
  }
};
