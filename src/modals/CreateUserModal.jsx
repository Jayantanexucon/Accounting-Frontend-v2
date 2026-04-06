import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { useEffect } from "react";

function CreateUserModal({ isOpen, onClose, onSubmit, user }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
    const [role, setRole] = useState("user");
    const isEditMode = Boolean(user);


  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setRole("user");
    }
  }, [isOpen]);
    
    useEffect(() => {
      if (user && isOpen) {
        setName(user.name || "");
        setEmail(user.email || "");
        setRole(user.role || "user");
      }
    }, [user, isOpen]);


  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
   onSubmit(isEditMode ? { id: user._id, payload: { name, email, role } } : { payload: { name, email, role } });

  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{isEditMode ? "Edit User" : "Create New User"}</h2>

          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="John Doe" />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="john@nexucon.com" />
            <p className="text-xs text-gray-500 mt-1">Only @nexucon.com email allowed</p>
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg">
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {isEditMode ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateUserModal;
