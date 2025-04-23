import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdmissionForm from "../../Forms/AdmissionForm";
import StudentData from "../stud/StudentData";
import StudentSettings from "../stud/StudentSettings";

export default function Admissions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("registrations");

  // Admission categories
  const admissionSections = [
    { id: 1, name: "Registrations", icon: "📝", path: "registrations" },
    { id: 2, name: "Admitted", icon: "🎓", path: "admitted" },
    { id: 3, name: "Settings", icon: "⚙️", path: "settings" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "registrations":
        return <AdmissionForm />;
      case "admitted":
        return <StudentData />;
      case "settings":
        return <StudentSettings />;
      default:
        return <AdmissionForm />;
    }
  };

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
        <h1 className="text-3xl font-bold">Admissions</h1>
      </div>

      {/* Admission Sections */}
      <div className="p-6">
        <div className="flex space-x-4 mb-6">
          {admissionSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.path)}
              className={`px-6 py-2 rounded-lg font-medium ${
                activeTab === section.path
                  ? "bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white shadow-md rounded-lg p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}