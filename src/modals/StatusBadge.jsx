import { CheckCircle, XCircle } from "lucide-react";

export default function StatusBadge({ isBlocked }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isBlocked ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
      {isBlocked ? (
        <>
          <XCircle className="w-4 h-4 mr-1" />
          Blocked
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 mr-1" />
          Active
        </>
      )}
    </span>
  );
}
