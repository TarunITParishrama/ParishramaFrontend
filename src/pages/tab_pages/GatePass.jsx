import React from "react";
import { useNavigate } from "react-router-dom";

export default function GatePass() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Gate Pass</h1>
      </div>

      <div className="max-w-2xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <h2 className="text-lg font-semibold">🚪 Manage Gate Pass</h2>
        <p>Issue and track gate passes here.</p>
      </div>
    </div>
  );
}
