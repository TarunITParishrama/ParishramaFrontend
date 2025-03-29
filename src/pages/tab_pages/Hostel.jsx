import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Hostel() {
  const navigate = useNavigate();

  // State to track active tab
  const [activeTab, setActiveTab] = useState("hostels");

  // Sample data for hostels
  const [hostels, setHostels] = useState([
    {
      id: 1,
      name: "Parishrama Building",
      floors: 3,
      rooms: 51,
      beds: { total: 288, filled: 246, empty: 42 },
      inCharge: "Hanumantharao Y",
    },
    {
      id: 2,
      name: "PB (PU)",
      floors: 3,
      rooms: 21,
      beds: { total: 126, filled: 108, empty: 18 },
      inCharge: "Hanumantharao Y",
    },
    {
      id: 3,
      name: "PG - 24 (PU)",
      floors: 4,
      rooms: 25,
      beds: { total: 146, filled: 48, empty: 98 },
      inCharge: "Hanumantharao Y",
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Custom Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button
          onClick={() => navigate(-1)}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Hostel</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          <button
            onClick={() => setActiveTab("hostels")}
            className={`pb-1 ${activeTab === "hostels" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            Hostels
          </button>
          <button
            onClick={() => setActiveTab("bed-allocation")}
            className={`pb-1 ${activeTab === "bed-allocation" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            Bed Allocation
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`pb-1 ${activeTab === "rooms" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            Rooms
          </button>
          <button
            onClick={() => setActiveTab("food")}
            className={`pb-1 ${activeTab === "food" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            Food
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        <div className="flex justify-between items-center">
          <button className="bg-blue-500 text-white py-2 px-4 rounded">📅 2024-25</button>
          <button className="bg-blue-600 text-white py-2 px-4 rounded flex items-center">
            🏨 New
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 my-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-2xl font-bold">10</h3>
            <p className="text-gray-600">Total Hostels</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-2xl font-bold">347</h3>
            <p className="text-gray-600">Total Rooms</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-2xl font-bold">1233</h3>
            <p className="text-gray-600">Beds Filled</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-2xl font-bold">533</h3>
            <p className="text-gray-600">Beds Empty</p>
          </div>
        </div>

        {/* Hostel List */}
        <div className="space-y-4">
          {hostels.map((hostel) => (
            <div
              key={hostel.id}
              className="bg-white shadow-md rounded-lg p-4 flex flex-col"
            >
              <h3 className="text-lg font-semibold">
                {hostel.id}. {hostel.name}
              </h3>
              <p className="text-gray-600">{hostel.name}</p>
              <p className="text-gray-500">🏢 Floors: {hostel.floors}</p>
              <p className="text-gray-500">🏠 Rooms: {hostel.rooms}</p>
              <p className="text-gray-500">
                🛏 Beds: {hostel.beds.total}, Filled: {hostel.beds.filled}, Empty: {hostel.beds.empty}
              </p>
              <div className="flex items-center mt-2">
                <img
                  src="https://via.placeholder.com/40"
                  alt="Staff"
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <p className="font-medium">{hostel.inCharge}</p>
                  <p className="text-gray-500 text-sm">In-charge Staff</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
