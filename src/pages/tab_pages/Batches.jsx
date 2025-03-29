import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Batches() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button
          onClick={() => navigate(-1)}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Batches</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {["all", "create", "edit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "all" ? "All Batches" : tab === "create" ? "Create Batch" : "Edit Batch"}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Rendering Based on Active Tab */}
      <div className="max-w-2xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        {activeTab === "all" && (
          <>
            <h2 className="text-lg font-semibold">📋 All Batches</h2>
            <p>List of all batches will be displayed here.</p>
          </>
        )}

        {activeTab === "create" && (
          <>
            <h2 className="text-lg font-semibold">➕ Create New Batch</h2>
            <form className="mt-4">
              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Batch Name *</label>
                <input type="text" className="w-full border p-2 rounded-md mt-1" />
              </div>

              <button className="mt-6 bg-green-600 text-white py-2 px-6 rounded-lg w-full hover:bg-green-700 transition">
                Create Batch
              </button>
            </form>
          </>
        )}

        {activeTab === "edit" && <h2 className="text-lg font-semibold">✏️ Edit Batch (Coming Soon...)</h2>}
      </div>
    </div>
  );
}
