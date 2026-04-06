
import { Trash2, Folder } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";

export default function GroupTable({ groups, onEdit, onDelete }) {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g._id} className="flex items-center justify-between bg-gray-150 border border-gray-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
              <Folder className="w-5 h-5 text-gray-600" />
            </div>

            <div>
              <p className="text-base font-semibold text-gray-900">{g.name}</p>
              <p className="text-sm text-gray-500">
                {g.nature} · {g.balanceType}
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            {/* EDIT — REPLACED */}
            {checkAuthorization(user, "GROUPS", "EDIT") && (
              <button onClick={() => onEdit(g)} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600">
                  {/* Open square (top-right open) */}
                  <path d="M4 8V5a1 1 0 0 1 1-1h4" />
                  <path d="M19 10v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8" />

                  {/* Pencil dipped from top-right */}
                  <path d="M14.5 5.5l4 4" />
                  <path d="M9 16l1.5-4.5L16 6a1.5 1.5 0 0 1 2.1 2.1L12.6 13.6 9 16z" />
                </svg>
              </button>
            )}
            {/* DELETE */}
            {checkAuthorization(user, "GROUPS", "DELETE") && (
              <button onClick={() => onDelete(g._id)} className="p-2 rounded hover:bg-gray-100 transition" title="Delete">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}  
          </div>
        </div>
      ))}
    </div>
  );
}





