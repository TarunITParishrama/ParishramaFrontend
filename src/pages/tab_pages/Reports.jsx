import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NewReport from "../stud/NewReport";

export default function Reports() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [showNewReport, setShowNewReport] = useState(false);
  const [loading, setLoading] = useState(true); // Add a loading state

  useEffect(() => {
    // Fetch student details from the backend API
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_URL}/api/students`);
        if (response.ok) {
          const data = await response.json();
          setStudents(data);
        } else {
          console.error("Failed to fetch students");
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false); // Set loading to false after the fetch completes
      }
    };

    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      {/* Students List */}
      <div className="max-w-7xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <h2 className="text-lg font-semibold mb-4">📊Tests Reports</h2>
        <div className="px-6 flex justify-end">
          <button
            onClick={() => setShowNewReport(true)}
            className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            New Report +
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p className="text-gray-500">Loading students...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {students.length > 0 ? (
              students.map((student, index) => (
                <div
                  key={index}
                  onClick={() => navigate(`/studentreport/${student.rollNo}`)}
                  className="cursor-pointer flex flex-col items-center bg-gray-50 hover:bg-gray-200 p-4 rounded-lg shadow transition"
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName)}&background=random`}
                    alt={student.studentName}
                    className="w-16 h-16 rounded-full mb-2"
                  />
                  <h3 className="text-sm font-medium">{student.studentName}</h3>
                  <p className="text-xs text-gray-600">Roll No: {student.rollNo}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No students found.</p>
            )}
          </div>
        )}
      </div>

      {/* New Report Modal */}
      {showNewReport && <NewReport onClose={() => setShowNewReport(false)} />}
    </div>
  );
}