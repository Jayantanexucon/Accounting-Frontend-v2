import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, Slide } from "react-toastify";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScrollToTop from "./modals/ScrollToTop";
import { useForceLogout } from "./utils/useForceLogout";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./modules/notification/notification.slice.jsx";
import { FinancialYearProvider } from "./contexts/FinancialYearContext";

export default function App() {
  useForceLogout();
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        closeOnClick
        draggable
        pauseOnHover
        transition={Slide}
        toastClassName={() => "bg-white dark:bg-neutral-900 shadow-lg rounded-xl p-4 flex items-center gap-3 border border-gray-200 dark:border-neutral-700"}
        bodyClassName={() => "text-gray-800 dark:text-gray-200 font-medium text-sm"}
        progressClassName="bg-blue-500"
      />
      <Router>
        <ScrollToTop />
        <AuthProvider>
          <FinancialYearProvider>
            <SocketProvider>
              <NotificationProvider>
                <AppRoutes />
              </NotificationProvider>
            </SocketProvider>
          </FinancialYearProvider>
        </AuthProvider>
      </Router>
    </>
  );
}
