import React from "react";
import { NavLink } from "react-router-dom";
import { useRole } from "../context/RoleContext"; // Import the RoleContext
import logo from '../assets/logo.png';

const dashboardItems = [
  { name: "Staffs", path: "/staffs", roles: ["super_admin", "admin"] },
  { name: "Students", path: "/students", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Classes", path: "/classes", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Batches", path: "/batches", roles: ["super_admin", "admin"] },
  { name: "Tests", path: "/tests", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Questions", path: "/questions", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Marks", path: "/marks", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Reports", path: "/reports", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Attendance", path: "/attendance", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "SMS", path: "/sms", roles: ["super_admin", "admin"] },
  { name: "Noticeboard", path: "/noticeboard", roles: ["super_admin", "admin"] },
  { name: "Hospital", path: "/hospital", roles: ["super_admin"] },
  { name: "Hostel", path: "/hostel", roles: ["super_admin"] },
  { name: "Gate Pass", path: "/gatepass", roles: ["super_admin"] },
  { name: "Admission", path: "/admission", roles: ["super_admin", "admin", "campus"] },
  { name: "Feedback", path: "/feedback", roles: ["super_admin", "admin", "campus", "staff"] },
  { name: "Leaderboard", path: "/leaderboard", roles: ["super_admin"] },
  { name: "Settings", path: "/settings", roles: ["super_admin"] },
];

export default function Navigation() {
  const { role } = useRole(); // Get the role from context

  const sortedItems = [...dashboardItems]
    .filter((item) => item.roles.includes(role))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="w-64 h-screen bg-white text-gray-700 fixed top-0 left-0 p-5 shadow-lg flex flex-col">
      <img src={logo} alt="" className="mx-auto mb-4" />
      <ul className="space-y-2 overflow-y-auto flex-1">
        {sortedItems.map((item) => (
          <li key={item.name}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md hover:bg-gray-700 hover:text-white transition ${
                  isActive ? "bg-gray-600 text-white" : ""
                }`
              }
            >
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}