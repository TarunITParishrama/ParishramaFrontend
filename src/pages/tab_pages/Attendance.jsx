import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AttendanceForm from "../../Forms/AttendanceForm";
import AttendanceReport from "../stud/AttendanceReport";


export default function Attendance() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const getTabs = (userRole) => {
    if (userRole === 'parent') {
      return [{ id: "parentview", label: "Attendance" }];
    } else if (userRole === 'staff') {
      return [{ id: "mark", label: "Mark Attendance" }];
    } else {
      return [{ id: "view", label: "View Attendance" }];
    }
  };
  const tabs = getTabs(userRole);
  const [activeTab, setActiveTab] = useState(tabs[0].id);

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
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-1 capitalize ${
                activeTab === tab.id ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto mt-6 p-4">
        {activeTab === "mark" && <AttendanceForm />}
        {activeTab === "view" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Attendance View</h2>
            <p>Attendance viewing functionality will be implemented here.</p>
          </div>
        )}
                {activeTab === "parentview" && <AttendanceReport />}

      </div>
    </div>
  );
}
