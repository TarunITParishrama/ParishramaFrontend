import React from "react";
import { useNavigate } from "react-router-dom";

export default function Admissions() {
  const navigate = useNavigate();

  // Admission categories
  const admissionSections = [
    { id: 1, name: "Registrations", icon: "📝", path: "/admissions/registrations" },
    { id: 2, name: "Enquiry", icon: "❓", path: "/admissions/enquiry" },
    { id: 3, name: "Leads", icon: "📊", path: "/admissions/leads" },
    { id: 4, name: "Counselling", icon: "💬", path: "/admissions/counselling" },
    { id: 5, name: "Applications", icon: "📄", path: "/admissions/applications" },
    { id: 6, name: "Admitted", icon: "🎓", path: "/admissions/admitted" },
    { id: 7, name: "Settings", icon: "⚙️", path: "/admissions/settings" },
  ];

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
        <h1 className="text-3xl font-bold">Admissions</h1>
      </div>

      {/* Admission Sections */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-700">Manage Admissions</h2>
        <p className="text-gray-500 mb-4">Choose a category to manage admissions.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {admissionSections.map((section) => (
            <div
              key={section.id}
              className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center cursor-pointer hover:bg-gray-200 transition"
              onClick={() => navigate(section.path)}
            >
              <span className="text-4xl">{section.icon}</span>
              <h3 className="text-lg font-semibold mt-2">{section.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
