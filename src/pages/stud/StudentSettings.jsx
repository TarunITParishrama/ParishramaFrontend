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
    dateOfBirth: "",
    studentImageURL: "",
    allotmentType: "11th PUC",
    section: "",
    fatherName: "",
    fatherMobile: "",
    emailId: "", // Added emailId field
    address: "",
    contact: "",
    medicalIssues: "No",
    medicalDetails: ""
  });

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

  // Set showMedicalDetails when medicalIssues changes
  useEffect(() => {
    setShowMedicalDetails(formData.medicalIssues === "Yes");
  }, [formData.medicalIssues]);

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
      
      // Format dateOfBirth for display if it exists
      let formattedDOB = "";
      if (studentData.dateOfBirth) {
        const dob = new Date(studentData.dateOfBirth);
        formattedDOB = `${dob.getDate().toString().padStart(2, '0')}-${(dob.getMonth() + 1).toString().padStart(2, '0')}-${dob.getFullYear()}`;
      }
      
      // Set form data and handle medical issues state
      setFormData({
        ...studentData,
        campus: studentData.campus._id,
        dateOfBirth: formattedDOB,
        emailId: studentData.emailId || "", // Set emailId from student data
        medicalIssues: studentData.medicalIssues || "No",
        medicalDetails: studentData.medicalDetails || ""
      });
      
      // If there's an image URL, set the preview
      if (studentData.studentImageURL) {
        setPreviewUrl(studentData.studentImageURL);
      } else {
        setPreviewUrl("");
      }
      
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

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(formData.studentImageURL || "");
    setUploadProgress(0);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!formData.campus) {
      toast.error("Please select a campus");
      return;
    }

    if (formData.medicalIssues === "Yes" && !formData.medicalDetails) {
      toast.error("Please provide medical details");
      return;
    }

    // Upload image if selected but not yet uploaded
    if (selectedFile && (!formData.studentImageURL || 
        formData.studentImageURL !== previewUrl)) {
      try {
        await uploadImage();
      } catch (error) {
        toast.error("Image upload failed");
        return;
      }
    }

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
        emailId: "", // Reset emailId
        address: "",
        contact: "",
        medicalIssues: "No",
        medicalDetails: ""
      });
      setPreviewUrl("");
      setSelectedFile(null);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to delete student";
      toast.error(errorMsg);
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async () => {
    if (!formData.regNumber || !formData.studentImageURL) {
      toast.error("No image to delete");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.delete(
        `${process.env.REACT_APP_URL}/api/delete-student-image/${formData.regNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setFormData(prev => ({ ...prev, studentImageURL: "" }));
      setPreviewUrl("");
      setSelectedFile(null);
      toast.success("Image deleted successfully");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Failed to delete image";
      toast.error(errorMsg);
      console.error("Delete image error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "dateOfBirth") {
      // For date input, we get YYYY-MM-DD format from the input
      const [year, month, day] = value.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      setFormData(prev => ({ ...prev, [name]: formattedDate }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  
    if (name === "medicalIssues") {
      setShowMedicalDetails(value === "Yes");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Student Settings</h2>
      
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
        <label className="block text-gray-700 mb-1 font-medium">Enter Registration Number</label>
        <div className="flex">
          <input
            type="text"
            value={regNumber}
            onChange={(e) => setRegNumber(e.target.value)}
            className="border p-2 rounded-l flex-1 focus:ring-2 focus:ring-orange-500"
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
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-1 font-medium">Campus *</label>
                <div className="flex items-center gap-2 mb-1">
                  {student?.campus?.name && (
                    <span className="text-sm text-gray-600">
                      Current: {student.campus.name} ({student.campus.type})
                    </span>
                  )}
                </div>
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

              {/* Registration Number (read-only) */}
              <div>
                <label className="block text-gray-700 mb-1 font-medium">Registration Number</label>
                <input
                  type="text"
                  value={formData.regNumber}
                  readOnly
                  className="w-full border border-gray-300 p-2 rounded-md bg-gray-100"
                />
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
              <div>
                <label className="block text-gray-700 mb-1 font-medium">Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={
                  formData.dateOfBirth 
                  ? formData.dateOfBirth.split('-').reverse().join('-') // Convert DD-MM-YYYY to YYYY-MM-DD for input
                  : ''
                }
                onChange={handleChange}
                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
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
                  <div className="mt-3 relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-24 w-24 object-cover rounded-md border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={deleteImage}
                      disabled={loading}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                      title="Delete image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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
                <label className="block text-gray-700 mb-1 font-medium">Parent's Name *</label>
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
                <label className="block text-gray-700 mb-1 font-medium">Parent's Mobile *</label>
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

              {/* Email ID */}
              <div>
                <label className="block text-gray-700 mb-1 font-medium">Parent's Email</label>
                <input
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
                  placeholder="parent@example.com"
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
                  disabled={loading}
                  className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-3 px-8 rounded-lg hover:from-red-700 hover:via-orange-600 hover:to-yellow-500 disabled:opacity-50 font-medium text-lg shadow-md transition-all duration-300"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    "Update Student"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-red-50 p-6 rounded-lg">
              <h3 className="text-xl font-medium text-red-800 mb-4">Delete Student</h3>
              <div className="mb-4 flex items-center space-x-4">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={student.studentName}
                    className="h-16 w-16 object-cover rounded-full border-2 border-red-300"
                  />
                )}
                <div>
                  <p className="font-medium text-lg">{student.studentName}</p>
                  <p className="text-gray-600">Registration: {student.regNumber}</p>
                  {student.campus?.name && (
                    <p className="text-gray-600">Campus: {student.campus.name}</p>
                  )}
                  {student.emailId && (
                    <p className="text-gray-600">Email: {student.emailId}</p>
                  )}
                </div>
              </div>
              <p className="mb-6 text-red-700">
                Warning: This action cannot be undone. All data associated with this student will be permanently removed.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab("edit")}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
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