import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function EditReports() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStream, setSelectedStream] = useState("LongTerm");
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [reports, setReports] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [searchRegNumber, setSearchRegNumber] = useState("");
  const [foundReport, setFoundReport] = useState(null);
  const [editedRegNumber, setEditedRegNumber] = useState("");
  const [showGraceMarks, setShowGraceMarks] = useState(false);
  const [graceQuestionNumbers, setGraceQuestionNumbers] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const token = localStorage.getItem('token');

  // Calculate marks for each report
  const calculateMarks = (report) => {
    if (!report.markedOptions || !solutions.length) {
      return {
        correctAnswers: 0,
        wrongAnswers: 0,
        totalMarks: 0,
        accuracy: 0
      };
    }

    let correct = 0;
    let wrong = 0;
    let totalMarks = 0;
    const marksType = report.marksType || "+4/-1";
    const correctMark = marksType.includes("+4") ? 4 : 1;
    const wrongMark = marksType.includes("-1") ? -1 : 0;

    const markedOptions = report.markedOptions instanceof Map ? 
      Object.fromEntries(report.markedOptions) : 
      report.markedOptions;

    Object.entries(markedOptions).forEach(([qNum, markedOption]) => {
      const solution = solutions.find(s => s.questionNumber === parseInt(qNum));
      if (solution) {
        if (markedOption === solution.correctOption) {
          correct++;
          totalMarks += correctMark;
        } else {
          wrong++;
          totalMarks += wrongMark;
        }
      }
    });

    const accuracy = correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0;

    return {
      correctAnswers: correct,
      wrongAnswers: wrong,
      totalMarks,
      accuracy
    };
  };

  // Process test data
  const processTestData = (reports) => {
    const testMap = {};
    
    reports.forEach(report => {
      if (!report?.testName || !report?.date) return;

      const testName = report.testName;
      const date = new Date(report.date);
      if (isNaN(date.getTime())) return;

      const monthYear = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!testMap[testName]) {
        testMap[testName] = {
          months: {},
          testId: report._id,
          stream: report.stream
        };
      }
      
      testMap[testName].months[monthYear] = {
        date: report.date,
        monthName: monthYear,
        marksType: report.marksType
      };
    });
    
    return Object.entries(testMap).map(([testName, testData]) => ({
      testName,
      testId: testData.testId,
      stream: testData.stream,
      months: Object.values(testData.months).sort((a, b) => new Date(b.date) - new Date(a.date))
    })).sort((a, b) => a.testName.localeCompare(b.testName));
  };

  // Fetch all tests data
  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/getallreports`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.data?.data) throw new Error("Invalid API response");

        const filteredReports = response.data.data.filter(
          report => report.stream === selectedStream
        );

        setTests(processTestData(filteredReports));
        setError("");
      } catch (err) {
        setError(err.message);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [selectedStream, token]);

  // Fetch solutions when test is selected
  useEffect(() => {
    if (selectedTest) {
      const fetchSolutions = async () => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_URL}/api/getsolutionbank`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: {
                testName: selectedTest.testName,
                stream: selectedStream
              }
            }
          );
          setSolutions(response.data.data || []);
        } catch (err) {
          console.error("Failed to fetch solutions:", err);
          setSolutions([]);
        }
      };
      fetchSolutions();
    }
  }, [selectedTest, selectedStream, token]);

  // Fetch reports when test and date are selected
  useEffect(() => {
    if (selectedTest && selectedDate) {
      const fetchReports = async () => {
        try {
          setLoading(true);
          setError("");
          setFoundReport(null);
          setEditedRegNumber("");
          
          const dateObj = new Date(selectedDate);
          const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
          const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
          
          // Get ReportBank entries
          const reportBankResponse = await axios.get(`${process.env.REACT_APP_URL}/api/getreportbank`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              testName: selectedTest.testName,
              stream: selectedStream,
              dateFrom: monthStart.toISOString(),
              dateTo: monthEnd.toISOString()
            }
          });
          
          if (!reportBankResponse.data?.data) {
            throw new Error("No ReportBank entries found");
          }

          // Get StudentReports for the same criteria
          const studentReportsResponse = await axios.get(`${process.env.REACT_APP_URL}/api/getstudentreports`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              testName: selectedTest.testName,
              stream: selectedStream,
              date: selectedDate
            }
          });

          // Combine data
          const combinedReports = reportBankResponse.data.data.map(reportBank => {
            const studentReport = studentReportsResponse.data.data?.find(
              sr => sr.regNumber === reportBank.regNumber
            );
            
            return {
              ...reportBank,
              _id: reportBank._id,
              correctAnswers: studentReport?.correctAnswers || 0,
              wrongAnswers: studentReport?.wrongAnswers || 0,
              totalMarks: studentReport?.totalMarks || 0,
              accuracy: studentReport?.accuracy || 0
            };
          });
          
          setReports(combinedReports);
        } catch (err) {
          setError(err.message);
          setReports([]);
        } finally {
          setLoading(false);
        }
      };

      fetchReports();
    }
  }, [selectedTest, selectedDate, selectedStream, token]);

  // Search for a specific report by registration number
  const handleSearch = () => {
    if (!searchRegNumber.trim()) {
      setError("Please enter a registration number");
      return;
    }

    const report = reports.find(r => 
      r.regNumber.toLowerCase().includes(searchRegNumber.toLowerCase())
    );

    if (!report) {
      setError("No report found with that registration number");
      setFoundReport(null);
      return;
    }

    setFoundReport(report);
    setEditedRegNumber(report.regNumber);
    setError("");
  };

  // Handle save
  const handleSave = async () => {
    if (!foundReport || !foundReport._id) {
      setError("No valid report selected for editing");
      return;
    }
  
    try {
      setSubmitLoading(true);
      setError("");
      
      // Validate the registration number
      if (!editedRegNumber || editedRegNumber.trim() === "") {
        throw new Error("Registration number cannot be empty");
      }

      const response = await axios.put(
        `${process.env.REACT_APP_URL}/api/updatereportbank/${foundReport._id}`,
        { regNumber: editedRegNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      if (response.data.status === "success") {
        // Update local state
        setReports(reports.map(report => 
          report._id === foundReport._id 
            ? { ...report, regNumber: editedRegNumber } 
            : report
        ));
        setFoundReport({ ...foundReport, regNumber: editedRegNumber });
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Update error:", err);
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         "Failed to update report";
      setError(errorMessage);
      
      // If it's an ID-related error, reset the found report
      if (err.message.includes("Cast to ObjectId failed")) {
        setFoundReport(null);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Apply grace marks
  const applyGraceMarks = () => {
    if (!graceQuestionNumbers) {
      setError("Please enter at least one question number");
      return;
    }

    // Parse question numbers (comma separated)
    const questionNumbers = graceQuestionNumbers.split(',')
      .map(num => parseInt(num.trim()))
      .filter(num => !isNaN(num));

    if (questionNumbers.length === 0) {
      setError("Invalid question numbers format");
      return;
    }

    // Update reports with grace marks
    setReports(reports.map(report => {
      const newMarkedOptions = { ...report.markedOptions };
      let updatedCorrect = report.correctAnswers || 0;
      let updatedWrong = report.wrongAnswers || 0;
      let updatedTotal = report.totalMarks || 0;

      questionNumbers.forEach(qNum => {
        if (newMarkedOptions[qNum] !== undefined) {
          const solution = solutions.find(s => s.questionNumber === qNum);
          if (solution) {
            // Only update if the student got this question wrong
            if (newMarkedOptions[qNum] !== solution.correctOption) {
              // Mark as correct
              newMarkedOptions[qNum] = solution.correctOption;
              updatedCorrect++;
              if (updatedWrong > 0) updatedWrong--;
              updatedTotal += report.marksType.includes("+4") ? 4 : 1;
            }
          }
        }
      });

      return {
        ...report,
        markedOptions: newMarkedOptions,
        correctAnswers: updatedCorrect,
        wrongAnswers: updatedWrong,
        totalMarks: updatedTotal,
        accuracy: updatedCorrect / (updatedCorrect + updatedWrong) * 100,
        percentage: (updatedTotal / (report.totalQuestions * (report.marksType.includes("+4") ? 4 : 1))) * 100
      };
    }));

    setGraceQuestionNumbers("");
    setShowGraceMarks(false);
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  // Submit all changes
  const submitAllChanges = async () => {
    try {
      setSubmitLoading(true);
      setError("");
      
      // Update each report
      const updatePromises = reports.map(report => 
        axios.put(
          `${process.env.REACT_APP_URL}/api/updatereportbank/${report._id}`,
          {
            regNumber: report.regNumber,
            markedOptions: report.markedOptions
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      await Promise.all(updatePromises);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto mt-6 bg-white shadow-md rounded-lg p-6">
        {/* Stream Selection */}
        <div className="flex space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="stream"
              value="LongTerm"
              checked={selectedStream === "LongTerm"}
              onChange={() => setSelectedStream("LongTerm")}
            />
            <span className="ml-2">Long Term</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="stream"
              value="PUC"
              checked={selectedStream === "PUC"}
              onChange={() => setSelectedStream("PUC")}
            />
            <span className="ml-2">PUC</span>
          </label>
        </div>

        {/* Test Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedTest?.testName || ""}
              onChange={(e) => {
                const test = tests.find(t => t.testName === e.target.value);
                setSelectedTest(test);
                setSelectedDate(null);
              }}
            >
              <option value="">Select a test</option>
              {tests.map((test, index) => (
                <option key={index} value={test.testName}>
                  {test.testName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedDate || ""}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={!selectedTest}
            >
              <option value="">Select a date</option>
              {selectedTest?.months.map((month, index) => (
                <option key={index} value={month.date}>
                  {month.monthName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Section */}
        {selectedTest && selectedDate && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search by Registration Number
                </label>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 p-2 border rounded-l"
                    value={searchRegNumber}
                    onChange={(e) => setSearchRegNumber(e.target.value)}
                    placeholder="Enter registration number"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 transition"
                  >
                    Find
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Found Report Section */}
        {foundReport && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Edit Report</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={editedRegNumber}
                  onChange={(e) => setEditedRegNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answers
                </label>
                <div className="p-2 bg-white border rounded">
                  {foundReport.correctAnswers}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wrong Answers
                </label>
                <div className="p-2 bg-white border rounded">
                  {foundReport.wrongAnswers}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Marks
                </label>
                <div className="p-2 bg-white border rounded">
                  {foundReport.totalMarks}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={() => {
                  setFoundReport(null);
                  setEditedRegNumber("");
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitLoading}
                className={`px-4 py-2 rounded text-white ${
                  submitLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } transition`}
              >
                {submitLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Grace Marks Section */}
        {selectedTest && selectedDate && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Grace Marks</h3>
              <button
                onClick={() => setShowGraceMarks(!showGraceMarks)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
              >
                {showGraceMarks ? "Hide" : "Show"} Grace Marks
              </button>
            </div>

            {showGraceMarks && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Numbers (comma separated)
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={graceQuestionNumbers}
                    onChange={(e) => setGraceQuestionNumbers(e.target.value)}
                    placeholder="e.g., 1, 5, 12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These questions will be marked as correct for all students who got them wrong
                  </p>
                </div>
                <button
                  onClick={applyGraceMarks}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Apply Grace Marks
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit All Changes Button */}
        {reports.length > 0 && (
          <div className="flex justify-end mt-6">
            <button
              onClick={submitAllChanges}
              disabled={submitLoading}
              className={`px-4 py-2 rounded text-white ${
                submitLoading ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
              } transition`}
            >
              {submitLoading ? 'Submitting...' : 'Submit All Changes'}
            </button>
          </div>
        )}

        {submitSuccess && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            Changes saved successfully!
          </div>
        )}

        {!loading && selectedTest && selectedDate && reports.length === 0 && (
          <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
            No reports found for the selected test and date.
          </div>
        )}
      </div>
    </div>
  );
}