// import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from "../contexts/AuthContext";
// import LoadingComponent from "../components/LoadingComponent";

// export default function ProtectedRoutes({ allowedRoles = [], access = true }) {
//   const { user, isLoading } = useAuth();

//   if (isLoading) return <LoadingComponent fullPage={true} />;

//   if (!user?.email) {
//     return <Navigate to="/login" replace />;
//   }

//   if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
//     return <Navigate to="*" replace />;
//   }

//   if (!access) {
//     return <Navigate to="*" replace />;
//   }

//   return <Outlet />;
// }

import { Navigate, Outlet } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";

export default function ProtectedRoutes({ allowedRoles = [], access = true }) {
  const { accounts, inProgress } = useMsal(); // Azure AD auth state
  const { user, isLoading } = useAuth();

  // // console.log("AZURE ACCOUNTS",accounts,inProgress)
  // // console.log(user)

  // ⏳ Still resolving auth
  // console.log(isLoading,"LOADING>>>>",inProgress)
  if (isLoading || inProgress != "none") {
    return <LoadingComponent fullPage={true} />;
  }

  // 🔐 Not authenticated with Azure AD
  if (!accounts || accounts.length === 0) {
    return <Navigate to="/login" replace />;
  }

  // 🧍 Authenticated but user not provisioned yet
  if (!user) {
    return <LoadingComponent fullPage={true} />;
  }

  // 🛂 Role-based access (DB or Azure roles)
  if (allowedRoles.length) {
    const userRoles = user.roles || user.role ? [user.role] : [];

    const hasAccess = allowedRoles.some((r) => userRoles.includes(r));

    if (!hasAccess) {
      return <Navigate to="/403" replace />;
    }
  }

  // 🚫 Feature-level access flag
  if (!access) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
