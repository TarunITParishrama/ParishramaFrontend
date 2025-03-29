import React from "react";
import { useNavigate } from "react-router-dom";
import CampusNavigation from './CampusNavigation';

const dashboardItems = [
  { name: "Staffs", icon: "👨‍🏫", path: "/staffs" },
  { name: "Students", icon: "👨‍🎓", path: "/students" },
  { name: "Classes", icon: "📊", path: "/classes" },
  { name: "Tests", icon: "📝", path: "/tests" },
  { name: "Questions", icon: "🔠", path: "/questions" },
  { name: "Marks", icon: "📋", path: "/marks" },
  { name: "Reports", icon: "📈", path: "/reports" },
  { name: "Attendance", icon: "📅", path: "/attendance" },
  { name: "Noticeboard", icon: "📌", path: "/noticeboard" },
  { name: "Admission", icon: "📨", path: "/admission" },
  { name: "Feedback", icon: "⭐", path: "/feedback" },
];

export default function CampusDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex">
      <CampusNavigation />

      {/* Center content by using flexbox */}
      <div className="flex-1 min-h-screen flex items-center justify-center bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-6 ml-56">Campus Dashboard</h1>

          {/* Grid Layout for the Dashboard Items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 ml-64">
            {dashboardItems.map((item) => (
              <div
                key={item.name}
                onClick={() => navigate(item.path)}
                className="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-transform transform hover:-translate-y-1"
              >
                <span className="text-4xl">{item.icon}</span>
                <p className="text-lg font-medium text-gray-700 mt-2">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
