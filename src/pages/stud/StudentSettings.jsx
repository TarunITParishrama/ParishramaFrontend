import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StudentSettings() {
  const [regNumber, setRegNumber] = useState("");
  const [student, setStudent] = useState(null);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");
  const [formData, setFormData] = useState({
    admissionYear: "",
    campus: "",
    gender: "Boy",
    admissionType: "Residential",
    regNumber: "",
    studentName: "",
    allotmentType: "PUC",
    section: "",
    fatherName: "",
    fatherMobile: "",
    address: "",
    contact: "",
    medicalIssues: "None"
  });
  const [sectionOptions, setSectionOptions] = useState([]);

  // Fetch campuses on component mount
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/getcampuses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCampuses(response.data.data);
        toast.success("Campuses loaded successfully");
      } catch (error) {
        toast.error("Failed to load campuses");
        console.error("Campus fetch error:", error);
      }
    };
    fetchCampuses();
  }, []);

  // Update section options when allotmentType changes
  useEffect(() => {
    const sections = {
      PUC: ["11th+PCB", "11th+PCM", "11th+Commerce", "11th+Arts"],
      LongTerm: ["12th+PCB", "12th+PCM", "NEET Coaching", "JEE Coaching"]
    };
    setSectionOptions(sections[formData.allotmentType] || []);
  }, [formData.allotmentType]);

  const fetchStudent = async () => {
    if (!regNumber.match(/^\d{6}$/)) {
      toast.error("Please enter a valid 6-digit registration number");
      return;
    }
  
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getstudentbyreg/${regNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      if (!response.data.data) {
        toast.error(`No student found with registration number: ${regNumber}`);
        setStudent(null);
        return;
      }
  
      const studentData = response.data.data;
      setStudent(studentData);
      setFormData({
        ...studentData,
        campus: studentData.campus._id
      });
      toast.success("Student details loaded successfully");
    } catch (error) {
      if (error.response && error.response.status === 404) {
        toast.error(`Student with registration number ${regNumber} not found`);
      } else {
        toast.error("Failed to fetch student details. Please try again.");
        console.error("Fetch error:", error);
      }
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      toast.info("Updating student details...");
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${process.env.REACT_APP_URL}/api/updatestudent/${student._id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh student data
      const updatedStudent = await axios.get(
        `${process.env.REACT_APP_URL}/api/getstudentbyreg/${regNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setStudent(updatedStudent.data.data);
      toast.success("Student updated successfully!");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to update student";
      toast.error(errorMsg);
      console.error("Update error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${student.studentName} (Reg: ${student.regNumber})?`)) {
      return;
    }

    try {
      setLoading(true);
      toast.info("Deleting student record...");
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_URL}/api/deletestudent/${student._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Student ${student.studentName} deleted successfully`);
      setStudent(null);
      setRegNumber("");
      setFormData({
        admissionYear: "",
        campus: "",
        gender: "Boy",
        admissionType: "Residential",
        regNumber: "",
        studentName: "",
        allotmentType: "PUC",
        section: "",
        fatherName: "",
        fatherMobile: "",
        address: "",
        contact: "",
        medicalIssues: "None"
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to delete student";
      toast.error(errorMsg);
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Student Settings</h2>
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("edit")}
          className={`px-4 py-2 rounded ${
            activeTab === "edit" 
              ? "bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white" 
              : "bg-gray-200"
          }`}
        >
          Edit Student
        </button>
        <button
          onClick={() => setActiveTab("delete")}
          className={`px-4 py-2 rounded ${
            activeTab === "delete" 
              ? "bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white" 
              : "bg-gray-200"
          }`}
        >
          Delete Student
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-1">Enter Registration Number</label>
        <div className="flex">
          <input
            type="text"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            className="border p-2 rounded-l flex-1"
            placeholder="6-digit reg number"
            pattern="\d{6}"
            maxLength={6}
          />
          <button
            onClick={fetchStudent}
            disabled={loading}
            className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white px-4 py-2 rounded-r disabled:opacity-50"
          >
            {loading ? "Fetching..." : "Fetch"}
          </button>
        </div>
      </div>

      {student && (
        <div>
          {activeTab === "edit" ? (
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campus Selection */}
              <div>
                <label className="block text-gray-700 mb-1">Campus *</label>
                <select
                  name="campus"
                  value={formData.campus}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">Select Campus</option>
                  {campuses.map(campus => (
                    <option key={campus._id} value={campus._id}>
                      {campus.name} ({campus.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Admission Year */}
              <div>
                <label className="block text-gray-700 mb-1">Admission Year *</label>
                <select
                  name="admissionYear"
                  value={formData.admissionYear}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Registration Number (read-only) */}
              <div>
                <label className="block text-gray-700 mb-1">Registration Number</label>
                <input
                  type="text"
                  value={formData.regNumber}
                  readOnly
                  className="w-full border p-2 rounded bg-gray-100"
                />
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-gray-700 mb-1">Student Name *</label>
                <input
                  type="text"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-gray-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="Boy">Boy</option>
                  <option value="Girl">Girl</option>
                </select>
              </div>

              {/* Admission Type */}
              <div>
                <label className="block text-gray-700 mb-1">Admission Type *</label>
                <select
                  name="admissionType"
                  value={formData.admissionType}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="Residential">Residential</option>
                  <option value="Semi-Residential">Semi-Residential</option>
                </select>
              </div>

              {/* Allotment Type */}
              <div>
                <label className="block text-gray-700 mb-1">Allotment Type *</label>
                <select
                  name="allotmentType"
                  value={formData.allotmentType}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="PUC">PUC (11th/12th)</option>
                  <option value="LongTerm">Long Term (NEET/JEE Coaching)</option>
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-gray-700 mb-1">Section *</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">Select Section</option>
                  {sectionOptions.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              {/* Father's Name */}
              <div>
                <label className="block text-gray-700 mb-1">Father's Name *</label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              {/* Father's Mobile */}
              <div>
                <label className="block text-gray-700 mb-1">Father's Mobile *</label>
                <input
                  type="tel"
                  name="fatherMobile"
                  value={formData.fatherMobile}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  pattern="\d{10}"
                  maxLength={10}
                  required
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-1">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  rows={3}
                  required
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-gray-700 mb-1">Alternate Contact</label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                  pattern="\d{10}"
                  maxLength={10}
                />
              </div>

              {/* Medical Issues */}
              <div>
                <label className="block text-gray-700 mb-1">Medical Issues</label>
                <input
                  type="text"
                  name="medicalIssues"
                  value={formData.medicalIssues}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded"
                />
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-6 rounded-lg hover:bg-yellow-500 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Student"}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-red-800 mb-2">Delete Student</h3>
              <p className="mb-4">Are you sure you want to permanently delete <strong>{student.studentName}</strong> (Registration: {student.regNumber})?</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("edit")}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
     </div>
  );
}