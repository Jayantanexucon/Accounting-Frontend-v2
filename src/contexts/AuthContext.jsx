// import { createContext, useContext, useState, useEffect } from "react";
// import { getCookie, removeCookie, setCookie } from "../utils/cookieUtil";
// import { accessApi } from "../apis/authApi";

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState({});
//   const [isLoading, setLoading] = useState(true);

//   useEffect(() => {
//     const controller = new AbortController();

//     async function verifyToken() {
//       try {
//         setLoading(true);

//         const res = await accessApi(controller.signal);
//         const companyCookie = getCookie("AC_CMP");
//         if (!companyCookie) {
//           setUser({});
//           throw new Error("No company cookie");
//         }
//         const companies = res.data.company || [];
//         const company = companies.find((c) => c._id === companyCookie);
//         const privilege =
//           company?.owner === res.data.user._id
//             ? {}
//             : company.employees.find((e) => e.user === res.data.user._id)
//                 .privilege;
//         if (companyCookie && !company) {
//           removeCookie("AC_CMP");
//           setUser({});
//           throw new Error("Invalid company selected");
//         }
//         setUser({
//           ...res.data.user,
//           company,
//           companyList: companies,
//           privilege,
//         });
//       } catch (error) {
//         console.error("verify error:", error);
//         setUser({});
//       } finally {
//         setLoading(false);
//       }
//     }

//     verifyToken();
//     return () => controller.abort();
//   }, []);

//   const value = {
//     user,
//     setUser,
//     isLoading,
//   };
//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error("useAuth must be used within AuthProvider");
//   return context;
// };
import { createContext, useContext, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

import { setAuthToken } from "../apis/api";

import { loginRequest } from "../authConfig";
import { fetchMe } from "../apis/authApi";
import { useNavigate } from "react-router-dom";
import { getEntitiesApi } from "../apis/entityApi";
import { hasPermission as checkUserPermission } from "../utils/permissionUtils";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [entities, setEntities] = useState([]);

  const navigator = useNavigate();
  const initAuth = async () => {
    try {
      setLoading(true);

      if (!accounts.length) {
        console.warn("⚠️  No Azure AD accounts found");
        setUser(null);
        return;
      }

      // 🔑 Get Azure AD access token
      const tokenRes = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      // 📡 Call backend (/me)
      const data = await fetchMe(tokenRes.accessToken);
      console.log("📡 Backend /me response:", {
        userId: data?.user?._id,
        companiesCount: data?.companies?.length,
        hasSelectedCompany: !!data?.selectedCompany,
        selectedCompanyId: data?.selectedCompany?._id,
      });

      const appAccessToken = data?.accessToken;

      if (appAccessToken) {
        setAuthToken(appAccessToken);
        localStorage.setItem("token", appAccessToken);
      } else {
        setAuthToken(null);
        localStorage.removeItem("token");
      }

      const companies = data.companies || [];
      const selectedCompany = data.selectedCompany || null;

      let privilege = {};
      if (selectedCompany) {
        if (selectedCompany.owner !== data.user._id) {
          const emp = selectedCompany.employees.find((e) => e.user === data.user._id);
          privilege = emp?.privilege || {};
        }
      }

      if (selectedCompany) {
        localStorage.setItem("selectedCompany", JSON.stringify(selectedCompany));
        console.log("✅ Selected company set from backend:", {
          name: selectedCompany.name,
          id: selectedCompany._id,
        });
      } else {
        localStorage.removeItem("selectedCompany");
        console.warn("⚠️  No selected company returned from backend", {
          companiesCount: companies.length,
          firstCompany: companies[0]?.name,
        });
      }

      let entityCatalog = [];
      try {
        const entityResponse = await getEntitiesApi();
        entityCatalog = entityResponse?.data || [];
        setEntities(entityCatalog);
        localStorage.setItem("entityCatalog", JSON.stringify(entityCatalog));
      } catch (entityError) {
        console.error("❌ Failed to load entity catalog:", entityError);
        setEntities([]);
        localStorage.removeItem("entityCatalog");
      }

      setCompany(selectedCompany);
      setUser({
        ...data.user,
        company: selectedCompany,
        companies: companies,
        privilege,
      });
    } catch (err) {
      console.error("❌ Azure auth init failed:", err);
      navigator("/accessDenied");
      setUser(null);
      setCompany(null);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();

    initAuth();
    return () => controller.abort();
  }, [accounts, instance]);

  const logout = async () => {
    setAuthToken(null);
    setUser(null);
    setCompany(null);
    setEntities([]);
    localStorage.removeItem("entityCatalog");
    await instance.logoutRedirect();
  };

  const hasPermission = (module, action = "VIEW", options = {}) =>
    checkUserPermission({
      user,
      entities,
      module,
      action,
      companyId: options.companyId || company?._id,
      entityId: options.entityId,
    });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        setUser,
        initAuth,
        company,
        setCompany,
        entities,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
