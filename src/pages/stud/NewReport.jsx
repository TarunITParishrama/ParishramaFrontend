import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export default function NewReport({ onClose }) {

  const fetchStudentByRegNumber = async (regNumber) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(
    `${process.env.REACT_APP_URL}/api/searchstudents?query=${regNumber}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data?.data?.find(
    (student) => student.regNumber === regNumber
  );
};

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
  const [duplicateRegNumbers, setDuplicateRegNumbers] = useState({});
  const [editableRegNumbers, setEditableRegNumbers] = useState({});
  const [showAllInvalid, setShowAllInvalid] = useState(false);
  const [isTheoryTest, setIsTheoryTest] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectDetails, setSubjectDetails] = useState([]);

  // Marks type options
  const marksTypeOptions = [
    "+1 CorrectAnswer, 0 WrongAnswer, 0 Unmarked",
    "+4 CorrectAnswer, -1 WrongAnswer, 0 Unmarked"
  ];

  // Fetch test names when stream changes (only for MCQ)
  useEffect(() => {
    if (isTheoryTest) {
      const fetchSubjects = async () => {
        try{
          const token = localStorage.getItem('token');
          const response = await axios.get(`${process.env.REACT_APP_URL}/api/getsubjects`,{
            headers:{
              Authorization:
                `Bearer ${token}`
            }
          });
          if(response.data?.data){
            setSubjects(response.data.data);
            const initialSubjects = response.data.data.slice(0, 4).map(subject => ({
              name: subject.subjectName,
              maxMarks: 25
            }));
            setSubjectDetails(initialSubjects)
          }
        }catch(err){
          setError("Failed to fetch Subjects");
        }
      };
      fetchSubjects();
    }
    
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
  }, [formData.stream, isTheoryTest]);

  const handleChange = e => {
    const { name, value } = e.target;
    
    // When question type changes, update isTheoryTest state
    if (name === "questionType") {
      setIsTheoryTest(value === "Theory");
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectChange = (index, field, value) => {
    setSubjectDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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
      
      if (isTheoryTest) {
        processTheoryData(jsonData);
      } else {
        processMCQData(jsonData);
      }
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
        
        if (isTheoryTest) {
          processTheoryData(results.data);
        } else {
          processMCQData(results.data);
        }
      },
      error: err => {
        setError("Error parsing CSV file");
        console.error(err);
      }
    });
  };

  const processMCQData = (data) => {
    if (!data || data.length === 0) {
      setError("No valid data found in the file");
      setParsedData([]);
      return;
    }
  
    const firstRow = data[0] || {};
    const regNoKey = Object.keys(firstRow).find(key => 
      key.match(/^(regno|rollno|registration|id)/i)
    );
    
    
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
      const maxQuestionNum = questionKeys.reduce((max, key) => {
        const num = parseInt(key.replace(/\D/g, ''));
        return num > max ? num : max;
      }, 0);
  
      const processed = data.map(row => {
        const questionAnswer = {};
        
        for (let i = 1; i <= maxQuestionNum; i++) {
          const qKey = `Q${i}`;
          let answer = row[qKey];
          
          // Convert numeric answers to letter format
          if (answer) {
            answer = String(answer).trim();
            if (answer === '1') answer = 'A';
            else if (answer === '2') answer = 'B';
            else if (answer === '3') answer = 'C';
            else if (answer === '4') answer = 'D';
            
            // Only keep valid answers (A/B/C/D)
            questionAnswer[i] = ['A', 'B', 'C', 'D'].includes(answer) ? answer : '';
          } else {
            questionAnswer[i] = '';
          }
        }
  
        return {
          regNumber: row[regNoKey],
          filePath: row["File"],
          questionAnswer,
          totalQuestions: maxQuestionNum
        };
      });
  
      setParsedData(processed);
      
      const invalidRegNumbers = {};
      processed.forEach((row, index) => {
        if (!/^\d{6}$/.test(String(row.regNumber).trim())) {
          invalidRegNumbers[index] = row.regNumber;
        }
      });
      setEditableRegNumbers(invalidRegNumbers);
      setDuplicateRegNumbers(findDuplicateRegNumbers(processed));      
      setError("");
    } catch (err) {
      setError("Error processing file data");
      console.error("Processing error:", err);
      setParsedData([]);

    }
  };

  const processTheoryData = (data) => {
    if (!data || data.length === 0) {
      setError("No valid data found in the file");
      setParsedData([]);
      return;
    }

    // Expected columns for theory test
    const firstRow = data[0] || {};
    const regNoKey = Object.keys(firstRow).find(key => 
      key.match(/^(regno|rollno|registration|id)/i)
    );
    
    // Find the column for each subject
    const subjectColumns = {};
    subjectDetails.forEach(subject => {
      const subjectLower = subject.name.toLowerCase();
      const matchingKey = Object.keys(firstRow).find(key => {
        const keyLower = key.toLowerCase().replace(/[^a-z]/g, '');
        return keyLower.includes(subjectLower);
      });
      if(matchingKey){
        subjectColumns[subject.name] =matchingKey;
      }
    });

    if (!regNoKey) {
      setError("File must contain student ID column");
      setParsedData([]);
      return;
    }

    const missingSubjects = subjectDetails.filter(subject => !subjectColumns[subject.name]);
    if (missingSubjects.length > 0) {
      setError(`Missing columns for: ${missingSubjects.map(s => s.name).join(', ')}`);
      setParsedData([]);
      return;
    }

    try {
      const processed = data.map(row => {
        const subjectMarks = {};
        let totalMarks = 0;
        
        subjectDetails.forEach(subject => {
          const key = subjectColumns[subject.name];
          const marks = parseFloat(row[key]) || 0;
          subjectMarks[subject.name] = marks;
          totalMarks += marks;
        });

        const totalPossible = subjectDetails.reduce((sum, sub) => sum + sub.maxMarks, 0);
        const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;

        return {
          regNumber: row[regNoKey],
          subjectMarks,
          totalMarks,
          percentage: parseFloat(percentage.toFixed(2))
        };
      });

      setParsedData(processed);
      
      const invalidRegNumbers = {};
      processed.forEach((row, index) => {
        if (!/^\d{6}$/.test(String(row.regNumber).trim())) {
          invalidRegNumbers[index] = row.regNumber;
        }
      });
      setEditableRegNumbers(invalidRegNumbers);
      setDuplicateRegNumbers(findDuplicateRegNumbers(processed));
      
      setError("");
    } catch (err) {
      setError("Error processing theory test data");
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

const updateParsedDataWithEdits = async () => {
  const updatedData = [...parsedData];
  const regNumbersToCheck = Object.entries(editableRegNumbers);

  let validChanges = [];

  for (const [indexStr, newReg] of regNumbersToCheck) {
    const index = parseInt(indexStr);
    const oldReg = updatedData[index].regNumber;
    if (String(oldReg).trim() !== String(newReg).trim()) {
      try {
        const student = await fetchStudentByRegNumber(newReg.trim());
        if (student) {
          const confirmUpdate = window.confirm(
            `RegNo ${newReg} belongs to ${student.studentName}. Do you want to apply this change?`
          );
          if (confirmUpdate) {
            validChanges.push({ index, newReg });
          }
        } else {
          const confirmUpdate = window.confirm(
            `RegNo ${newReg} not found in Students database. Do you still want to proceed?`
          );
          if (confirmUpdate) {
            validChanges.push({ index, newReg });
          }
        }
      } catch (err) {
        console.error(`Error validating RegNo ${newReg}`, err);
      }
    }
  }

  // Apply valid changes
  validChanges.forEach(({ index, newReg }) => {
    updatedData[index].regNumber = newReg.trim();
  });

  setParsedData(updatedData);
  setEditableRegNumbers({});
  setDuplicateRegNumbers(findDuplicateRegNumbers(updatedData));
};

const downloadErrorFile = () => {
  const rows = [];

  // Invalid RegNumbers
  invalidRegNumbers.forEach((item) => {
    const filePath = parsedData[item.index]?.filePath || "";
    rows.push({
      Row: item.index + 1,
      Issue: "Invalid RegNumber",
      RegNumber: item.regNumber,
      File: filePath,
    });
  });

  // Duplicate RegNumbers
  const groupedDuplicates = Object.entries(duplicateRegNumbers).reduce((acc, [index, reg]) => {
    if (!acc[reg]) acc[reg] = [];
    acc[reg].push(Number(index));
    return acc;
  }, {});

  Object.entries(groupedDuplicates).forEach(([reg, indices]) => {
    indices.forEach((index) => {
      const filePath = parsedData[index]?.filePath || "";
      rows.push({
        Row: index + 1,
        Issue: "Duplicate RegNumber",
        RegNumber: reg,
        File: filePath,
      });
    });
  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    ["Row,Issue,RegNumber,File", ...rows.map(r =>
      `${r.Row},${r.Issue},${r.RegNumber},"${r.File}"`
    )].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "error_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleReuploadErrorFile = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    Papa.parse(event.target.result, {
      header: true,
      complete: async ({ data }) => {
        const updatedData = [...parsedData];
        let validChanges = [];

        for (const row of data) {
          const index = parseInt(row.Row, 10) - 1;
          const newReg = row.RegNumber?.trim();

          if (!isNaN(index) && newReg) {
            try {
              const student = await fetchStudentByRegNumber(newReg);
              let proceed = false;

              if (student) {
                proceed = window.confirm(
                  `Row ${index + 1}: RegNo ${newReg} belongs to ${student.studentName}. Apply this change?`
                );
              } else {
                proceed = window.confirm(
                  `Row ${index + 1}: RegNo ${newReg} not found in database. Proceed anyway?`
                );
              }

              if (proceed) {
                validChanges.push({ index, newReg });
              }
            } catch (err) {
              //toast.error(`Validation error for RegNo ${newReg}`);
              console.error(err);
            }
          }
        }

        // Apply valid regNumber changes
        validChanges.forEach(({ index, newReg }) => {
          updatedData[index].regNumber = newReg;
        });

        setParsedData(updatedData);
        setEditableRegNumbers({});
        setDuplicateRegNumbers(findDuplicateRegNumbers(updatedData));

        //toast.success("Reuploaded corrections applied successfully!");
      },
      error: (err) => {
        //toast.error("Failed to parse error file");
        console.error("CSV Parse Error:", err);
      },
    });
  };
  reader.readAsText(file);
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate fields
      if (!formData.questionType || !formData.testName || !formData.date) {
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

      if (isTheoryTest) {
        // Submit theory test
        const payload = {
          stream: formData.stream,
          questionType: formData.questionType,
          testName: formData.testName,
          date: formData.date,
          subjectDetails,
          studentResults: parsedData.map(row => ({
            regNumber: row.regNumber,
            subjectMarks: Object.entries(row.subjectMarks).map(([name, marks]) => ({ name, marks })),   
            totalMarks: row.totalMarks,
            percentage: row.percentage
        }))
      };
        
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${process.env.REACT_APP_URL}/api/createtheory`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.status === "success") {
          alert("Theory test report created successfully!");
          onClose();
        }
      } else {
        // Submit MCQ test
        const payload = {
          stream: formData.stream,
          questionType: formData.questionType,
          testName: formData.testName,
          date: formData.date,
          marksType: formData.marksType,
          reportBank: parsedData 
        };

        const response = await axios.post(
          `${process.env.REACT_APP_URL}/api/createreport`,
          payload
        );

        if (response.data.status === "success") {
          alert("Report created successfully!");
          onClose();
        }
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

const findDuplicateRegNumbers = (data) => {
  const regMap = {};
  const duplicates = {};

  data.forEach((row, index) => {
    const reg = String(row.regNumber).trim();
    if (!regMap[reg]) {
      regMap[reg] = [index];
    } else {
      regMap[reg].push(index);
    }
  });

  Object.entries(regMap).forEach(([reg, indices]) => {
    if (indices.length > 1) {
      indices.forEach((i) => {
        duplicates[i] = reg;
      });
    }
  });

  return duplicates; // key: index, value: duplicate regNumber
};

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
                  <option value="Theory">Theory</option>
                </select>
              </div>

              {/* Test Name - Dropdown for MCQ, Input for Theory */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Test Name *
                </label>
                {isTheoryTest ? (
                  <input
                    type="text"
                    name="testName"
                    value={formData.testName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter test name"
                  />
                ) : (
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
                )}
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

              {/* Marks Type Dropdown - Only for MCQ */}
              {!isTheoryTest && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Marks Type *
                  </label>
                  <select
                    name="marksType"
                    value={formData.marksType}
                    onChange={handleChange}
                    required={!isTheoryTest}
                    disabled={isTheoryTest}
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
              )}

              {/* Subject Details - Only for Theory */}
              {isTheoryTest && (
                <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Details *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {subjectDetails.map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <select
                        value={subject.name}
                        onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {subjects.map((sub, i) => (
                          <option key={i} value={sub.subjectName}>
                            {sub.subjectName}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={subject.maxMarks}
                        onChange={(e) => handleSubjectChange(index, 'maxMarks', parseInt(e.target.value) || 0)}
                        required
                        min="1"
                        max="50"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Max marks"
                      />
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* File Upload Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Student {isTheoryTest ? "Marks" : "Responses"} (Excel/CSV)
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
                      {isTheoryTest 
                        ? "File should contain RegNo and 4 subject columns (Physics, Chemistry, Biology, Mathematics)" 
                        : "File should contain RegNo and Question columns (Q1, Q2, etc.)"}
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
    {parsedData[item.index]?.filePath && (
      <span className="text-sm text-gray-500 break-all max-w-[200px]">
        File: {parsedData[item.index].filePath}
      </span>
    )}
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

{/* Duplicate Registration Numbers Section */}
{Object.keys(duplicateRegNumbers).length > 0 && (
  <div className="mt-6">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-medium text-gray-700">
        Duplicate Registration Numbers ({Object.keys(duplicateRegNumbers).length} entries)
      </h3>
    </div>
    <div className="bg-red-50 p-4 rounded-md border border-red-200">
      <p className="text-sm text-red-700 mb-3">
        These registration numbers are duplicated. Please modify at least one in each group:
      </p>
      <div className="space-y-4">
        {Object.entries(
          // Group by regNumber
          Object.entries(duplicateRegNumbers).reduce((acc, [index, reg]) => {
            if (!acc[reg]) acc[reg] = [];
            acc[reg].push(Number(index));
            return acc;
          }, {})
        ).map(([reg, indices]) => (
          <div key={reg} className="border border-red-200 rounded-md p-3 bg-white">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              RegNo: {reg} (used in {indices.length} rows)
            </p>
            {indices.map((index) => (
  <div key={index} className="flex items-center space-x-2 mb-2">
    <span className="text-sm font-medium w-24">Row {index + 1}:</span>
    <input
      type="text"
      value={
        editableRegNumbers[index] !== undefined
          ? editableRegNumbers[index]
          : reg
      }
      onChange={(e) => handleRegNumberChange(index, e.target.value)}
      className="px-2 py-1 border border-gray-300 rounded-md text-sm w-32"
    />
    <span className="text-sm text-gray-500">Original: {reg}</span>
    {parsedData[index]?.filePath && (
      <span className="text-sm text-gray-500 break-all max-w-[200px]">
        File: {parsedData[index].filePath}
      </span>
    )}
  </div>
))}

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

<div className="flex space-x-3 mt-4">
  <button
    type="button"
    onClick={downloadErrorFile}
    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
  >
    Download Error File
  </button>
  <label className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
    Reupload File
    <input type="file" accept=".csv" onChange={handleReuploadErrorFile} className="hidden" />
  </label>
</div>


            {/* Preview Section */}
            {validRegNumbers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Valid Records Preview (First 5 Rows)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                          RegNo
                        </th>
                        {isTheoryTest ? (
                          <>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                              Subjects
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                              Total Marks
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                              Percentage
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                              Attempted
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                              Sample Answers
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {validRegNumbers.slice(0, 5).map((item) => {
                        const row = parsedData[item.index];
                        
                        if (isTheoryTest) {
                          const subjectKeys = Object.keys(row.subjectMarks || {});
                          const subjectList = subjectKeys
                            .map(key => `${key}: ${row.subjectMarks[key]}`)
                            .join(', ');
                          
                          return (
                            <tr key={item.index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border">
                                {row.regNumber}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 border">
                                {subjectList}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 border">
                                {row.totalMarks}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 border">
                                {row.percentage}%
                              </td>
                            </tr>
                          );
                        } else {
                          const attempted = Object.values(row.questionAnswer).filter(a => a !== '').length;
                          const total = row.totalQuestions || Object.keys(row.questionAnswer).length;
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
                        }
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
                disabled={loading || isUploading || (!isTheoryTest && testNames.length === 0) || invalidRegNumbers.length > 0 || Object.keys(duplicateRegNumbers).length > 0}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading || isUploading || (!isTheoryTest && testNames.length === 0) || invalidRegNumbers.length > 0 ? "opacity-50 cursor-not-allowed" : ""
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
