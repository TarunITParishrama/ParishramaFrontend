import React from "react";
import { useRole } from "../context/RoleContext"; // Import the RoleContext

const dashboardItems = [
  { name: "Staffs", icon: "👨‍🏫", path: "/staffs", roles: ["super_admin", "admin"] },
  { name: "Students", icon: "👨‍🎓", path: "/students", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Classes", icon: "📊", path: "/classes", roles: ["super_admin", "admin"]},
  { name: "Batches", icon: "👥", path: "/batches", roles: ["super_admin", "admin"] },
  { name: "Tests", icon: "📝", path: "/tests", roles: ["super_admin", "admin"] },
  { name: "Questions", icon: "🔠", path: "/questions", roles: ["super_admin", "admin"] },
  { name: "Marks", icon: "📋", path: "/marks", roles: ["super_admin", "admin"] },
  { name: "Reports", icon: "📈", path: "/reports", roles: ["super_admin", "admin"] },
  { name: "Attendance", icon: "📅", path: "/attendance", roles: ["super_admin", "admin"] },
  { name: "SMS", icon: "📩", path: "/sms", roles: ["super_admin", "admin"] },
  { name: "Noticeboard", icon: "📌", path: "/noticeboard", roles: ["super_admin", "admin"] },
  { name: "Hospital", icon: "🏥", path: "/hospital", roles: ["super_admin", "admin"] },
  { name: "Hostel", icon: "🛏️", path: "/hostel", roles: ["super_admin", "admin"] },
  { name: "Gate Pass", icon: "🚪", path: "/gatepass", roles: ["super_admin", "admin"] },
  { name: "Admission", icon: "📨", path: "/admission", roles: ["super_admin", "admin"] },
  { name: "Feedback", icon: "💬", path: "/feedback", roles: ["super_admin", "admin"] },
  { name: "Leaderboard", icon: "🏅", path: "/leaderboard", roles: ["super_admin", "admin"] },
  { name: "Settings", icon: "⚙️", path: "/settings", roles: ["super_admin"] },
];

export default function Dashboard() {
  const { role } = useRole(); // Get the role from context

  // Handle undefined role
  if (!role) {
    return <div className="flex-1 min-h-screen flex items-center justify-center bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 p-4 ml-64">Loading...</div>;
  }

  const filteredItems = dashboardItems.filter((item) => item.roles.includes(role));

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 p-4 ml-64">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-6">{role.charAt(0).toUpperCase() + role.slice(1)} Dashboard</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.name}
              className="bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-transform transform hover:-translate-y-1"
            >
              <span className="text-4xl">{item.icon}</span>
              <p className="text-lg font-medium text-gray-700 mt-2">{item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}