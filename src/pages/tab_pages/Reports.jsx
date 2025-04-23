import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AllTests from "../reports_related/AllTests";
import EditReports from "../reports_related/EditReports";

export default function Tests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
      <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Reports</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {["all", "edit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "all" ? "All Reports" : "Edit Reports"}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Rendering Based on Active Tab */}
      <div className="max-w-7xl mx-auto mt-6">
        {activeTab === "all" && <AllTests />}


        {activeTab === "edit" && <EditReports />}
      </div>
    </div>
  );
}