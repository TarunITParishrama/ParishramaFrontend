import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StudentData() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      toast.info("Loading student data...");
      const token = localStorage.getItem("token");
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getstudents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.data);
      toast.dismiss();
    } catch (error) {
      toast.error("Failed to load student data. Please try again later.");
      console.error("Student fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Admitted Students</h2>
      {loading ? (
        <div className="text-center py-8">
          <p>Loading student data...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No student records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Father's Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Father's Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campus</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <img 
                      src={student.studentImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName)}&background=random`}
                      alt={student.studentName}
                      className="h-10 w-10 rounded-full"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.regNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.studentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.fatherName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.fatherMobile}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.campus?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}