import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Hospital() {
  const navigate = useNavigate();

  // State to track active tab
  const [activeTab, setActiveTab] = useState("hospitals");

  // Dummy function to simulate refresh
  const handleRefresh = () => {
    alert("Data refreshed successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Hospital Management</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          <button
            onClick={() => setActiveTab("hospitals")}
            className={`pb-1 ${activeTab === "hospitals" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            Hospitals
          </button>
          <button
            onClick={() => setActiveTab("newReport")}
            className={`pb-1 ${activeTab === "newReport" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            New Hospital Report
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {activeTab === "hospitals" ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Hospital List</h2>
              <button onClick={handleRefresh} className="bg-gray-200 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-300">
                🔄 Refresh
              </button>
            </div>
            <p className="text-gray-500 mb-4">🏥 Manage hospital reports and records.</p>
            <div className="bg-white p-4 shadow-md rounded-lg">
              <p>No hospital data available yet.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">New Hospital Report</h2>
              <button onClick={handleRefresh} className="bg-gray-200 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-300">
                🔄 Refresh
              </button>
            </div>

            {/* Form for Hospital Report */}
            <form className="bg-white p-6 rounded-lg shadow-md mt-4 space-y-4">
  {/* Select Section & Student */}
  <div className="grid grid-cols-2 gap-4">
    {/* Section Dropdown with Refresh Button */}
    <div className="relative">
      <label className="block text-gray-700">Select Section *</label>
      <div className="flex items-center">
        <select className="w-full p-2 border border-gray-300 rounded mt-1">
          <option value="">Select Section</option>
        </select>
        <button onClick={handleRefresh} className="ml-2 bg-gray-200 px-2 py-1 rounded-md hover:bg-gray-300">
          🔄
        </button>
      </div>
    </div>

    {/* Student Dropdown */}
    <div className="relative">
      <label className="block text-gray-700">Select Student *</label>
      <select className="w-full p-2 border border-gray-300 rounded mt-1" disabled>
        <option value="">Please select class first</option>
      </select>
    </div>
  </div>

  {/* Student Health Issue & Explanation */}
  <div className="grid grid-cols-2 gap-4">
    {/* Health Issue with Refresh Button */}
    <div className="relative">
      <label className="block text-gray-700">Student Health Issue *</label>
      <div className="flex items-center">
        <input type="text" className="w-full p-2 border border-gray-300 rounded mt-1" />
        <button onClick={handleRefresh} className="ml-2 bg-gray-200 px-2 py-1 rounded-md hover:bg-gray-300">
          🔄
        </button>
      </div>
    </div>

    {/* Health Issue Explanation */}
    <div>
      <label className="block text-gray-700">Student Health Issue Explanation *</label>
      <textarea className="w-full p-2 border border-gray-300 rounded mt-1"></textarea>
    </div>
  </div>

  {/* Hospital Name & Treatment Amount */}
  <div className="grid grid-cols-2 gap-4">
    {/* Hospital Name with Refresh Button */}
    <div className="relative">
      <label className="block text-gray-700">Hospital Name *</label>
      <div className="flex items-center">
        <select className="w-full p-2 border border-gray-300 rounded mt-1">
          <option value="">Hospital Name</option>
        </select>
        <button onClick={handleRefresh} className="ml-2 bg-gray-200 px-2 py-1 rounded-md hover:bg-gray-300">
          🔄
        </button>
      </div>
    </div>

    {/* Treatment Amount */}
    <div>
      <label className="block text-gray-700">Treatment Amount *</label>
      <input type="text" className="w-full p-2 border border-gray-300 rounded mt-1" placeholder="Hospital Treatment Amount" />
    </div>
  </div>

  {/* Hospital Report File */}
  <div>
    <label className="block text-gray-700">Select Hospital Report File</label>
    <input type="file" className="w-full p-2 border border-gray-300 rounded mt-1" />
  </div>

  {/* Staff Attended & Campus Out Time */}
  <div className="grid grid-cols-2 gap-4">
    {/* Staff Attended */}
    <div>
      <label className="block text-gray-700">Staff Attended *</label>
      <select className="w-full p-2 border border-gray-300 rounded mt-1">
        <option value="">Which staff taken to the hospital</option>
      </select>
    </div>

    {/* Campus Out Time */}
    <div>
      <label className="block text-gray-700">Campus Out Time *</label>
      <input type="time" className="w-full p-2 border border-gray-300 rounded mt-1" />
    </div>
  </div>

  {/* Campus In Time */}
  <div>
    <label className="block text-gray-700">Campus In Time *</label>
    <input type="time" className="w-full p-2 border border-gray-300 rounded mt-1" />
  </div>

  {/* Buttons */}
  <div className="flex justify-between mt-4">
    <button type="button" className="bg-gray-400 text-white py-2 px-4 rounded hover:bg-gray-500">
      ❌ Cancel
    </button>
    <button type="submit" className="bg-gray-400 text-white py-2 px-4 rounded hover:bg-gray-500">
      ➕ Create
    </button>
  </div>
</form>


          </div>
        )}
      </div>
    </div>
  );
}
