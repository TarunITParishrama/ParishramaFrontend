//import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Hospital() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Hospital Management(Coming Soon)</h1>
      </div>
    </div>
  );
}
