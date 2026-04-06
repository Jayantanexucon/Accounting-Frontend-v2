import { Shield, User } from "lucide-react";

export default function RoleBadge({ isAdmin }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isAdmin ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
      {isAdmin ? (
        <>
          <Shield className="w-4 h-4 mr-1" />
          Admin
        </>
      ) : (
        <>
          <User className="w-4 h-4 mr-1" />
          User
        </>
      )}
    </span>
  );
}
