// routes/CompanyGuard.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";
import { useEffect, useState } from "react";

export default function CompanyGuard() {
  const { user, isLoading, initAuth } = useAuth();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Check if company is selected from localStorage as fallback
  const selectedCompanyFromStorage = localStorage.getItem("selectedCompany");
  const company = user?.company || (selectedCompanyFromStorage ? JSON.parse(selectedCompanyFromStorage) : null);

  useEffect(() => {
    // Debug logging for production issues
    console.log("🔐 CompanyGuard state:", {
      isLoading,
      hasUserCompany: !!user?.company,
      hasStoredCompany: !!selectedCompanyFromStorage,
      retryCount,
      resolvedCompany: !!company,
    });
  }, [isLoading, user?.company, selectedCompanyFromStorage, retryCount, company]);

  useEffect(() => {
    // If no company and auth is loaded, try to reinitialize auth
    if (!company && !isLoading && retryCount < maxRetries) {
      console.log(`⚠️  No company found. Retrying auth (attempt ${retryCount + 1}/${maxRetries})...`);
      setRetryCount((prev) => prev + 1);
      // Delay before retrying to avoid infinite loops
      const timer = setTimeout(() => {
        initAuth?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [!company && !isLoading, retryCount, company, isLoading, initAuth]);

  if (isLoading) {
    return <LoadingComponent fullPage />;
  }

  // No company → force selection
  if (!company) {
    console.error(
      "❌ CompanyGuard: No company found after all retries. Redirecting to /company/select",
      { user: user?._id, companies: user?.companies?.length }
    );
    return <Navigate to="/company/select" replace />;
  }

  return <Outlet />;
}

