// pages/ManageEntity.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getEntitiesApi } from "../apis/entityApi";
import { Plus, FolderTree, Users, GitBranch, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import EntityList from "../modals/EntityList";
import { useNavigate } from "react-router-dom";

function ManageEntity() {
  const [entities, setEntities]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigate = useNavigate();

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const { data } = await getEntitiesApi();
      setEntities(data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error while fetching entities");
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntities(); }, []);

  const handleEditEntity   = (entity) => { setSelectedEntity(entity); setShowEditModal(true); };
  const handleDeleteEntity = (entity) => { setSelectedEntity(entity); setShowDeleteModal(true); };

  const handleCreateSuccess = () => { setShowCreateModal(false); fetchEntities(); toast.success("Entity created successfully"); };
  const handleEditSuccess   = () => { setShowEditModal(false); setSelectedEntity(null); fetchEntities(); toast.success("Entity updated successfully"); };
  const handleDeleteSuccess = () => { setShowDeleteModal(false); setSelectedEntity(null); fetchEntities(); toast.success("Entity deleted successfully"); };

  const STATS = [
    {
      label:    "Total Entities",
      value:    entities.length,
      gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
      glow:     "#93c5fd",
    },
    {
      label:    "Root Entities",
      value:    entities.filter((e) => !e.parent).length,
      gradient: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)",
      glow:     "#6ee7b7",
    },
    {
      label:    "Parent Entities",
      value:    entities.filter((e) => e.children && e.children.length > 0).length,
      gradient: "linear-gradient(135deg,#312e81 0%,#7c3aed 55%,#a78bfa 100%)",
      glow:     "#c4b5fd",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ══ STICKY HEADER ══ */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-5">

          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shadow-md"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                <FolderTree size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Manage Entities
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Create, edit and delete system entities
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/centralUserManagement")}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                <ArrowLeft size={13} /> User Management
              </button>
              <button onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
                <Plus size={14} /> Add Entity
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STATS.map((s, idx) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
                style={{ background: s.gradient }}>
                <div className="absolute -top-8 -right-8 w-44 h-32 rounded-full opacity-30 blur-2xl group-hover:scale-125 transition-transform duration-700"
                  style={{ background: `radial-gradient(ellipse,${s.glow},transparent)` }} />
                <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
                <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />
                <div className="relative z-10">
                  <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-2">{s.label}</p>
                  <p className="text-3xl font-black text-white leading-none">{s.value}</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Body ══ */}
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <EntityList
            entities={entities}
            loading={loading}
            onEdit={handleEditEntity}
            onDelete={handleDeleteEntity}
            onRefresh={fetchEntities}
          />
        </div>
      </div>
    </div>
  );
}

export default ManageEntity;