// Part 1
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdmissionForm() {
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regNumberExists, setRegNumberExists] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMedicalDetails, setShowMedicalDetails] = useState(false);

  const [formData, setFormData] = useState({
    admissionYear: new Date().getFullYear(),
    campus: "",
    gender: "Boy",
    admissionType: "Residential",
    regNumber: "",
    studentName: "",
    studentImageURL: "",
    allotmentType: "11th PUC",
    section: "",
    fatherName: "",
    fatherMobile: "",
    address: "",
    contact: "",
    medicalIssues: "No",
    medicalDetails: ""
  });

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
  // Part 2 (continued from Part 1)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "regNumber") {
      setRegNumberExists(false);
    }

    if (name === "medicalIssues") {
      setShowMedicalDetails(value === "Yes");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPG, JPEG, PNG, or WEBP files are allowed");
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadProgress(0);
  };

  const uploadImage = async () => {
    if (!selectedFile || !formData.regNumber) return;

    try {
      setUploadProgress(0);
      toast.info("Uploading image...");

      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      const token = localStorage.getItem("token");

      const { data } = await axios.get(
        `${process.env.REACT_APP_URL}/api/generate-image-upload-url/${formData.regNumber}/.${fileExt}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', data.uploadURL);
      // xhr.setRequestHeader('Content-Type', selectedFile.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          await new Promise(resolve => setTimeout(resolve, 500)); // small delay
          setFormData(prev => ({ ...prev, studentImageURL: data.viewURL }));
          toast.success("Image uploaded successfully!");
        } else {
          throw new Error('Upload failed');
        }
      };

      xhr.onerror = () => {
        throw new Error('Upload failed');
      };

      xhr.send(selectedFile);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Image upload failed");
    }
  };
  // Part 3 (continued)

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setUploadProgress(0);
    setFormData(prev => ({ ...prev, studentImageURL: "" }));
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

    if (!formData.contact) {
      toast.error("Alternate contact is required");
      return;
    }

    if (formData.medicalIssues === "Yes" && !formData.medicalDetails) {
      toast.error("Please provide medical details");
      return;
    }

    if (selectedFile && !formData.studentImageURL) {
      try {
        await uploadImage();
      } catch (error) {
        toast.error("Image upload failed");
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      toast.info("Registering student...");

      await axios.post(
        `${process.env.REACT_APP_URL}/api/createstudent`,
        { ...formData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        }
      );

      toast.success("Student registered successfully!");

      setFormData(prev => ({
        admissionYear: prev.admissionYear,
        campus: prev.campus,
        gender: "Boy",
        admissionType: "Residential",
        regNumber: "",
        studentName: "",
        studentImageURL: "",
        allotmentType: "11th PUC",
        section: "",
        fatherName: "",
        fatherMobile: "",
        address: "",
        contact: "",
        medicalIssues: "No",
        medicalDetails: ""
      }));
      
      setSelectedFile(null);
      setPreviewUrl("");
      setUploadProgress(0);
      setRegNumberExists(false);
      setShowMedicalDetails(false);

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Registration failed. Please check all fields.";
      toast.error(errorMsg);
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };
  // Part 4 (continued)

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">New Student Admission</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Campus Selection */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1 font-medium">Campus *</label>
          <select
            name="campus"
            value={formData.campus}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
          <label className="block text-gray-700 mb-1 font-medium">Admission Year *</label>
          <select
            name="admissionYear"
            value={formData.admissionYear}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            {[2024, 2025, 2026, 2027, 2028].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Registration Number */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Registration Number *</label>
          <input
            type="text"
            name="regNumber"
            value={formData.regNumber}
            onChange={handleChange}
            onBlur={checkRegNumber}
            className={`w-full border ${regNumberExists ? "border-red-500" : "border-gray-300"} p-2 rounded-md focus:ring-2 focus:ring-orange-500`}
            pattern="\d{6}"
            maxLength={6}
            placeholder="6-digit number"
            required
          />
          {regNumberExists && (
            <p className="text-red-500 text-sm mt-1">This registration number already exists</p>
          )}
        </div>

        {/* Student Name */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Student Name *</label>
          <input
            type="text"
            name="studentName"
            value={formData.studentName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            placeholder="Enter the name as per 10th Marks Card"
            required
          />
        </div>

        {/* Student Image Upload */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1 font-medium">Student Photo</label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="file"
                id="studentImage"
                accept="image/jpeg, image/jpg, image/png, image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <label
                htmlFor="studentImage"
                className="inline-block px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            {selectedFile && (
              <span className="text-sm text-gray-600">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          {/* Upload and Cancel buttons */}
          {selectedFile && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={uploadImage}
                  disabled={uploadProgress > 0 && uploadProgress < 100}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {uploadProgress > 0 ? `${uploadProgress}%` : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Cancel
                </button>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-orange-500 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}

          {/* Preview Uploaded Image */}
          {previewUrl && (
            <div className="mt-3">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-24 w-24 object-cover rounded-md border border-gray-300"
              />
            </div>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Gender *</label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            <option value="Boy">Boy</option>
            <option value="Girl">Girl</option>
          </select>
        </div>

        {/* Admission Type */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Admission Type *</label>
          <select
            name="admissionType"
            value={formData.admissionType}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            <option value="Residential">Residential</option>
            <option value="Semi-Residential">Semi-Residential</option>
            <option value="Non-Residential">Non-Residential</option>
          </select>
        </div>

        {/* Allotment Type */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Allotment Type *</label>
          <select
            name="allotmentType"
            value={formData.allotmentType}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            <option value="11th PUC">11th PUC</option>
            <option value="12th PUC">12th PUC</option>
            <option value="LongTerm">Long Term (NEET/JEE Coaching)</option>
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Section *</label>
          <input
            type="text"
            name="section"
            value={formData.section}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            placeholder="e.g. PCMB, NEET Batch A, etc."
            required
          />
        </div>

        {/* Father's Name */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Father's Name *</label>
          <input
            type="text"
            name="fatherName"
            value={formData.fatherName}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        {/* Father's Mobile */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Father's Mobile *</label>
          <input
            type="tel"
            name="fatherMobile"
            value={formData.fatherMobile}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            pattern="\d{10}"
            maxLength={10}
            placeholder="10-digit number"
            required
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1 font-medium">Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            rows={3}
            required
          />
        </div>

        {/* Alternate Contact */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Alternate Contact *</label>
          <input
            type="tel"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            pattern="\d{10}"
            maxLength={10}
            placeholder="10-digit number"
            required
          />
        </div>

        {/* Medical Issues */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">Medical Issues *</label>
          <select
            name="medicalIssues"
            value={formData.medicalIssues}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>

          {showMedicalDetails && (
            <div className="mt-2">
              <textarea
                name="medicalDetails"
                value={formData.medicalDetails}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
                rows={2}
                placeholder="Please specify medical conditions"
                maxLength={200}
                required={formData.medicalIssues === "Yes"}
              />
              <p className="text-xs text-gray-500">Max 200 characters</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2 mt-4">
          <button
            type="submit"
            disabled={loading || regNumberExists}
            className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-3 px-8 rounded-lg hover:from-red-700 hover:via-orange-600 hover:to-yellow-500 disabled:opacity-50 font-medium text-lg shadow-md transition-all duration-300"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Register Student"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

          