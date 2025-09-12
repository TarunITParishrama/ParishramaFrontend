import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdmissionForm from "../../Forms/AdmissionForm";
import StudentData from "../stud/StudentData";
import StudentSettings from "../stud/StudentSettings";
import DeletedStudentsTab from "../stud/DeletedStudentsTab";

export default function Admissions() {
  const navigate = useNavigate();

  // Get role once
  const userRole = useMemo(() => localStorage.getItem("userRole") || "", []);
  // Default tab remains registrations
  const [activeTab, setActiveTab] = useState("registrations");

  // Base sections
  const baseSections = [
    { id: 1, name: "Registrations", icon: "📝", path: "registrations" },
    { id: 2, name: "Admitted", icon: "🎓", path: "admitted" },
    { id: 3, name: "Settings", icon: "⚙️", path: "settings" },
  ];

  // If staff, hide Admitted; otherwise show all
  const admissionSections = useMemo(() => {
    if (userRole === "staff")
      return baseSections.filter((s) => s.path !== "admitted");
    if (userRole === "admin" || userRole === "super_admin") {
      return [
        ...baseSections,
        { id: 4, name: "Deleted Students", icon: "🗑️", path: "deleted" },
      ];
    }
    return baseSections;
  }, [userRole]); // conditional rendering based on role [5]

  const renderContent = () => {
    switch (activeTab) {
      case "registrations":
        return <AdmissionForm />; // conditional subtree render [4]
      case "admitted":
        // Guard to avoid rendering StudentData for staff even if forced into this state
        return userRole === "staff" ? <AdmissionForm /> : <StudentData />; // role guard [9]
      case "settings":
        return <StudentSettings />;
      case "deleted":
        return userRole === "admin" || userRole === "super_admin" ? (
          <DeletedStudentsTab />
        ) : (
          <AdmissionForm />
        );

      default:
        return <AdmissionForm />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button
          onClick={() => navigate("/home")}
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
