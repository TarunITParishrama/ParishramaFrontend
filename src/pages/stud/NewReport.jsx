import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export default function NewReport({ onClose }) {
  const [formData, setFormData] = useState({
    stream: "LongTerm",
    questionType: "",
    testName: "",
    date: "",
    marksType: ""
  });

  const [testNames, setTestNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileData, setFileData] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editableRegNumbers, setEditableRegNumbers] = useState({});
  const [showAllInvalid, setShowAllInvalid] = useState(false);

  // Marks type options
  const marksTypeOptions = [
    "+1 CorrectAnswer, 0 WrongAnswer, 0 Unmarked",
    "+4 CorrectAnswer, -1 WrongAnswer, 0 Unmarked"
  ];

  // Fetch test names when stream changes
  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        setError("");
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank?stream=${formData.stream}`
        );
        
        if (!response.data?.data || response.data.data.length === 0) {
          setTestNames([]);
          setError(`No tests available for ${formData.stream} stream`);
          return;
        }

        const uniqueTestNames = [
          ...new Set(response.data.data.map(item => item.solutionRef.testName))
        ];
        setTestNames(uniqueTestNames);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to fetch test names");
        setTestNames([]);
      }
    };
    fetchTestNames();
  }, [formData.stream]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.ms-excel": [".xls", ".xlsx"],
      "text/csv": [".csv"]
    },
    maxFiles: 1,
    onDrop: acceptedFiles => {
      if (acceptedFiles.length > 0) {
        setFileData(acceptedFiles[0]);
        parseFile(acceptedFiles[0]);
      }
    }
  });

  const parseFile = file => {
    setIsUploading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = e.target.result;
        if (file.name.endsWith(".csv")) {
          parseCSV(data);
        } else {
          parseExcel(data);
        }
      } catch (err) {
        setError("Error parsing file. Please check the format.");
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parseExcel = data => {
    try {
      const workbook = XLSX.read(data, { type: "binary" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      processParsedData(jsonData);
    } catch (err) {
      setError("Invalid Excel file format");
      console.error(err);
    }
  };

  const parseCSV = data => {
    Papa.parse(data, {
      header: true,
      complete: results => {
        if (results.errors.length > 0) {
          setError("CSV parsing errors detected");
          console.error("CSV errors:", results.errors);
        }
        processParsedData(results.data);
      },
      error: err => {
        setError("Error parsing CSV file");
        console.error(err);
      }
    });
  };

  const processParsedData = (data) => {
    if (!data || data.length === 0) {
      setError("No valid data found in the file");
      setParsedData([]);
      return;
    }
  
    const firstRow = data[0] || {};
    const regNoKey = Object.keys(firstRow).find(key => 
      key.match(/^(regno|rollno|registration|id)/i)
    );
    
    // Find all question columns and determine total questions
    const questionKeys = Object.keys(firstRow)
      .filter(key => key.match(/^q\d+$/i))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return numA - numB;
      });
  
    if (!regNoKey) {
      setError("File must contain student ID column");
      setParsedData([]);
      return;
    }
  
    if (questionKeys.length === 0) {
      setError("File must contain question columns (Q1, Q2, etc.)");
      setParsedData([]);
      return;
    }
  
    try {
      // Determine the maximum question number from column headers
      const maxQuestionNum = questionKeys.reduce((max, key) => {
        const num = parseInt(key.replace(/\D/g, ''));
        return num > max ? num : max;
      }, 0);
  
      const processed = data.map(row => {
        const questionAnswer = {};
        
        // Initialize all questions from 1 to maxQuestionNum
        for (let i = 1; i <= maxQuestionNum; i++) {
          const qKey = `Q${i}`;
          const answer = row[qKey];
          questionAnswer[i] = answer && String(answer).trim() !== '' 
            ? String(answer).trim().toUpperCase() 
            : '';
        }
  
        return {
          regNumber: row[regNoKey],
          questionAnswer,
          totalQuestions: maxQuestionNum
        };
      });
  
      setParsedData(processed);
      
      // Initialize editable reg numbers for invalid formats
      const invalidRegNumbers = {};
      processed.forEach((row, index) => {
        if (!/^\d{6}$/.test(String(row.regNumber).trim())) {
          invalidRegNumbers[index] = row.regNumber;
        }
      });
      setEditableRegNumbers(invalidRegNumbers);
      
      setError("");
    } catch (err) {
      setError("Error processing file data");
      console.error("Processing error:", err);
      setParsedData([]);
    }
  };

  const handleRegNumberChange = (index, value) => {
    setEditableRegNumbers(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const updateParsedDataWithEdits = () => {
    const updatedData = [...parsedData];
    Object.entries(editableRegNumbers).forEach(([index, value]) => {
      updatedData[index].regNumber = value;
    });
    setParsedData(updatedData);
    setEditableRegNumbers({});
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    // Validate fields
    if (!formData.questionType || !formData.testName || !formData.date || !formData.marksType) {
      throw new Error("All fields are required");
    }

    if (parsedData.length === 0) {
      throw new Error("Please upload a valid file first");
    }

    // Check invalid reg numbers
    const invalidRegNumbers = parsedData.filter(
      row => !/^\d{6}$/.test(String(row.regNumber).trim())
    );
    
    if (invalidRegNumbers.length > 0) {
      throw new Error(`There are ${invalidRegNumbers.length} invalid registration numbers`);
    }

    const payload = {
      stream: formData.stream,
      questionType: formData.questionType,
      testName: formData.testName,
      date: formData.date,
      marksType: formData.marksType,
      reportBank: parsedData // Now using questionAnswer format directly
    };

    const response = await axios.post(
      `${process.env.REACT_APP_URL}/api/createreport`,
      payload
    );

    if (response.data.status === "success") {
      alert("Report created successfully!");
      onClose();
    }
  } catch (err) {
    setError(err.response?.data?.message || err.message || "Failed to create report");
  } finally {
    setLoading(false);
  }
};

  // Get invalid registration numbers
  const invalidRegNumbers = parsedData
    .map((row, index) => ({ 
      index, 
      regNumber: row.regNumber,
      isValid: /^\d{6}$/.test(String(row.regNumber).trim())
    }))
    .filter(item => !item.isValid);

  // Get valid registration numbers (for preview)
  const validRegNumbers = parsedData
    .map((row, index) => ({ 
      index, 
      regNumber: row.regNumber,
      isValid: /^\d{6}$/.test(String(row.regNumber).trim())
    }))
    .filter(item => item.isValid);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Create New Report</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          {error && (
            <div className={`mb-4 p-3 rounded-md border ${
              error.includes("No tests available") 
                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                : "bg-red-100 text-red-700 border-red-200"
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stream Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stream *
                </label>
                <select
                  name="stream"
                  value={formData.stream}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LongTerm">Long Term</option>
                  <option value="PUC">PUC</option>
                </select>
              </div>

              {/* Question Type Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Question Type *
                </label>
                <select
                  name="questionType"
                  value={formData.questionType}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="MCQ">MCQ</option>
                  <option value="FillInTheBlanks">Fill in the Blanks</option>
                  <option value="TrueFalse">True/False</option>
                </select>
              </div>

              {/* Test Name Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Test Name *
                </label>
                <select
                  name="testName"
                  value={formData.testName}
                  onChange={handleChange}
                  required
                  disabled={testNames.length === 0}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select Test</option>
                  {testNames.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Marks Type Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Marks Type *
                </label>
                <select
                  name="marksType"
                  value={formData.marksType}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Marks Type</option>
                  {marksTypeOptions.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Student Responses (Excel/CSV)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
                  isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
                }`}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <p className="text-gray-500">Processing file...</p>
                ) : fileData ? (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-blue-600">{fileData.name}</span>
                    <span className="text-green-600">
                      ✓ {parsedData.length} records found
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500">
                      Drag & drop an Excel or CSV file here, or click to select
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      File should contain RegNo and Question columns (Q1, Q2, etc.)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Invalid Registration Numbers Section */}
            {invalidRegNumbers.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    Invalid Registration Numbers ({invalidRegNumbers.length} found)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAllInvalid(!showAllInvalid)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showAllInvalid ? "Show Less" : "Show All"}
                  </button>
                </div>
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <p className="text-sm text-yellow-700 mb-3">
                    Please correct the following registration numbers (must be 6 digits):
                  </p>
                  <div className="space-y-2">
                    {(showAllInvalid ? invalidRegNumbers : invalidRegNumbers.slice(0, 6)).map((item) => (
                      <div key={item.index} className="flex items-center space-x-2">
                        <span className="text-sm font-medium w-24">Row {item.index + 1}:</span>
                        <input
                          type="text"
                          value={editableRegNumbers[item.index] !== undefined ? editableRegNumbers[item.index] : item.regNumber}
                          onChange={(e) => handleRegNumberChange(item.index, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm w-32"
                        />
                        <span className="text-sm text-gray-500">
                          Original: {item.regNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={updateParsedDataWithEdits}
                    className="mt-3 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            )}

            {/* Preview Section */}
            {validRegNumbers.length > 0 && (
  <div className="mt-6">
    <h3 className="text-sm font-medium text-gray-700 mb-2">
      Valid Records Preview (First 5 Rows) - Total Questions: {parsedData[0]?.totalQuestions || 'N/A'}
    </h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
              RegNo
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
              Attempted
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
              Sample Answers
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {validRegNumbers.slice(0, 5).map((item) => {
            const row = parsedData[item.index];
            const attempted = Object.values(row.questionAnswer).filter(a => a !== '').length;
            const total = row.totalQuestions || Object.keys(row.questionAnswer).length;
            
            // Get first 5 non-empty answers for preview
            const sampleAnswers = Object.entries(row.questionAnswer)
              .filter(([_, ans]) => ans !== '')
              .slice(0, 5)
              .map(([q, ans]) => `Q${q}:${ans}`)
              .join(', ');

            return (
              <tr key={item.index}>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border">
                  {row.regNumber}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 border">
                  {attempted}/{total}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500 border">
                  {sampleAnswers}{sampleAnswers.length === 0 ? 'None' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
)}

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isUploading || testNames.length === 0 || invalidRegNumbers.length > 0}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading || isUploading || testNames.length === 0 || invalidRegNumbers.length > 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Creating Report..." : "Create Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}