import React from "react";
import { User, Mail, Shield, CheckCircle, XCircle, Calendar, X } from "lucide-react";

export default function UserQuickView({ open, onClose, user }) {
  if (!open || !user) return null;

  const userData = user.user;
  const privilege = user.privilege || {};

  if (!userData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-neutral-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900">{userData.name}</h3>
                <p className="text-neutral-600">{userData.role || "User"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-neutral-900">Personal Information</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">Email</p>
                  <p className="text-neutral-900">{userData.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">Role</p>
                  <div className="flex items-center gap-2">
                    {privilege.masterUpdate ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Shield className="w-3 h-3 mr-1" />
                        Administrator
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <User className="w-3 h-3 mr-1" />
                        Standard User
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-neutral-400" />
                <div>
                  <p className="text-sm text-neutral-500">Created At</p>
                  <p className="text-neutral-900">{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {userData.isBlocked ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />}
                <div>
                  <p className="text-sm text-neutral-500">Status</p>
                  <p className={`font-medium ${userData.isBlocked ? "text-red-600" : "text-green-600"}`}>{userData.isBlocked ? "Blocked" : "Active"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privileges Section */}
          <div className="pt-6 border-t border-neutral-200">
            <h4 className="font-semibold text-neutral-900 mb-4">User Privileges</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-neutral-900">Master Update</p>
                    <p className="text-sm text-neutral-500">Can modify system settings</p>
                  </div>
                </div>
                {privilege.masterUpdate ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
