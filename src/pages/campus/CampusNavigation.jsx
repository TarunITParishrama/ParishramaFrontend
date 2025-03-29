import React from "react";
import { NavLink } from "react-router-dom";
import logo from '../../assets/logo.png';

const dashboardItems = [
  { name: "Staffs", path: "/staffs" },
  { name: "Students", path: "/students" },
  { name: "Classes", path: "/classes" },
  { name: "Tests", path: "/tests" },
  { name: "Questions", path: "/questions" },
  { name: "Marks", path: "/marks" },
  { name: "Reports", path: "/reports" },
  { name: "Attendance", path: "/attendance" },
  { name: "Noticeboard", path: "/noticeboard" },
  { name: "Admission", path: "/admission" },
  { name: "Feedback", path: "/feedback" },
];

export default function CampusNavigation() {
    const sortedItems = [...dashboardItems].sort((a,b) =>
        a.name.localeCompare(b.name),
    );
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
