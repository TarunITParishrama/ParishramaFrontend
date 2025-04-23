import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionsForm from "../../Forms/QuestionsForm";

export default function Questions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Questions</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {["all", "add", "edit"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "all" ? "All Questions" : tab === "add" ? "Add Question" : "Edit Question"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        {activeTab === "all" && <h2 className="text-lg font-semibold">📖 All Questions</h2>}
        {activeTab === "add" && (
          <>
            <h2 className="text-lg font-semibold">➕ Add New Question</h2>
            <QuestionsForm />
          </>
        )}
        {activeTab === "edit" && <h2 className="text-lg font-semibold">✏️ Edit Question (Coming Soon...)</h2>}
      </div>
    </div>
  );
}