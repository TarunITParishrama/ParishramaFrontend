import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StudentData() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Format date function for individual student
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      // Check if it's already in DD-MM-YYYY format
      if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateString.split('-');
        return `${day}-${month}-${year}`;
      }
      
      // Handle ISO date strings or Date objects
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getInitialsAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=64`;
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admitted Students</h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-gray-500">No student records have been added yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Birth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent's Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent's Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-14 w-14 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-300">
                        {student.studentImageURL ? (
                          <img
                            src={student.studentImageURL}
                            alt={student.studentName}
                            className="h-14 w-14 object-cover rounded-full cursor-pointer"
                            onClick={() => {
                              setSelectedImage(student.studentImageURL);
                              setIsModalOpen(true);
                            }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = getInitialsAvatar(student.studentName);
                            }}
                          />
                        ) : (
                          <img
                            src={getInitialsAvatar(student.studentName)}
                            alt={student.studentName}
                            className="h-14 w-14 object-cover rounded-full"
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.regNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(student.dateOfBirth)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.fatherName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.fatherMobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.campus?.name || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Zoomed Student"
                  className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
                />
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}