export default function FooterComponent() {
  return (
    <div className="w-full h-full flex items-center justify-center text-sm backdrop-blur-md shadow-sm tracking-wide">
      <span className="opacity-80">
        © 2026 {import.meta.env.VITE_APP_NAME || "Nexucon Consultancy Services Private Limited"} • All Rights
        Reserved
      </span>
    </div>
  );
}
