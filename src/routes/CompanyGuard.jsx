// routes/CompanyGuard.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";

export default function CompanyGuard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingComponent fullPage />;
  }

  // console.log("Company guard ", user);
  // No company yet → force selection
  if (!user || !user.company) {
    return <Navigate to="/company/select" replace />;
  }

  return <Outlet />;
}
