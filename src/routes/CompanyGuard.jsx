// routes/CompanyGuard.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";
import { useEffect } from "react";

export default function CompanyGuard() {
  const { user, isLoading } = useAuth();

  // Debug logging
  useEffect(() => {
    if (!isLoading) {
      console.log("🔐 CompanyGuard:", {
        hasUser: !!user,
        hasUserCompany: !!user?.company,
        companyName: user?.company?.name,
        companiesCount: user?.companies?.length,
      });
    }
  }, [isLoading, user?.company, user?.companies]);

  if (isLoading) {
    return <LoadingComponent fullPage />;
  }

  // No user or no company → force selection
  if (!user || !user.company) {
    console.error("❌ CompanyGuard: User or company missing", {
      hasUser: !!user,
      hasCompany: !!user?.company,
    });
    return <Navigate to="/company/select" replace />;
  }

  return <Outlet />;
}

