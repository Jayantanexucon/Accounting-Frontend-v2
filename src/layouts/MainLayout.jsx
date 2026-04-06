// import { Outlet } from "react-router-dom";
// import NavbarComponent from "../components/NavbarComponent";
// import FooterComponent from "../components/FooterComponent";

// export default function MainLayout() {
//   return (
//     <>
//       {/* Sidebar */}
//       <aside className="w-60  ">
//         <NavbarComponent />
//       </aside>

//       {/* Main Content Area */}
//       <div className="flex flex-col min-h-screen ml-60">
//         <main className="flex-1">
//           <Outlet />
//         </main>

//         <footer className="h-10">
//           <FooterComponent />
//         </footer>
//       </div>
//     </>
//   );
// }

// MainLayout.jsx
import { Outlet } from "react-router-dom";
import NavbarComponent from "../components/NavbarComponent";
import FooterComponent from "../components/FooterComponent";

export default function MainLayout() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Mesh Gradients - Subtly enhanced for premium feel */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-inherit">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-blue-500/5 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] right-[15%] w-[25%] h-[25%] bg-slate-200/30 rounded-full blur-[100px]"></div>
      </div>

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 z-40">
        <NavbarComponent />
      </aside>

      {/* Main Content Area */}
      <div
        className="flex flex-col min-h-screen transition-all duration-500 ease-in-out"
        style={{ marginLeft: "16rem" }} // Default expanded
        id="main-content"
      >
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>

        <footer className="py-6 px-8 border-t border-slate-200/50">
          <FooterComponent />
        </footer>
      </div>
    </div>
  );
}
