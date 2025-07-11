import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { read, utils } from "xlsx";
import { Upload, AArrowUp } from "lucide-react";

export default function AdmissionForm() {
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [regNumberExists, setRegNumberExists] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMedicalDetails, setShowMedicalDetails] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [failedStudents, setFailedStudents] = useState([]);

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
    address: "",
    contact: "",
    medicalIssues: "No",
    medicalDetails: "",
  });

  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        toast.info("Loading campuses...");
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getcampuses`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
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
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.exists) {
          toast.error(
            `Registration number ${formData.regNumber} already exists`
          );
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

    if (name === "dateOfBirth") {
      const date = new Date(value);
      const utcDate = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      const formattedDate = utcDate.toISOString().split("T")[0]; // YYYY-MM-DD

      setFormData((prev) => ({
        ...prev,
        [name]: formattedDate,
        dateOfBirthDisplay: value,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

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

      const fileExt = selectedFile.name.split(".").pop().toLowerCase();
      const token = localStorage.getItem("token");

      const { data } = await axios.get(
        `${process.env.REACT_APP_URL}/api/generate-image-upload-url/${formData.regNumber}/.${fileExt}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", data.uploadURL);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // small delay
          setFormData((prev) => ({ ...prev, studentImageURL: data.viewURL }));
          toast.success("Image uploaded successfully!");
        } else {
          throw new Error("Upload failed");
        }
      };

      xhr.onerror = () => {
        throw new Error("Upload failed");
      };

      xhr.send(selectedFile);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Image upload failed");
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setUploadProgress(0);
    setFormData((prev) => ({ ...prev, studentImageURL: "" }));
  };

  // Bulk Upload Handlers
  const handleBulkFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid Excel or CSV file");
      return;
    }

    setBulkFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];

      if (validTypes.includes(file.type)) {
        setBulkFile(file);
      } else {
        toast.error("Please upload a valid Excel or CSV file");
      }
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/download-student-template`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "student_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download template");
      console.error("Template download error:", error);
    }
  };

  const processBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!campuses.length) {
      toast.error("Please wait for campuses to load");
      return;
    }

    try {
      setBulkLoading(true);
      toast.info("Processing bulk upload...");

      // Read file data
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = utils.sheet_to_json(worksheet, { defval: "" });

          // Map column headers to our schema fields
          const mappedData = jsonData.map((row) => {
            // Handle potential different column names
            const studentData = {
              admissionYear: parseInt(
                row.admissionYear ||
                  row.AdmissionYear ||
                  row.admission_year ||
                  new Date().getFullYear()
              ),
              campus: row.campus || row.Campus || row.campus_id || "",
              gender: row.gender || row.Gender || "Boy",
              admissionType:
                row.admissionType ||
                row.AdmissionType ||
                row.admission_type ||
                "Residential",
              regNumber:
                row.regNumber ||
                row.RegNumber ||
                row.reg_number ||
                row.registration_number ||
                "",
              studentName:
                row.studentName ||
                row.StudentName ||
                row.student_name ||
                row.name ||
                "",
              dateOfBirth:
                row.dateOfBirth || row.DateOfBirth || row.dob || row.DOB || "",
              studentImageURL: null,
              allotmentType:
                row.allotmentType ||
                row.AllotmentType ||
                row.allotment_type ||
                "11th PUC",
              section: row.section || row.Section || "",
              fatherName:
                row.parentName ||
                row.FatherName ||
                row.father_name ||
                row.Parent ||
                "",
              fatherMobile:
                row.parentMobile ||
                row.FatherMobile ||
                row.father_mobile ||
                row.father_contact ||
                "",
              emailId:
                row.emailId || row.EmailId || row.email || row.Email || "",
              address: row.address || row.Address || "",
              contact:
                row.contact || row.Contact || row.alternate_contact || "",
              medicalIssues:
                row.medicalIssues ||
                row.MedicalIssues ||
                row.medical_issues ||
                "No",
              medicalDetails:
                row.medicalDetails ||
                row.MedicalDetails ||
                row.medical_details ||
                "",
            };

            // If campus is provided as a name instead of ID, try to find corresponding ID
            if (
              studentData.campus &&
              !studentData.campus.match(/^[0-9a-fA-F]{24}$/)
            ) {
              const foundCampus = campuses.find(
                (c) =>
                  c.name.toLowerCase() ===
                  studentData.campus.toString().toLowerCase()
              );

              if (foundCampus) {
                studentData.campus = foundCampus._id;
              } else {
                // If we can't find the campus, we'll log this issue
                console.warn(
                  `Campus not found for: ${studentData.studentName} (${studentData.regNumber})`
                );
              }
            }
            if (studentData.dateOfBirth) {
              try {
                // Handle Excel numeric dates (number of days since 1900)
                if (typeof studentData.dateOfBirth === "number") {
                  // Excel date (number of days since 1900) to JS Date
                  const excelDate = studentData.dateOfBirth;
                  const jsDate = new Date(
                    Math.round((excelDate - (25567 + 1)) * 86400 * 1000)
                  );

                  // Adjust for timezone offset to get the correct date
                  const timezoneOffset = jsDate.getTimezoneOffset() * 60000;
                  const adjustedDate = new Date(
                    jsDate.getTime() + timezoneOffset
                  );

                  studentData.dateOfBirth = adjustedDate
                    .toISOString()
                    .split("T")[0];
                }
                // Handle string dates
                else if (typeof studentData.dateOfBirth === "string") {
                  // Try different date formats

                  // Handle DD-MM-YYYY format
                  if (studentData.dateOfBirth.match(/^\d{2}-\d{2}-\d{4}$/)) {
                    const [day, month, year] =
                      studentData.dateOfBirth.split("-");
                    // Create date in local timezone (no UTC conversion)
                    //const date = new Date(year, month - 1, day);
                    studentData.dateOfBirth = `${year}-${month.padStart(
                      2,
                      "0"
                    )}-${day.padStart(2, "0")}`;
                  }
                  // Handle YYYY-MM-DD format (keep as is)
                  else if (
                    studentData.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)
                  ) {
                    // Already in correct format, no conversion needed
                  }
                  // Handle MM/DD/YYYY format
                  else if (
                    studentData.dateOfBirth.match(/^\d{2}\/\d{2}\/\d{4}$/)
                  ) {
                    const [month, day, year] =
                      studentData.dateOfBirth.split("/");
                    //const date = new Date(year, month - 1, day);
                    studentData.dateOfBirth = `${year}-${month.padStart(
                      2,
                      "0"
                    )}-${day.padStart(2, "0")}`;
                  } else {
                    console.warn(
                      `Unrecognized date format: ${studentData.dateOfBirth}`
                    );
                    studentData.dateOfBirth = "";
                  }
                }
              } catch (e) {
                console.error(
                  `Error parsing date ${studentData.dateOfBirth}:`,
                  e
                );
                studentData.dateOfBirth = "";
              }
            }
            return studentData;
          });

          // Data validation
          const validData = mappedData
            .filter((student) => {
              if (!student) return false; // Skip if null (from campus matching)

              const errors = [];

              // Required fields
              if (
                !student.regNumber ||
                !student.regNumber.toString().match(/^\d{6}$/)
              ) {
                errors.push("Invalid registration number (must be 6 digits)");
              }

              if (
                !student.studentName ||
                student.studentName.trim().length < 2
              ) {
                errors.push("Student name is required");
              }

              if (
                !student.campus ||
                !student.campus.match(/^[0-9a-fA-F]{24}$/)
              ) {
                errors.push("Invalid campus ID");
              }

              // Make fatherMobile optional or less strict
              if (
                student.fatherMobile &&
                !student.fatherMobile.toString().match(/^\d{10}$/)
              ) {
                errors.push("Invalid parent mobile number");
              }

              // Make date validation less strict
              if (student.dateOfBirth) {
                // Try to parse the date to ensure it's valid
                try {
                  // Check if it's already in DD-MM-YYYY format
                  if (student.dateOfBirth.match(/^\d{2}-\d{2}-\d{4}$/)) {
                    const [day, month, year] = student.dateOfBirth.split("-");
                    const date = new Date(`${year}-${month}-${day}`);
                    if (isNaN(date.getTime())) {
                      errors.push("Invalid date of birth");
                    }
                  }
                  // Check if it's in YYYY-MM-DD format
                  else if (student.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const [year, month, day] = student.dateOfBirth.split("-");
                    const date = new Date(`${year}-${month}-${day}`);
                    if (isNaN(date.getTime())) {
                      errors.push("Invalid date of birth");
                    } else {
                      // Convert to DD-MM-YYYY format
                      student.dateOfBirth = `${day}-${month}-${year}`;
                    }
                  } else {
                    errors.push(
                      "Date must be in DD-MM-YYYY or YYYY-MM-DD format"
                    );
                  }
                } catch (e) {
                  errors.push("Invalid date format");
                }
              }

              if (errors.length > 0) {
                console.warn(
                  `Invalid student data for ${student.regNumber || "unknown"}:`,
                  errors
                );
                return false;
              }

              return true;
            })
            .filter(Boolean); // Remove any null entries

          if (validData.length === 0) {
            toast.error("No valid student records found in the file");
            setBulkLoading(false);
            return;
          }

          // Send to server
          const token = localStorage.getItem("token");
          const response = await axios.post(
            `${process.env.REACT_APP_URL}/api/bulkcreatestudents`,
            { students: validData },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          toast.success(
            `Successfully processed ${response.data.successCount} students`
          );

          if (response.data.failedCount > 0) {
            toast.warning(
              `Failed to process ${response.data.failedCount} students.`
            );
            setFailedStudents(response.data.failedStudents);
          }

          // Reset the bulk upload state
          setBulkFile(null);
          setShowBulkUpload(false);
        } catch (error) {
          console.error("Error processing file:", error);
          toast.error(
            "Failed to process file. Check if the format is correct."
          );
        } finally {
          setBulkLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read file");
        setBulkLoading(false);
      };

      reader.readAsArrayBuffer(bulkFile);
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error(error.response?.data?.message || "Bulk upload failed");
      setBulkLoading(false);
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
          },
        }
      );

      toast.success("Student registered successfully!");

      setFormData((prev) => ({
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
        medicalDetails: "",
      }));

      setSelectedFile(null);
      setPreviewUrl("");
      setUploadProgress(0);
      setRegNumberExists(false);
      setShowMedicalDetails(false);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        "Registration failed. Please check all fields.";
      toast.error(errorMsg);
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          New Student Admission
        </h2>
        <button
          type="button"
          onClick={() => setShowBulkUpload(!showBulkUpload)}
          className="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <AArrowUp size={18} />
          Upload Bulk
        </button>
      </div>

      {showBulkUpload && (
        <div className="mb-8 p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">
            Bulk Student Upload
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV or Excel file with student data. The file should
            contain columns matching the form fields.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Template
          </button>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <Upload size={32} className="text-blue-500 mb-2" />
              <p className="mb-2">Drag & drop your file here</p>
              <p className="text-sm text-gray-500">- or -</p>
              <label className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleBulkFileChange}
                  className="hidden"
                  key={bulkFile ? "file-selected" : "no-file"}
                />
              </label>
            </div>
          </div>

          {bulkFile && (
            <div className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-200 mb-4">
              <span className="text-sm truncate">{bulkFile.name}</span>
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={() => setBulkFile(null)}
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowBulkUpload(false);
                setBulkFile(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={processBulkUpload}
              disabled={!bulkFile || bulkLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {bulkLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>Upload Students</>
              )}
            </button>
            {failedStudents.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto border border-red-200 rounded-lg">
                <div className="bg-red-50 p-3 sticky top-0 border-b border-red-200 flex justify-between items-center">
                  <h4 className="text-red-600 font-semibold">
                    Failed to upload {failedStudents.length} students
                  </h4>
                  <button
                    onClick={() => setFailedStudents([])}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="divide-y divide-red-100">
                  {failedStudents.map((student, idx) => (
                    <div key={idx} className="p-3 hover:bg-red-50">
                      <div className="font-medium text-red-700">
                        {student.regNumber || "No Reg Number"} -{" "}
                        {student.reason}
                      </div>
                      {student.details && student.details.length > 0 && (
                        <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                          {student.details.map((detail, i) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Campus Selection */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1 font-medium">
            Campus *
          </label>
          <select
            name="campus"
            value={formData.campus}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            required
          >
            <option value="">Select Campus</option>
            {campuses.map((campus) => (
              <option key={campus._id} value={campus._id}>
                {campus.name} ({campus.type})
              </option>
            ))}
          </select>
        </div>

        {/* Admission Year */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">
            Admission Year *
          </label>
          <select
            name="admissionYear"
            value={formData.admissionYear}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          >
            {[2022, 2023, 2024, 2025, 2026, 2027, 2028].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Registration Number */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">
            Registration Number *
          </label>
          <input
            type="text"
            name="regNumber"
            value={formData.regNumber}
            onChange={handleChange}
            onBlur={checkRegNumber}
            className={`w-full border ${
              regNumberExists ? "border-red-500" : "border-gray-300"
            } p-2 rounded-md focus:ring-2 focus:ring-orange-500`}
            pattern="\d{6}"
            maxLength={6}
            placeholder="6-digit number"
            required
          />
          {regNumberExists && (
            <p className="text-red-500 text-sm mt-1">
              This registration number already exists
            </p>
          )}
        </div>

        {/* Student Name */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">
            Student Name *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Date of Birth *
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={
              formData.dateOfBirthDisplay ||
              formData.dateOfBirth?.split("-").reverse().join("-") ||
              ""
            }
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>

        {/* Student Image Upload */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1 font-medium">
            Student Photo
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Gender *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Admission Type *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Allotment Type *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Section *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Parent's Name *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Parent's Mobile *
          </label>
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

        {/*Email Id */}
        <div>
          <label className="block text-gray-700 mb-1 font-medium">
            Parent's Email
          </label>
          <input
            type="email"
            name="emailId"
            value={formData.emailId || ""}
            onChange={handleChange}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-orange-500"
            placeholder="parent@example.com"
          />
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 mb-1 font-medium">
            Address *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Alternate Contact *
          </label>
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
          <label className="block text-gray-700 mb-1 font-medium">
            Medical Issues *
          </label>
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
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
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
