import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from '../assets/logo.png';
import { FiSearch } from "react-icons/fi";

const getNavigationItems = (role) => {
  const commonItems = [
    { name: "Dashboard", path: "/home", show: true },
    { name: "Students", path: "students", show: true },
    { name: "Questions", path: "questions", show: true },
    { name: "Attendance", path: "attendance", show: true },
    { name: "Noticeboard", path: "noticeboard", show: true },
    { name: "Feedback", path: "feedback", show: true },
    { name: "Leaderboard", path: "leaderboard", show: true }
  ];

  const adminItems = [
    { name: "Campus", path: "batches", show: ["super_admin", "admin", "counseller"].includes(role) },
    { name: "Tests", path: "tests", show: ["super_admin", "admin"].includes(role) },
    { name: "Reports", path: "reports", show: ["super_admin", "admin"].includes(role) },
    { name: "Solutions", path: "marks", show: ["super_admin", "admin"].includes(role) },
    { name: "SMS", path: "sms", show: ["super_admin", "admin"].includes(role) },
    { name: "Hospital", path: "hospital", show: ["super_admin", "admin"].includes(role) },
    { name: "Hostel", path: "hostel", show: ["super_admin", "admin", "counseller"].includes(role) },
    { name: "Gate Pass", path: "gatepass", show: ["super_admin", "admin"].includes(role) },
    { name: "Admission", path: "admission", show: ["super_admin", "admin", "counseller"].includes(role) },
    { name: "Settings", path: "settings", show: ["super_admin", "admin"].includes(role) },
    { name: "Staffs", path: "staffs", show: ["super_admin", "admin", "counseller"].includes(role) }
  ];

  return [...commonItems, ...adminItems]
    .filter(item => item.show === true || item.show)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export default function Navigation({ userRole, activeTab, setActiveTab }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleNavigation = (path) => {
    setTimeout(() => {
      navigate(path);
    }, 0);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/searchstudents?query=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.data.length === 0) {
        toast.info("No students found matching your search");
      } else {
        setSearchResults(response.data.data);
        toast.success(`Found ${response.data.data.length} matching students`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Search failed. Please try again.");
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (studentId) => {
    // Clear search results and query
    setSearchQuery("");
    setSearchResults([]);
    // Navigate to student details page
    navigate(`/students/${studentId}`);
  };

  return (
    <div className="w-full h-screen bg-white text-gray-700 p-3 font-bold flex flex-col">
      <img src={logo} alt="" className="mx-auto mb-4" />
      
      {/* Search Bar */}
      <div className="relative mb-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
          >
            {isSearching ? (
              <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FiSearch className="h-5 w-5" />
            )}
          </button>
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((student) => (
              <div
                key={student._id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                onClick={() => handleResultClick(student._id)}
              >
                <img
                  src={student.studentImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName)}&background=random`}
                  alt={student.studentName}
                  className="h-8 w-8 rounded-full mr-3"
                />
                <div>
                  <p className="font-medium">{student.studentName}</p>
                  <p className="text-sm text-gray-500">Reg: {student.regNumber} • {student.campus?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ul className="space-y-2 overflow-y-auto flex-1">
        {getNavigationItems(userRole).map((item) => (
          <li key={item.name}>
            <NavLink
              to={item.path}
              end
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition-all duration-300 ${
                  isActive 
                    ? "bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 text-white shadow-lg"
                    : "hover:bg-gradient-to-r hover:from-red-500/20 hover:via-orange-500/20 hover:to-yellow-400/20 hover:text-gray-900"
                }`
              }
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(item.path);
              }}
            >
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}