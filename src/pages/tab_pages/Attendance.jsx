import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Attendance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("new");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);

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
            <h2 className="text-lg font-semibold flex items-center gap-2">📅 New Attendance</h2>
            {/* Form */}
            <form className="mt-4">
              {/* Select Class */}
              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Select Class *</label>
                <select className="w-full border p-2 rounded-md mt-1">
                  <option>Select class</option>
                </select>
              </div>

              {/* Attendance Date & Time Session */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-gray-700 font-medium">Attendance Date *</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full border p-2 rounded-md mt-1"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-gray-700 font-medium">Time Session *</label>
                  <select className="w-full border p-2 rounded-md mt-1">
                    <option>Select Time Session</option>
                  </select>
                </div>
              </div>

              {/* Copy Previous Attendance */}
              <div className="flex items-center mt-4">
                <input type="checkbox" className="mr-2" />
                <label className="text-gray-700">Copy Previous Attendance</label>
              </div>

              {/* Submit Button */}
              <button className="mt-6 bg-blue-600 text-white py-2 px-6 rounded-lg w-full hover:bg-blue-700 transition">
                Submit
              </button>
            </form>
          </>
        )}

        {activeTab === "edit" && <h2 className="text-lg font-semibold">✏️ Edit Attendance (Coming Soon...)</h2>}
        {activeTab === "reports" && <h2 className="text-lg font-semibold">📊 Attendance Reports (Coming Soon...)</h2>}
        {activeTab === "sms" && <h2 className="text-lg font-semibold">📩 SMS Notifications (Coming Soon...)</h2>}
      </div>
    </div>
  );
}
