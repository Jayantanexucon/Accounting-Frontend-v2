import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";

export default function GuestRoute() {
  const { user, isLoading } = useAuth();
  return !isLoading ? (
    user?.email ? (
      <Navigate to={"/"} replace />
    ) : (
      <Outlet />
    )
  ) : (
    <LoadingComponent fullPage={true} />
  );
}
