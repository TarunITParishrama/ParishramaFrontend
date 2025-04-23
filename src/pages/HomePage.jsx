import React, { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Dashboard from "./Dashboard";
import logo from "../assets/logo_kannada.png";
import mdlogo from "../assets/MDPhoto.png";

function ParishramaHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (!role) {
      navigate("/");
      return;
    }
    setUserRole(role);
  }, [navigate]);


  const activeTab = location.pathname === "/home" ? "dashboard" : location.pathname.split('/').pop();

  if (!userRole) return null;

  return (
    <div className="flex min-h-screen bg-white ">
      {/* Navigation Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${
        isNavOpen ? "translate-x-0" : "-translate-x-full"
      } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50`}>
        <Navigation 
          userRole={userRole} 
          activeTab={activeTab}
        />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${
        isNavOpen ? "ml-64" : "ml-0"
      }`}>
        {/* Top Navigation Bar */}
        <header className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 shadow-sm h-28">
  <div className="flex items-center justify-between h-full px-4">
    
    {/* Menu Button (left) */}
    <button
      onClick={() => setIsNavOpen(!isNavOpen)}
      className="p-2 rounded-md text-white hover:bg-white hover:text-yellow-400 focus:outline-none"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    {/* Center Logo + Bubbles */}
    <div className="flex flex-col items-center ml-40">
      <div className="h-16 w-auto">
        <img src={logo} alt="LOGO" className="h-full object-contain" />
      </div>
      <div className="flex space-x-3 mt-1">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 bg-black rounded-full"></div>
          <span className="text-xs font-semibold text-gray-800">Creativity</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 bg-red-700 rounded-full"></div>
          <span className="text-xs font-semibold text-gray-800">Honesty</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
          <span className="text-xs font-semibold text-gray-800">Trust</span>
        </div>
      </div>
    </div>

    {/* MD Info + MD Image + Logout (right) */}
    <div className="flex items-center space-x-4">
      <span className="text-white text-sm font-semibold whitespace-nowrap">
        Pradeep Eeshwar, Managing Director
      </span>
      <img src={mdlogo} alt="MDPic" className="w-12 h-12 rounded-full object-cover" />
      <button 
        onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          navigate("/");
        }}
        className="text-white hover:text-red-600 hover:bg-white px-3 py-1 rounded transition"
      >
        Logout
      </button>
    </div>
  </div>
</header>




        {/* Content Area */}
        <main className="p-2 bg-white">
          {activeTab === "dashboard" ? (
            <Dashboard userRole={userRole} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

export default ParishramaHomePage;