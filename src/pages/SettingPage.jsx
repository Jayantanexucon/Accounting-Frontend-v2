import React, { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { useMsal } from "@azure/msal-react";
import { LogOut, User, Building, Mail, Phone, Calendar, MapPin, Shield, IdCard, Globe, Briefcase, Users, AlertCircle } from "lucide-react";

export default function SettingPage() {
  const { user } = useAuth();
  const { instance } = useMsal();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("selectedCompany");
      localStorage.clear();
      await instance.logoutRedirect();
      setShowLogoutConfirm(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Logout failed. Please try again.");
      console.error("Logout failed:", error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-fade-in">
            <div className="p-6">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertCircle className="text-white" size={32} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Confirm Logout</h3>

              {/* Description */}
              <div className="text-center mb-6">
                <p className="text-gray-600">Are you sure you want to logout?</p>
                <p className="text-sm text-gray-500 mt-1">You'll need to sign in again to access your account.</p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-5 py-3 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 shadow-sm hover:shadow"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-5 py-3 text-white font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Logout Now
                </button>
              </div>
            </div>

            {/* Footer Note */}
            <div className="border-t border-gray-200 px-6 py-3">
              <p className="text-xs text-center text-gray-500">This action will end your current session</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">View and manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <User className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                <p className="text-gray-600">Your personal details</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* User Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <IdCard className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="text-gray-900 font-medium capitalize">{user?.name || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="text-gray-900 font-medium">{user?.email || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="text-gray-900 font-medium">{user?.role || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Phone className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900 font-medium">{user?.phone || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Calendar className="text-red-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="text-gray-900 font-medium">{formatDate(user?.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Globe className="text-cyan-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="text-gray-900 font-medium text-sm font-mono">{user?._id || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <Building className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Company Information</h2>
                <p className="text-gray-600">Your organization details</p>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Company Details */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Briefcase className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="text-gray-900 font-medium">{user?.company?.name || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company ID</p>
                    <p className="text-gray-900 font-medium text-sm font-mono">{user?.company?._id || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Company Location */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Region</p>
                    <p className="text-gray-900 font-medium">India</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Building className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-gray-900 font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Logo Preview */}
            {user?.company?.logo && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Company Logo</h3>
                <div className="flex items-center gap-4">
                  <img src={user.company.logo} alt="Company Logo" className="w-16 h-16 rounded-lg border border-gray-200 object-cover shadow-sm" />
                  <div>
                    <p className="text-sm text-gray-600">Logo uploaded</p>
                    <p className="text-xs text-gray-500">Contact admin to update</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Session Management</h3>
              <p className="text-gray-600">End your current session securely</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 min-w-[180px]"
            >
              <LogOut size={18} />
              Logout Account
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="text-center">
          <p className="text-sm text-gray-500">For changes to your information, please contact your system administrator</p>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>User ID: {user?._id?.substring(0, 8)}...</span>
            <span>•</span>
            <span>Session: Active</span>
            <span>•</span>
            <span>Version: 1.0.0</span>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
}
