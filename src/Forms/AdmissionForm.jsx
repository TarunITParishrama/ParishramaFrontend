import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdmissionForm() {
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regNumberExists, setRegNumberExists] = useState(false);
  const [sectionOptions, setSectionOptions] = useState([]);

  const [formData, setFormData] = useState({
    admissionYear: new Date().getFullYear(),
    campus: "",
    gender: "Boy",
    admissionType: "Residential",
    regNumber: "",
    studentName: "",
    studentImageURL: "",
    allotmentType: "PUC",
    section: "",
    fatherName: "",
    fatherMobile: "",
    address: "",
    contact: "",
    medicalIssues: "None"
  });

  // Fetch campuses on mount with toast
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        toast.info("Loading campuses...");
        const token = localStorage.getItem("token");
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/getcampuses`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCampuses(response.data.data);
        toast.dismiss();
      } catch (error) {
        toast.error("Failed to load campuses. Please try again later.");
        console.error("Campus fetch error:", error);
      }
    };
    fetchCampuses();
  }, []);

  // Update section options when allotmentType changes
  useEffect(() => {
    const sections = {
      PUC: ["11th+PCMB"],
      LongTerm: ["12th+PCMB", "NEET Coaching", "JEE Coaching"]
    };
    setSectionOptions(sections[formData.allotmentType] || []);
    setFormData(prev => ({ ...prev, section: "" }));
  }, [formData.allotmentType]);

  // Check if regNumber already exists with toast
  const checkRegNumber = async () => {
    if (formData.regNumber.length === 6) {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/checkregnumber/${formData.regNumber}`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        if (response.data.exists) {
          toast.error(`Registration number ${formData.regNumber} already exists`);
          setRegNumberExists(true);
        } else {
          toast.success("Registration number is available");
          setRegNumberExists(false);
        }
      } catch (error) {
        toast.error("Error checking registration number");
        console.error("Reg number check error:", error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === "regNumber") {
      setRegNumberExists(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (regNumberExists) {
      toast.error("Cannot submit: Registration number already exists");
      return;
    }

    if (!formData.campus) {
      toast.error("Please select a campus");
      return;
    }

    try {
      setLoading(true);
      toast.info("Registering student...");
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.REACT_APP_URL}/api/createstudent`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      toast.success("Student registered successfully!");
      
      // Reset form but keep campus and year
      setFormData(prev => ({
        ...prev,
        regNumber: "",
        studentName: "",
        section: "",
        fatherName: "",
        fatherMobile: "",
        address: "",
        contact: ""
      }));
      setRegNumberExists(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Registration failed. Please check all fields.";
      toast.error(errorMsg);
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6">
      <h2 className="text-xl font-semibold mb-4">New Student Admission</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Campus Selection */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1">Campus *</label>
          <select
            name="campus"
            value={formData.campus}
            onChange={handleChange}
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
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          >
            {[2024, 2025, 2026, 2027, 2028].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Registration Number */}
        <div>
          <label className="block text-gray-700 mb-1">Registration Number *</label>
          <input
            type="text"
            name="regNumber"
            value={formData.regNumber}
            onChange={handleChange}
            onBlur={checkRegNumber}
            className={`w-full border p-2 rounded ${regNumberExists ? "border-red-500" : ""}`}
            pattern="\d{6}"
            maxLength={6}
            required
          />
          {regNumberExists && (
            <p className="text-red-500 text-sm mt-1">This registration number already exists</p>
          )}
        </div>

        {/* Student Name */}
        <div>
          <label className="block text-gray-700 mb-1">Student Name *</label>
          <input
            type="text"
            name="studentName"
            value={formData.studentName}
            onChange={handleChange}
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
            onChange={handleChange}
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
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="Residential">Residential</option>
            <option value="Semi-Residential">Semi-Residential</option>
            <option value="Non-Residential">Non-Residential</option>
          </select>
        </div>

        {/* Allotment Type */}
        <div>
          <label className="block text-gray-700 mb-1">Allotment Type *</label>
          <select
            name="allotmentType"
            value={formData.allotmentType}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="PUC">PUC (11th/12th)</option>
            <option value="LongTerm">Long Term (NEET/JEE Coaching)</option>
          </select>
        </div>

        {/* Section - dynamically populated based on allotmentType */}
        <div>
          <label className="block text-gray-700 mb-1">Section *</label>
          <select
            name="section"
            value={formData.section}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
            disabled={!formData.allotmentType}
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
            onChange={handleChange}
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
            onChange={handleChange}
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
            onChange={handleChange}
            className="w-full border p-2 rounded"
            rows={3}
            required
          />
        </div>

        {/* Contact (Optional) */}
        <div>
          <label className="block text-gray-700 mb-1">Alternate Contact</label>
          <input
            type="tel"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
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
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading || regNumberExists}
            className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-6 rounded-lg hover:bg-yellow-500 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Register Student"}
          </button>
        </div>
      </form>
    </div>
  );
}