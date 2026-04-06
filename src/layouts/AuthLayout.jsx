import { Outlet } from "react-router-dom";
import FooterComponent from "../components/FooterComponent";

export default function AuthLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="h-10">
        <FooterComponent />
      </footer>
    </div>
  );
}
