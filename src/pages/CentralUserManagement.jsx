import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BadgeAlert,
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit,
  Eye,
  Home,
  Key,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { ShieldBanIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  createCompanyApi,
  createUserApi,
  editUserApi,
  getAllCompaniesApi,
  getUsersApi,
  updateCompanyApi,
} from "../apis/userApi";
import { useAuth } from "../contexts/AuthContext";
import CompanyDetailsModal from "../modals/CompanyDetailsModal";
import CompanyPermissionModal from "../modals/PermissionModal";
import CompanyModal from "../modals/CompanyCreationModal";
import CreateUserModal from "../modals/CreateUserModal";
import { isSuperAdmin } from "../utils/roleUtil";

const itemsPerPage = 8;

function CentralUserManagement() {
  const navigate = useNavigate();
  const { user: currentUser, setUser: setAuthUser } = useAuth();

  const [activeTab, setActiveTab] = useState("users");

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState([]);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] =
    useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState("create");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const superAdmin = isSuperAdmin(currentUser);

  const isSuperAdminUser = (user) => user?.role === "superAdmin";

  const getUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsersApi();
      setUsers(data?.data || []);
      setFilteredUsers(data?.data || []);
    } catch {
      toast.error("Error in fetching users");
    } finally {
      setLoading(false);
    }
  }, []);

  const getCompanies = useCallback(async () => {
    if (!superAdmin) return;

    try {
      setCompanyLoading(true);
      const data = await getAllCompaniesApi();
      setCompanies(data?.data || []);
    } catch {
      toast.error("Error in fetching companies");
    } finally {
      setCompanyLoading(false);
    }
  }, [superAdmin]);

  const filterUsers = useCallback(() => {
    let filtered = users;

    if (searchTerm) {
      const needle = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(needle) ||
          u.email.toLowerCase().includes(needle),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((u) =>
        statusFilter === "active" ? !u.isBlocked : u.isBlocked,
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [roleFilter, searchTerm, statusFilter, users]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  useEffect(() => {
    if (superAdmin) {
      getCompanies();
    }
  }, [getCompanies, superAdmin]);

  useEffect(() => {
    if (!superAdmin && activeTab === "companies") {
      setActiveTab("users");
    }
  }, [activeTab, superAdmin]);

  const toggleUserExpansion = (userId) =>
    setExpandedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );

  const handleBlockUser = async (userId, currentStatus) => {
    try {
      await editUserApi(userId, { isBlocked: !currentStatus });
      toast.success(
        `User ${!currentStatus ? "blocked" : "unblocked"} successfully`,
      );
      getUsers();
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await editUserApi(userId, { isBlocked: true });
      toast.success("User blocked successfully");
      getUsers();
    } catch {
      toast.error("Failed to block user");
    }
  };

  const handleSelectUser = (userId) =>
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );

  const handleRoleChange = async (userId, newRole) => {
    try {
      await editUserApi(userId, { role: newRole });
      toast.success("User role updated successfully");
      getUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update user role");
    }
  };

  const handleCreateUser = async ({ id, payload }) => {
    try {
      if (id) {
        await editUserApi(id, payload);
        toast.success("User updated successfully");
      } else {
        await createUserApi(payload);
        toast.success("User created successfully");
      }

      setShowCreateUserModal(false);
      setSelectedUserForEdit(null);
      getUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    }
  };

  const handleEditPermissions = (user) => {
    setSelectedUserForPermissions(user);
    setPermissionModalOpen(true);
  };

  const handlePermissionsSaved = () => getUsers();

  const handleCreateCompany = () => {
    setCompanyModalMode("create");
    setSelectedCompany(null);
    setCompanyModalOpen(true);
  };

  const handleEditCompany = (company) => {
    setCompanyModalMode("edit");
    setSelectedCompany(company);
    setCompanyModalOpen(true);
  };

  const handleViewCompany = (company) => {
    setSelectedCompany(company);
    setDetailsModalOpen(true);
  };

  const handleCompanySubmit = async (formData) => {
    try {
      setCompanyLoading(true);

      if (companyModalMode === "create") {
        const response = await createCompanyApi(formData);
        const newCompany = response?.data;

        setCompanies((prev) => [...prev, newCompany]);
        setAuthUser((prev) =>
          prev
            ? { ...prev, companies: [...(prev.companies || []), newCompany] }
            : prev,
        );
        toast.success("Company created successfully");
      } else {
        const response = await updateCompanyApi(selectedCompany._id, formData);
        const updatedCompany = {
          ...selectedCompany,
          ...formData,
          ...response?.data,
        };

        setCompanies((prev) =>
          prev.map((company) =>
            company._id === selectedCompany._id ? updatedCompany : company,
          ),
        );

        setAuthUser((prev) =>
          prev
            ? {
                ...prev,
                companies: (prev.companies || []).map((company) =>
                  company._id === selectedCompany._id ? updatedCompany : company,
                ),
                company:
                  prev.company?._id === selectedCompany._id
                    ? updatedCompany
                    : prev.company,
              }
            : prev,
        );

        const storedCompany = localStorage.getItem("selectedCompany");
        if (storedCompany) {
          const parsedCompany = JSON.parse(storedCompany);
          if (parsedCompany?._id === selectedCompany._id) {
            localStorage.setItem("selectedCompany", JSON.stringify(updatedCompany));
          }
        }

        if (detailsModalOpen) {
          setSelectedCompany(updatedCompany);
        }

        toast.success("Company updated successfully");
      }

      setCompanyModalOpen(false);
      setSelectedCompany(null);
      await getCompanies();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save company");
    } finally {
      setCompanyLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "EDIT":
        return "bg-blue-50 text-blue-700 border border-blue-100";
      case "VIEW":
        return "bg-slate-100 text-slate-600 border border-slate-200";
      case "DELETE":
        return "bg-red-50 text-red-600 border border-red-100";
      default:
        return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  };

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const hasActiveFilters = statusFilter !== "all" || roleFilter !== "all";
  const filteredCompanies = useMemo(() => {
    if (!companySearchTerm) return companies;

    const needle = companySearchTerm.toLowerCase();
    return companies.filter(
      (company) =>
        company?.name?.toLowerCase().includes(needle) ||
        company?.tradeName?.toLowerCase().includes(needle) ||
        company?.email?.toLowerCase().includes(needle),
    );
  }, [companies, companySearchTerm]);

  const stats = [
    {
      label: "Total Users",
      value: users.length,
      gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
      glow: "#93c5fd",
    },
    {
      label: "Administrators",
      value: users.filter((u) => u.role === "admin").length,
      gradient: "linear-gradient(135deg,#312e81 0%,#7c3aed 55%,#a78bfa 100%)",
      glow: "#c4b5fd",
    },
    {
      label: "Active Users",
      value: users.filter((u) => !u.isBlocked).length,
      gradient: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)",
      glow: "#6ee7b7",
    },
    {
      label: "Companies",
      value: companies.length,
      gradient: "linear-gradient(135deg,#0f766e 0%,#14b8a6 55%,#5eead4 100%)",
      glow: "#99f6e4",
    },
  ];

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === currentUsers.length
        ? []
        : currentUsers.map((u) => u._id),
    );
  };

  const refreshCurrentTab = () => {
    if (activeTab === "companies" && superAdmin) {
      getCompanies();
      return;
    }

    getUsers();
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl shadow-md"
                  style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}
                >
                  <UserCheck size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    User Management
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Manage users, permissions, and company setup
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refreshCurrentTab}
                  title="Refresh"
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
                >
                  <RefreshCw size={15} />
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Home size={13} /> Home
                </button>
                <button
                  onClick={() => navigate("/manageEntity")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Settings size={13} /> Manage Entity
                </button>
                {activeTab === "companies" && superAdmin ? (
                  <button
                    onClick={handleCreateCompany}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-all"
                    style={{
                      background: "linear-gradient(135deg,#0f766e,#14b8a6)",
                      boxShadow: "0 4px 14px rgba(20,184,166,0.28)",
                    }}
                  >
                    <Plus size={14} /> Add Company
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-all"
                    style={{
                      background: "linear-gradient(135deg,#1e40af,#3b82f6)",
                      boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                    }}
                  >
                    <UserPlus size={14} /> Add User
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((s, idx) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
                  style={{ background: s.gradient }}
                >
                  <div
                    className="absolute -top-8 -right-8 w-44 h-32 rounded-full opacity-30 blur-2xl group-hover:scale-125 transition-transform duration-700"
                    style={{ background: `radial-gradient(ellipse,${s.glow},transparent)` }}
                  />
                  <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
                  <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />
                  <div className="relative z-10">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-2">
                      {s.label}
                    </p>
                    <p className="text-3xl font-black text-white leading-none">
                      {s.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                  activeTab === "users"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Users
              </button>
              {superAdmin && (
                <button
                  onClick={() => setActiveTab("companies")}
                  className={`px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                    activeTab === "companies"
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Companies
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
          {activeTab === "users" ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all font-medium placeholder-slate-400"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                      showFilters || hasActiveFilters
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Filters{" "}
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                </div>

                {showFilters && (
                  <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Role
                      </span>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Administrator</option>
                        <option value="user">User</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Status
                      </span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setRoleFilter("all");
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="p-4 bg-slate-100 rounded-2xl">
                      <AlertCircle size={28} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">No users found</p>
                    <p className="text-xs text-slate-400">
                      {searchTerm || hasActiveFilters
                        ? "Try adjusting your filters"
                        : "No users have been added yet"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr
                            className="border-b border-slate-100"
                            style={{
                              background: "linear-gradient(90deg,#f8fafc,#eff6ff)",
                            }}
                          >
                            <th className="py-3 px-5 w-10">
                              <input
                                type="checkbox"
                                checked={
                                  selectedUsers.length === currentUsers.length &&
                                  currentUsers.length > 0
                                }
                                onChange={handleSelectAll}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                              />
                            </th>
                            <th className="py-3 px-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              User
                            </th>
                            <th className="py-3 px-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Role
                            </th>
                            <th className="py-3 px-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Status
                            </th>
                            <th className="py-3 px-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Permissions
                            </th>
                            <th className="py-3 px-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                          {currentUsers.map((user) => (
                            <React.Fragment key={user._id}>
                              <tr
                                className={`transition-colors ${
                                  user.role === "superAdmin"
                                    ? "bg-red-50/60 border-l-4 border-red-400"
                                    : "hover:bg-slate-50/60"
                                }`}
                              >
                                <td className="py-3 px-5">
                                  <input
                                    type="checkbox"
                                    disabled={user.role === "superAdmin"}
                                    checked={selectedUsers.includes(user._id)}
                                    onChange={() => handleSelectUser(user._id)}
                                    className={`rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 ${
                                      user.role === "superAdmin"
                                        ? "opacity-40 cursor-not-allowed"
                                        : ""
                                    }`}
                                  />
                                </td>

                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm shrink-0"
                                      style={{
                                        background:
                                          "linear-gradient(135deg,#eff6ff,#dbeafe)",
                                      }}
                                    >
                                      <span className="text-sm font-black text-blue-700">
                                        {user.name?.charAt(0)?.toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-900 truncate">
                                        {user.name}
                                      </p>
                                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 truncate">
                                        <Mail size={10} />
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={user.role}
                                      disabled={isSuperAdminUser(user)}
                                      onChange={(e) =>
                                        handleRoleChange(user._id, e.target.value)
                                      }
                                      className={`text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium ${
                                        isSuperAdminUser(user)
                                          ? "opacity-60 cursor-not-allowed bg-slate-50"
                                          : ""
                                      }`}
                                    >
                                      {user.role === "superAdmin" && (
                                        <option value="superAdmin">Super Admin</option>
                                      )}
                                      <option value="admin">Administrator</option>
                                      <option value="user">User</option>
                                    </select>
                                    {user.role === "superAdmin" && (
                                      <ShieldBanIcon
                                        size={14}
                                        className="text-red-500 shrink-0"
                                      />
                                    )}
                                    {user.role === "admin" && (
                                      <Shield
                                        size={14}
                                        className="text-violet-500 shrink-0"
                                      />
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-5">
                                  {!isSuperAdminUser(user) && (
                                    <button
                                      onClick={() =>
                                        handleBlockUser(user._id, user.isBlocked)
                                      }
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
                                        user.isBlocked
                                          ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                      }`}
                                    >
                                      {user.isBlocked ? (
                                        <>
                                          <Lock size={10} /> Blocked
                                        </>
                                      ) : (
                                        <>
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          Active
                                        </>
                                      )}
                                    </button>
                                  )}
                                </td>

                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-2">
                                    <BadgeCheck
                                      size={14}
                                      className={
                                        user.role === "superAdmin"
                                          ? "text-blue-500"
                                          : user.permissions?.length > 0
                                            ? "text-emerald-500"
                                            : "text-slate-300"
                                      }
                                    />
                                    <span className="text-xs text-slate-500 font-medium">
                                      {user.role === "superAdmin"
                                        ? "All Permissions"
                                        : `${user.permissions?.length || 0} permission${
                                            user.permissions?.length !== 1 ? "s" : ""
                                          }`}
                                    </span>
                                    {!isSuperAdminUser(user) && (
                                      <button
                                        onClick={() => toggleUserExpansion(user._id)}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                      >
                                        {expandedUsers.includes(user._id) ? (
                                          <ChevronUp size={13} />
                                        ) : (
                                          <ChevronDown size={13} />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-5">
                                  {!isSuperAdminUser(user) && (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleEditPermissions(user)}
                                        title="Edit Permissions"
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                      >
                                        <Key size={14} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedUserForEdit(user);
                                          setShowCreateUserModal(true);
                                        }}
                                        title="Edit User"
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user._id)}
                                        title="Block User"
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {expandedUsers.includes(user._id) && (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="px-5 py-4 bg-slate-50/60 border-t border-slate-100"
                                  >
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <Key size={12} className="text-indigo-500" />
                                            User Permissions
                                          </h4>
                                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            Permissions for {user.name}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleEditPermissions(user)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all"
                                        >
                                          <Plus size={11} /> Manage Permissions
                                        </button>
                                      </div>

                                      {user.permissions?.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {user.permissions.map((perm, index) => (
                                            <div
                                              key={`${user._id}-${index}`}
                                              className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5"
                                            >
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <Building2
                                                    size={13}
                                                    className="text-slate-400"
                                                  />
                                                  <span className="text-xs font-bold text-slate-800">
                                                    {perm.entity?.name ||
                                                      `Entity ${index + 1}`}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <BadgeAlert
                                                    size={13}
                                                    className="text-blue-500"
                                                  />
                                                  <span className="text-[10px] text-slate-400 font-medium">
                                                    {perm.company?.name ||
                                                      "All Companies"}
                                                  </span>
                                                </div>
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                                  Allowed Actions
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                  {perm.actions?.map((action, ai) => (
                                                    <span
                                                      key={`${user._id}-${index}-${ai}`}
                                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getActionColor(action)}`}
                                                    >
                                                      {action}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-2xl gap-3">
                                          <div className="p-3 bg-slate-100 rounded-xl">
                                            <Key size={22} className="text-slate-300" />
                                          </div>
                                          <p className="text-xs font-bold text-slate-500">
                                            No permissions assigned
                                          </p>
                                          <p className="text-[11px] text-slate-400">
                                            This user doesn&apos;t have any specific permissions yet
                                          </p>
                                          <button
                                            onClick={() => handleEditPermissions(user)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl mt-1"
                                            style={{
                                              background:
                                                "linear-gradient(135deg,#1e40af,#3b82f6)",
                                            }}
                                          >
                                            <Plus size={12} /> Assign First Permission
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">
                          Showing{" "}
                          <span className="font-bold text-slate-600">
                            {indexOfFirstItem + 1}
                          </span>
                          –
                          <span className="font-bold text-slate-600">
                            {Math.min(indexOfLastItem, filteredUsers.length)}
                          </span>{" "}
                          of{" "}
                          <span className="font-bold text-slate-600">
                            {filteredUsers.length}
                          </span>{" "}
                          users
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={currentPage === 1}
                            onClick={() =>
                              setCurrentPage((p) => Math.max(p - 1, 1))
                            }
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const start = Math.max(
                              1,
                              Math.min(currentPage - 2, totalPages - 4),
                            );
                            const pg = start + i;

                            return (
                              <button
                                key={pg}
                                onClick={() => setCurrentPage(pg)}
                                className="min-w-[30px] h-[30px] rounded-lg text-[11px] font-bold transition-all border"
                                style={
                                  pg === currentPage
                                    ? {
                                        background:
                                          "linear-gradient(135deg,#1e40af,#3b82f6)",
                                        color: "white",
                                        borderColor: "#3b82f6",
                                      }
                                    : {
                                        background: "white",
                                        color: "#475569",
                                        borderColor: "#e2e8f0",
                                      }
                                }
                              >
                                {pg}
                              </button>
                            );
                          })}
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() =>
                              setCurrentPage((p) => Math.min(p + 1, totalPages))
                            }
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex flex-col gap-4 px-5 py-4 border-b border-slate-100 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    Company Management
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    View, create, and edit all companies from one place.
                  </p>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={companySearchTerm}
                    onChange={(e) => setCompanySearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all font-medium placeholder-slate-400"
                  />
                </div>
              </div>

              {companyLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                  <p className="text-sm text-slate-400 font-medium">Loading companies...</p>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="p-4 bg-slate-100 rounded-2xl">
                    <Building2 size={28} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No companies found</p>
                  <p className="text-xs text-slate-400">
                    {companySearchTerm
                      ? "Try a different search term"
                      : "Create your first company from here"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
                  {filteredCompanies.map((company) => (
                    <div
                      key={company._id}
                      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                              background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                            }}
                          >
                            <Building2 size={18} className="text-blue-700" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {company.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium truncate">
                              {company.tradeName || company.email || "No trade name"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewCompany(company)}
                            title="View company"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEditCompany(company)}
                            title="Edit company"
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black uppercase tracking-wider text-slate-400">
                            Type
                          </span>
                          <span className="font-semibold text-slate-700">
                            {company.companyType || "Private Ltd"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black uppercase tracking-wider text-slate-400">
                            Nature
                          </span>
                          <span className="font-semibold text-slate-700">
                            {company.businessNature || "Service"}
                          </span>
                        </div>
                        {/* <div className="flex items-center justify-between text-[11px]">
                          <span className="font-black uppercase tracking-wider text-slate-400">
                            Employees
                          </span>
                          <span className="font-semibold text-slate-700">
                            {company.employees?.length || 0}
                          </span>
                        </div> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === "users" && selectedUsers.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-white/10"
          style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)" }}
        >
          <span className="text-xs font-bold text-white/80">
            {selectedUsers.length} selected
          </span>
          <div className="w-px h-4 bg-white/20" />
          <button
            onClick={async () => {
              const toBlock = selectedUsers.filter(
                (id) => !users.find((u) => u._id === id && u.role === "superAdmin"),
              );
              await Promise.all(
                toBlock.map((id) => editUserApi(id, { isBlocked: true })),
              );
              toast.success("Users blocked");
              getUsers();
              setSelectedUsers([]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
          >
            <Lock size={12} /> Block
          </button>
          <button
            onClick={() => setSelectedUsers([])}
            className="p-1.5 text-white/50 hover:text-white transition-colors"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          setSelectedUserForEdit(null);
        }}
        onSubmit={handleCreateUser}
        user={selectedUserForEdit}
      />

      <CompanyPermissionModal
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        user={selectedUserForPermissions}
        onSuccess={handlePermissionsSaved}
        getUsers={getUsers}
      />

      <CompanyDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany}
      />

      <CompanyModal
        isOpen={companyModalOpen}
        onClose={() => {
          setCompanyModalOpen(false);
          setSelectedCompany(null);
        }}
        mode={companyModalMode}
        company={companyModalMode === "edit" ? selectedCompany : null}
        onSubmit={handleCompanySubmit}
        loading={companyLoading}
      />
    </>
  );
}

export default CentralUserManagement;
