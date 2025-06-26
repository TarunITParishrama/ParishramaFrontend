import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StudentProfile() {
  const { regNumber } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("You are not logged in");
          navigate("/");
          return;
        }

        console.log("Token being sent:", token);
        console.log("Fetching student with regNumber:", regNumber);

        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getstudentbyreg/${regNumber}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setStudent(response.data.data);
      } catch (error) {
        console.error("Error details:", error.response); // More detailed error logging
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          navigate("/");
        } else {
          toast.error("Failed to load student data. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [regNumber, navigate]);

  const getInitialsAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=150`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">
          Student not found
        </h3>
        <p className="mt-1 text-gray-500">
          No student found with registration number: {regNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8">
        <button
          onClick={() => navigate("/home")}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back To Dashboard
        </button>
        <h1 className="text-3xl font-bold">Student Profile</h1>
      </div>

      <div className="max-w-4xl mx-auto mt-6 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          {/* Student Header with Photo and Basic Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 border-b pb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-lg">
                {student.studentImageURL ? (
                  <img
                    src={student.studentImageURL}
                    alt={student.studentName}
                    className="w-full h-full object-cover cursor-pointer"
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
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">
                {student.studentName}
              </h2>
              <p className="text-gray-600 mb-2">Reg No: {student.regNumber}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Section</p>
                  <p className="font-medium">{student.section}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Admission Year</p>
                  <p className="font-medium">{student.admissionYear}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">
                    {formatDate(student.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{student.gender}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Information Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
                Personal Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Parent's Name</p>
                  <p className="font-medium">{student.fatherName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parent's Mobile</p>
                  <p className="font-medium">{student.fatherMobile}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Number</p>
                  <p className="font-medium">{student.contact || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{student.address}</p>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
                Academic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Campus</p>
                  <p className="font-medium">{student.campus?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Allotment Type</p>
                  <p className="font-medium">{student.admissionType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Admission Type</p>
                  <p className="font-medium">{student.allotmentType}</p>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
                Medical Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Medical Issues</p>
                  <p className="font-medium">{student.medicalIssues}</p>
                </div>
                {student.medicalDetails && (
                  <div>
                    <p className="text-sm text-gray-500">Medical Details</p>
                    <p className="font-medium">{student.medicalDetails}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
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
  );
}
