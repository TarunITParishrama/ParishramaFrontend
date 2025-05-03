import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Attendance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("new");
 // const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button
          onClick={() => navigate('/home')}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Attendance</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {["new", "edit", "reports", "sms"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "new" ? "New Attendance" : tab === "edit" ? "Edit Attendance" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional Rendering Based on Active Tab */}
      <div className="max-w-2xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        {activeTab === "new" && (
          <>
             <h2 className="text-lg font-semibold flex items-center gap-2">📅 Attendance</h2>
              (Coming Soon...)
          </>
        )}

        {activeTab === "edit" && <h2 className="text-lg font-semibold">✏️ Edit Attendance (Coming Soon...)</h2>}
        {activeTab === "reports" && <h2 className="text-lg font-semibold">📊 Attendance Reports (Coming Soon...)</h2>}
        {activeTab === "sms" && <h2 className="text-lg font-semibold">📩 SMS Notifications (Coming Soon...)</h2>}
      </div>
    </div>
  );
}
