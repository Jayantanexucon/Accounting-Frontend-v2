// routes/CompanyGuard.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";
import { useEffect, useState } from "react";

export default function CompanyGuard() {
  const { user, isLoading, initAuth } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Check if company is selected from localStorage as fallback
  const selectedCompanyFromStorage = localStorage.getItem("selectedCompany");
  const company = user?.company || (selectedCompanyFromStorage ? JSON.parse(selectedCompanyFromStorage) : null);

  useEffect(() => {
    // If no company and auth is loaded, try to reinitialize auth once
    if (!company && !isLoading && retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      // Give the auth context a chance to re-fetch company info
      initAuth?.();
    }
  }, [!company && !isLoading, retryCount, company, isLoading, initAuth]);

  if (isLoading) {
    return <LoadingComponent fullPage />;
  }

  // No company → force selection
  if (!company) {
    return <Navigate to="/company/select" replace />;
  }

  return <Outlet />;
}
