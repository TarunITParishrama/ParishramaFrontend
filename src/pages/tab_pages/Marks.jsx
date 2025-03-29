import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SolutionForm from "../../Forms/SolutionForm";
import ViewSolutions from '../ViewSolutions';

export default function Marks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("view");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSuccess = (response) => {
    setSuccessMessage("Solution created successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Marks</h1>

        <div className="mt-4 flex space-x-6">
          {["view", "add", "edit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "view" ? "View Solutions" : tab === "add" ? "Add Solutions" : "Edit Solutions"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        {activeTab === "view" && <ViewSolutions />}
        {activeTab === "add" && (
          <>
            <SolutionForm onSuccess={handleSuccess} />
          </>
        )}
        {activeTab === "edit" && <h2 className="text-lg font-semibold">✏️ Edit Marks (Coming Soon...)</h2>}
      </div>
    </div>
  );
}