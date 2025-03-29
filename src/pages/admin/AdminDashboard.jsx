import React from "react";
import { useNavigate } from "react-router-dom";
import AdminNavigation from "./AdminNavigation";
import batchesIcon from '../../assets/batches.png'
import classesIcon from '../../assets/classes.png'

const dashboardItems = [
  { name: "Staffs", icon: "👨‍🏫", path: "/staffs" },
  { name: "Students", icon: "👨‍🎓", path: "/students" },
  {
    name: "Classes",
    icon: <img src={classesIcon} alt="Classes" className="w-10 h-8 inline" />,
    path: "/classes",
  },   {
    name: "Batches",
    icon: <img src={batchesIcon} alt="Batches" className="w-10 h-10 inline" />,
    path: "/batches",
  },  
  { name: "Tests", icon: "📝", path: "/tests" },
  { name: "Questions", icon: "🔠", path: "/questions" },
  { name: "Marks", icon: "📋", path: "/marks" },
  { name: "Reports", icon: "📈", path: "/reports" },
  { name: "Attendance", icon: "📅", path: "/attendance" },
  { name: "SMS", icon: "📩", path: "/sms" },
  { name: "Noticeboard", icon: "📌", path: "/noticeboard" },
  { name: "Hospital", icon: "🏥", path: "/hospital" },
  { name: "Hostel", icon: "🛏️", path: "/hostel" },
  { name: "Gate Pass", icon: "🚪", path: "/gatepass" },
  { name: "Admission", icon: "🏛️", path: "/admission" },
  { name: "Feedback", icon: "⭐", path: "/feedback" },
  { name: "Leaderboard", icon: "🏅", path: "/leaderboard" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex">
      <AdminNavigation />

      {/* Center content by using flexbox */}
      <div className="flex-1 min-h-screen flex items-center justify-center bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-6 ml-56">Admin Dashboard</h1>

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
