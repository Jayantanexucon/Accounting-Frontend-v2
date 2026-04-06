import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import AllLucideIcons from "../components/LucideIcons";
import { useEffect } from "react";

export default function EntityModal({
  isOpen,
  onClose,
  parent,
  editEntity, // 👈 add
  handleSubmit,
  theme = "light",
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [isNavItem, setIsNavItem] = useState(false);
  const [navLink, setNavLink] = useState("");
  const [system, setSystem] = useState(false);

  useEffect(() => {
    if (editEntity) {
      setName(editEntity.name);
      setKey(editEntity.key);
      setIsNavItem(editEntity.isNavItem);
      setNavLink(editEntity.navLink || "");
      setSystem(editEntity.isSystem);
    } else {
      setName("");
      setKey("");
      setIsNavItem(false);
      setNavLink("");
      setSystem(false);
    }
  }, [editEntity]);

  if (!isOpen) return null;

  // // console.log(parent);

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className={`w-full max-w-lg rounded-xl shadow-xl ${isDark ? "bg-black text-white" : "bg-white text-black"}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          <h2 className="text-lg font-semibold">{editEntity ? "Edit Entity" : "Create Entity"}</h2>

          <button onClick={onClose}>
            <X className="w-5 h-5 opacity-70 hover:opacity-100" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(name, key, isNavItem, navLink, parent ? parent?._id : null, system, editEntity?._id || null);
          }}
          className="p-6 space-y-4"
        >
          {/* Name */}
          <div>
            <label className="text-sm">Name</label>
            <input
              name="name"
              value={name}
              required
              placeholder="Journal, Ledger, Dashboard"
              className={`w-full mt-1 px-3 py-2 rounded-md border outline-none ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`}
              onChange={(e) => {
                setName(e.target.value);
                if (!editEntity) setKey(e.target.value.toUpperCase());
              }}
            />
          </div>

          {/* Key */}
          <div>
            <label className="text-sm">Key</label>
            <input
              name="key"
              required
              value={key}
              placeholder="JOURNAL, LEDGER, DASHBOARD"
              className={`w-full mt-1 px-3 py-2 rounded-md border outline-none ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`}
              disabled="true"
            />
          </div>
          {/* System */}
          <div className="flex items-center gap-3">
            <input type="checkbox" name="system" checked={system} onChange={(e) => setSystem(e.target.checked)} className="w-4 h-4 cursor-pointer" />
            <span className="text-sm">System</span>
          </div>

          {/* Nav Item */}
          <div className="flex items-center gap-3">
            <input type="checkbox" name="isNavItem" checked={isNavItem} onChange={(e) => setIsNavItem(e.target.checked)} className="w-4 h-4 cursor-pointer" />
            <span className="text-sm">Show in Navigation</span>
          </div>

          {/* Nav Link */}
          {isNavItem && (
            <div>
              <label className="text-sm">Navigation Link</label>
              <input
                required={isNavItem}
                name="navLink"
                onChange={(e) => setNavLink(e.target.value)}
                placeholder="/dashboard, /finance"
                className={`w-full mt-1 px-3 py-2 rounded-md border outline-none ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`}
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className={`px-4 py-2 rounded-md ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300"}`}>
              Cancel
            </button>

            <button type="submit" className="px-5 py-2 bg-black   hover:bg-neutral-700 text-white rounded-md">
              Save Entity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
