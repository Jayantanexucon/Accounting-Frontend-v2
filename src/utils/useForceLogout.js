// src/hooks/useForceLogout.js
import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { toast } from "react-toastify"; // or however you show toasts

export const useForceLogout = () => {
  const { instance } = useMsal();

  useEffect(() => {
    const handleForceLogout = async (event) => {
      const { reason } = event.detail;

      const message =
        reason === "blocked"
          ? "Your account has been blocked by the administrator."
          : "Your session has expired. Please log in again.";

      toast.error(message, { toastId: "force-logout" }); 

      try {
        await instance.logoutRedirect();
      } catch (err) {
        console.error("Force logout failed:", err);
        // Fallback: hard redirect to login
        window.location.href = "/";
      }
    };

    window.addEventListener("force-logout", handleForceLogout);
    return () => window.removeEventListener("force-logout", handleForceLogout);
  }, [instance]);
};