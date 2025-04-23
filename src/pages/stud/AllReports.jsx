import React, { useState } from "react";
import StudentReport from "./StudentReport"; // Make sure the path is correct

export default function AllReports() {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div className="p-6 relative">
      {/* Header and Generate Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Student Reports</h2>
        <button
          onClick={() => setShowReportForm(true)}
          className="px-4 py-2 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white rounded transition"
        >
          Generate Student Report
        </button>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="bg-gray-100 p-8 rounded-lg text-center">
        <p className="text-gray-500 text-lg">All Students Reports coming soon...</p>
      </div>

      {/* Student Report Modal */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Student Report Form</h3>
              <button 
                onClick={() => setShowReportForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <StudentReport 
                onClose={() => setShowReportForm(false)} 
                onSubmitSuccess={() => {
                  setShowReportForm(false);
                  // Optional: Add any success handling here
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}