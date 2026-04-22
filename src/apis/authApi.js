import axios from "axios";

export const fetchMe = async (token) => {
  try {
    // 🔍 DEBUG: Log cookies being sent
    const cookieString = document.cookie;
    const acCmpCookie = cookieString.split('; ').find(row => row.startsWith('AC_CMP='));
    console.log("🍪 Cookies being sent with fetchMe request:", {
      allCookies: cookieString,
      AC_CMP_value: acCmpCookie ? acCmpCookie.split('=')[1] : "NOT FOUND",
    });

    const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/fetchMe`, {
      withCredentials: true,
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

    // 🔍 DEBUG: Check if company changed after reload
    const storedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
    if (storedCompany._id && storedCompany._id !== res.data?.selectedCompany?._id) {
      console.error("⚠️ MISMATCH: localStorage has different company than backend!", {
        localStorage: storedCompany._id,
        backend: res.data?.selectedCompany?._id,
      });
    }
    
    return res.data;
  } catch (error) {
    console.error("❌ fetchMe error:", error.response?.data || error.message);
    throw error;
  }
};
