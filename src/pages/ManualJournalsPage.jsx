"use client";
import React, { useEffect, useState } from "react";
import NewJournalModal from "../components/NewJournalModal";

export default function ManualJournalsPage() {
  const [journals, setJournals] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadJournals();
  }, []);

  async function loadJournals() {
    try {
      const res = await fetch("/api/journals");
      const data = await res.json();
      setJournals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setJournals([]);
    }
  }

  function formatAmount(num) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num || 0);
  }

  function handleSave(newJournal) {
    setJournals((prev) => [newJournal, ...prev]);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">All Manual Journals</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
        >
          + New
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 text-sm">
        <label className="font-medium mr-2">Period:</label>
        <select className="border p-1 rounded text-sm">
          <option>All</option>
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full table-auto text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-gray-600 uppercase text-xs tracking-wide">
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Journal#</th>
              <th className="py-3 px-4 text-left">Reference</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Notes</th>
              <th className="py-3 px-4 text-left">Amount</th>
              <th className="py-3 px-4 text-left">Created By</th>
              <th className="py-3 px-4 text-left">Reporting Method</th>
            </tr>
          </thead>

          <tbody>
            {journals.map((j) => (
              <tr key={j.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  {new Date(j.date).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-blue-600 cursor-pointer hover:underline">
                  {j.journalNo}
                </td>
                <td className="py-3 px-4">{j.reference}</td>
                <td className="py-3 px-4">
                  <span className="font-medium text-green-600">{j.status}</span>
                </td>
                <td className="py-3 px-4">{j.notes || "—"}</td>
                <td className="py-3 px-4 font-medium">
                  {formatAmount(j.amount)}
                </td>
                <td className="py-3 px-4">{j.createdBy}</td>
                <td className="py-3 px-4">{j.reportingMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <NewJournalModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
