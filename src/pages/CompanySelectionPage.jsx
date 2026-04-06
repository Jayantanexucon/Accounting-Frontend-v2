// pages/CompanySelectionPage.jsx
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useMsal } from "@azure/msal-react";
import { Building2, Users, ChevronRight, LogOut, Shield, UserCog, Briefcase, Plus, Edit } from "lucide-react";
import CompanyModal from "../modals/CompanyCreationModal";
import { createCompanyApi, updateCompanyApi } from "../apis/userApi";
import { Eye } from "lucide-react";
import CompanyDetailsModal from "../modals/CompanyDetailsModal";
import { isAdmin, isSuperAdmin } from "../utils/roleUtil";
import { removeCookie, setCookie } from "../utils/cookieUtil";

function CompanySelectionPage() {
  const { user, setUser, setCompany } = useAuth();
  const { instance } = useMsal();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState(null);

  const handleShowDetails = (company, e) => {
    e.stopPropagation();
    setSelectedCompanyDetails(company);
    setDetailsModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      localStorage.removeItem("selectedCompany");
      removeCookie("AC_CMP");
      await instance.logoutRedirect();
    } catch (error) {
      toast.error("Logout failed. Please try again.");
      console.error(error);
    }
  };

  const handleSelect = (company) => {
    setCookie("AC_CMP", company._id);
    setUser((prev) => ({ ...prev, company }));
    setCompany(company);
    localStorage.setItem("selectedCompany", JSON.stringify(company));
    navigate("/", { replace: true });
  };

  const handleUserManagement = () => {
    navigate("/user-management");
  };

  const handleCreateCompany = () => {
    setModalMode("create");
    setSelectedCompany(null);
    setModalOpen(true);
  };

  const handleEditCompany = (company, e) => {
    e.stopPropagation();
    setModalMode("edit");
    setSelectedCompany(company);
    setModalOpen(true);
  };

  /**
   * 🔹 CLEAN SUBMIT HANDLER
   * No fetch, no URL logic, no headers here
   */
  const handleCompanySubmit = async (formData) => {
    setLoading(true);

    try {
      let response;

      if (modalMode === "create") {
        response = await createCompanyApi(formData);

        const newCompany = response.data;

        setUser((prev) => ({
          ...prev,
          companies: [...prev.companies, newCompany],
        }));

        toast.success("Company created successfully!");
      } else {
        response = await updateCompanyApi(selectedCompany._id, formData);

        setUser((prev) => ({
          ...prev,
          companies: prev.companies.map((c) => (c._id === selectedCompany._id ? { ...c, ...formData } : c)),
        }));

        toast.success("Company updated successfully!");
      }

      setModalOpen(false);
    } catch (error) {
      console.error("Company save failed:", error);
      toast.error(error?.response?.data?.message || "Failed to save company");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI BELOW (UNCHANGED) -------------------- */

  // if (!user?.companies?.length) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
  //       <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
  //         <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
  //           <Building2 className="w-10 h-10 text-gray-400" />
  //         </div>
  //         <h1 className="text-2xl font-bold text-gray-900 mb-3">No Companies Found</h1>
  //         <p className="text-gray-600 mb-8">You don't have access to any company.</p>

  //         {isAdmin(user)&& (
  //           <button onClick={handleCreateCompany} className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg mb-4">
  //             <Plus className="w-4 h-4 inline mr-2" />
  //             Create Your First Company
  //           </button>
  //         )}

  //         <button onClick={handleLogout} className="w-full px-6 py-3 border rounded-lg">
  //           <LogOut className="w-4 h-4 inline mr-2" />
  //           Logout
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-300/30 via-slate-200/50 to-slate-300 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl  rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Select Company Workspace
                </h1>
                <p className="text-gray-300 mt-1">
                  Choose a company to access your dashboard
                </p>
              </div>
            </div>

              <div className="flex flex-wrap gap-3">
                {isAdmin(user)&& (
                  <>
                    <button
                      onClick={handleCreateCompany}
                      className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white 
                               rounded-xl transition-all duration-200 flex items-center gap-3
                               text-sm font-semibold backdrop-blur-sm border border-blue-500/30
                               hover:shadow-lg hover:scale-105 group"
                    >
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                      <span>Create Company</span>
                    </button>
                    <button
                      onClick={handleUserManagement}
                      className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white 
                               rounded-xl transition-all duration-200 flex items-center gap-3
                               text-sm font-semibold backdrop-blur-sm border border-white/20
                               hover:shadow-lg hover:scale-105 group"
                    >
                      <UserCog className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Manage Users</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 
                            rounded-full flex items-center justify-center shadow-md"
                >
                  <span className="text-white font-bold text-lg">{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-lg">{user?.name || user?.email}</p>
                    {isAdmin(user) && (
                      <span
                        className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 
                                 text-blue-300 rounded-full text-xs font-medium"
                      >
                        <Shield className="w-3 h-3" />
                        Administrator
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm mt-1">{user?.email}</p>
                </div>
              </div>

              <div className="hidden md:block text-right">
                <p className="text-gray-300 text-sm">Available companies</p>
                <p className="text-white text-2xl font-bold">{user.companies.length}</p>
              </div>
            </div>
          </div>

          {/* Company List */}
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Companies</h2>
              <p className="text-gray-600">Select a company to continue to your workspace</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user.companies.map((company) => (
                <div key={company._id} className="group relative">
                  {isAdmin(user) && (
                    <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={(e) => handleEditCompany(company, e)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-300 shadow-sm 
                  hover:bg-white hover:shadow-md hover:scale-105 active:scale-95 
                  transition-all duration-200"
                        title="Edit Company"
                      >
                        <Edit className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => handleShowDetails(company, e)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-blue-200 shadow-sm
                  hover:bg-white hover:shadow-md hover:scale-105 active:scale-95 
                  transition-all duration-200"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleSelect(company)}
                    className="w-full h-full group relative p-6 rounded-xl border border-gray-200
                             text-left transition-all duration-300
                             hover:border-gray-300 hover:shadow-xl hover:scale-[1.02]
                             focus:outline-none focus:ring-2 focus:ring-gray-900/20
                             bg-white hover:bg-gradient-to-br hover:from-white hover:to-gray-50"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <div
                          className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 
                                    rounded-xl flex items-center justify-center mb-4 
                                    group-hover:from-gray-200 group-hover:to-gray-300
                                    transition-all duration-300"
                        >
                          <Building2 className="w-7 h-7 text-gray-600" />
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">{company.name}</h3>

                        <p className="text-sm text-gray-600 mb-3">
                          ID: <span className="font-mono">{company._id?.slice(-8).toUpperCase() || "N/A"}</span>
                        </p>

                        {company.description && <p className="text-sm text-gray-500 line-clamp-2 mb-4">{company.description}</p>}

                        {company.userCount && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Users className="w-4 h-4" />
                            <span>{company.userCount} members</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 group-hover:border-gray-200">
                        <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Select Company</span>
                        <ChevronRight
                          className="w-5 h-5 text-gray-400 group-hover:text-gray-700 
                                   group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>
                {user.companies.length} company
                {user.companies.length !== 1 ? "ies" : ""} available
              </span>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              {isAdmin(user) && (
                <>
                  <button
                    onClick={handleCreateCompany}
                    className="px-5 py-2.5 text-sm font-semibold
                           text-gray-700 hover:text-gray-900
                           bg-white border border-gray-300 rounded-lg
                           hover:border-gray-400 hover:shadow-md transition-all duration-200
                           flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Company</span>
                  </button>
                  <button
                    onClick={handleUserManagement}
                    className="px-5 py-2.5 text-sm font-semibold
                           text-gray-700 hover:text-gray-900
                           bg-white border border-gray-300 rounded-lg
                           hover:border-gray-400 hover:shadow-md transition-all duration-200
                           flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <UserCog className="w-4 h-4" />
                    <span>User Management</span>
                  </button>
                </>
              )}

              <button
                onClick={handleLogout}
                className="px-5 py-2.5 text-sm font-semibold
                         text-gray-700 hover:text-gray-900
                         hover:bg-gray-100 rounded-lg transition-all duration-200
                         flex items-center gap-2 border border-transparent
                         hover:border-gray-300 hover:shadow-md"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Nothing else changed */}
      <CompanyDetailsModal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} company={selectedCompany} />
      <CompanyModal isOpen={modalOpen} onClose={() => setModalOpen(false)} mode={modalMode} company={selectedCompany} onSubmit={handleCompanySubmit} loading={loading} />
     </>
  );
}

export default CompanySelectionPage;
