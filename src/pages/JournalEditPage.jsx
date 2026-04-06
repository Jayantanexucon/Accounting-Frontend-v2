import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { getJournalByIdApi, updateJournalApi } from "../apis/journalApi";
import LoadingComponent from "../components/LoadingComponent";
import { FiArrowLeft, FiSave, FiX } from "react-icons/fi";

export default function JournalEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [journal, setJournal] = useState(null);

  useEffect(() => {
    fetchJournal();
  }, [id]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await getJournalByIdApi(user?.company?._id, id);
      setJournal(res.data);
    } catch (error) {
      console.error("Error fetching journal:", error);
      toast.error("Failed to load journal");
      navigate("/accounting/journals/list");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Add your update logic here
      await updateJournalApi(user?.company?._id, id, journal);
      toast.success("Journal updated successfully!");
      navigate("/accounting/journals/list");
    } catch (error) {
      console.error("Error updating journal:", error);
      toast.error("Failed to update journal");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingComponent message="Loading journal..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/accounting/journals/list")} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <FiArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Journal: {journal?.number}</h1>
              <p className="text-gray-600">Make changes to the journal entry</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/accounting/journals/list")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-2"
            >
              <FiX className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Journal edit form will be implemented here</p>
            <p className="text-sm text-gray-400 mt-2">This page would contain the form to edit journal details</p>
          </div>
        </div>
      </div>
    </div>
  );
}
