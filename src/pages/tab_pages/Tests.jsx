import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AllTests from "../reports_related/AllTests";

export default function Tests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
      <button onClick={() => navigate('/admin/dashboard')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Tests</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {["all", "add", "edit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "all" ? "All Tests" : tab === "add" ? "Add Test" : "Edit Test"}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Rendering Based on Active Tab */}
      <div className="max-w-7xl mx-auto mt-6">
        {activeTab === "all" && <AllTests />}
        
        {activeTab === "add" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold">➕ Add New Test</h2>
            <form className="mt-4">
              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Test Name *</label>
                <input type="text" className="w-full border p-2 rounded-md mt-1" />
              </div>
              <button className="mt-6 bg-purple-600 text-white py-2 px-6 rounded-lg w-full hover:bg-purple-700 transition">
                Add Test
              </button>
            </form>
          </div>
        )}

        {activeTab === "edit" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold">✏️ Edit Test (Coming Soon...)</h2>
          </div>
        )}
      </div>
    </div>
  );
}