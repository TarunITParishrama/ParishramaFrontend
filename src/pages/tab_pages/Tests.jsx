import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NewReport from "../stud/NewReport";
import DatePicker from "react-datepicker";
import { FaCalendarAlt } from "react-icons/fa";
import DownloadDropdown from "../../download/DetailedReport";
import "react-datepicker/dist/react-datepicker.css";

const subjectStyles = {
  "Physics": { background: "rgba(100, 149, 237, 0.1)", watermark: "⚛️" },
  "Chemistry": { background: "rgba(144, 238, 144, 0.1)", watermark: "🧪" },
  "Mathematics": { background: "rgba(255, 165, 0, 0.1)", watermark: "🧮" },
  "Biology": { background: "rgba(60, 179, 113, 0.1)", watermark: "🧬" },
  "Botany": { background: "rgba(34, 139, 34, 0.1)", watermark: "🌿" },
  "Zoology": { background: "rgba(46, 139, 87, 0.1)", watermark: "🐾" },
  "default": { background: "rgba(211, 211, 211, 0.1)", watermark: "📚" }
};

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [streamFilter, setStreamFilter] = useState("LongTerm");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTest, setSelectedTest] = useState(null);
  const [tests, setTests] = useState([]);
  const [detailedData, setDetailedData] = useState([]);
  const [students, setStudents] = useState({});
  const [campuses, setCampuses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [sortConfig, setSortConfig] = useState({ key: "regNumber", direction: "asc" });
  const [tablePages, setTablePages] = useState({});
  const [rowsPerPage] = useState(10);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [bulkData, setBulkData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const [reportsRes, studentReportsRes, patternsRes, studentsRes, solutionsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_URL}/api/getallreports`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getstudentreports?stream=${streamFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getpatterns?stream=${streamFilter}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getstudents`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getsolutionbank?stream=${streamFilter}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const reportsData = await reportsRes.json();
        if (reportsData.status === "success" && Array.isArray(reportsData.data)) {
          const uniqueTests = Array.from(new Set(
            reportsData.data.map(item => item.testName)
          )).map(testName => {
            const test = reportsData.data.find(item => item.testName === testName && item.stream === streamFilter);
            return test ? { testName, date: test.date, stream: test.stream } : null;
          }).filter(Boolean);
          
          setTests(uniqueTests);
        }

        const studentReportsData = await studentReportsRes.json();
        const patternsData = await patternsRes.json();
        const studentsData = await studentsRes.json();
        const solutionsData = await solutionsRes.json();

        const studentMap = {};
        const campusSet = new Set();
        const sectionSet = new Set();
        
        if (studentsData.status === "success") {
          studentsData.data.forEach(student => {
            studentMap[student.regNumber] = {
              studentName: student.studentName,
              campus: student.campus?.name || "N/A",
              section: student.section
            };
            
            if (student.campus?.name) campusSet.add(student.campus.name);
            if (student.section) sectionSet.add(student.section);
          });
          
          setStudents(studentMap);
          setCampuses(["All", ...Array.from(campusSet).sort()]);
          setSections(["All", ...Array.from(sectionSet).sort()]);
        }

        if (studentReportsData.status === "success" && patternsData.status === "success" && solutionsData.status === "success") {
          const processedData = processDetailedReports(
            studentReportsData.data, 
            patternsData.data,
            solutionsData.data,
            studentMap
          );
          setDetailedData(processedData);
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [streamFilter]);

  const handleBulkUpload = async () => {
    if (bulkData.length === 0) {
      setUploadStatus("No data to upload");
      return;
    }

    setUploadStatus("Uploading bulk reports...");
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_URL}/api/detailedreports/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reports: bulkData })
      });

      const result = await response.json();
      if (response.ok) {
        setUploadStatus("Bulk upload successful! Refreshing data...");
        setUploadProgress(100);
        setTimeout(() => {
          setShowUploadModal(false);
          setBulkData([]);
          window.location.reload();
        }, 1500);
      } else {
        setUploadStatus(`Error: ${result.message || 'Bulk upload failed'}`);
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setUploadStatus(`Error: ${err.message}`);
    }
  };

  const generateBulkData = () => {
    const generatedData = [];
    
    Object.entries(groupedData).forEach(([testName, testData]) => {
      testData.forEach(report => {
        const bulkReport = {
          regNumber: report.regNumber,
          studentName: report.studentName,
          campus: report.campus,
          section: report.section,
          stream: report.stream,
          testName: report.testName,
          date: report.date,
          subjects: report.subjects.map(subject => ({
            subjectName: subject.subjectName,
            totalQuestionsAttempted: subject.totalQuestionsAttempted,
            totalQuestionsUnattempted: subject.totalQuestionsUnattempted,
            correctAnswers: subject.correctAnswers,
            wrongAnswers: subject.wrongAnswers,
            totalMarks: subject.totalMarks,
            fullMarks: subject.fullMarks
          })),
          overallTotalMarks: report.overallTotalMarks,
          fullMarks: report.fullMarks,
          accuracy: report.accuracy,
          percentage: report.percentage,
          percentile: report.percentile,
          rank: report.rank
        };
        
        generatedData.push(bulkReport);
      });
    });
    
    setBulkData(generatedData);
    setShowUploadModal(true);
    setUploadStatus(`Generated ${generatedData.length} reports ready for upload`);
  };

  const processDetailedReports = (studentReports, patterns, solutions, studentMap) => {
    const solutionMap = {};
    solutions.forEach(sol => {
      const correctOptions = Array.isArray(sol.correctOptions) 
        ? sol.correctOptions 
        : sol.correctOption 
          ? [sol.correctOption] 
          : [];
      
      solutionMap[sol.questionNumber] = {
        correctOptions,
        isGrace: sol.isGrace || false
      };
    });
  
    const reportsWithPatterns = studentReports.map(report => {
      const cleanTestName = report.testName
        .replace(/\d+/g, '')
        .replace(/-/g, '')
        .trim();
      
      const pattern = patterns.find(p => 
        p.testName.replace(/\d+/g, '').trim() === cleanTestName && 
        p.type === report.stream
      );
      
      return { report, pattern };
    }).filter(({ pattern }) => pattern);
  
    const rankedReports = [...reportsWithPatterns].sort((a, b) => {
      if (b.report.totalMarks !== a.report.totalMarks) {
        return b.report.totalMarks - a.report.totalMarks;
      }
      return b.report.accuracy - a.report.accuracy;
    });
  
    let currentRank = 1;
    const rankedResults = [];
    
    for (let i = 0; i < rankedReports.length; i++) {
      if (i > 0 && 
          rankedReports[i].report.totalMarks === rankedReports[i-1].report.totalMarks &&
          rankedReports[i].report.accuracy === rankedReports[i-1].report.accuracy) {
      } else {
        currentRank = i + 1;
      }
      
      const percentile = ((rankedReports.length - currentRank) / rankedReports.length) * 100;
      
      rankedResults.push({
        ...rankedReports[i],
        rank: currentRank,
        percentile: parseFloat(percentile.toFixed(2))
      });
    }
  
    return rankedResults.map(({ report, pattern, rank, percentile }) => {
      const marksType = report.marksType || "+4/-1";
      const correctMark = marksType.includes("+4") ? 4 : 1;
      const wrongMark = marksType.includes("-1") ? -1 : 0;
  
      const questionSubjectMap = {};
      let currentQuestion = 1;
      
      pattern.subjects.forEach(subject => {
        const questionsInSubject = subject.totalQuestions || 0;
        for (let i = 0; i < questionsInSubject; i++) {
          questionSubjectMap[currentQuestion] = subject.subject.subjectName;
          currentQuestion++;
        }
      });
  
      const subjectData = {};
      pattern.subjects.forEach(subject => {
        const subjectName = subject.subject.subjectName;
        subjectData[subjectName] = {
          subjectName,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
          marks: 0,
          fullMarks: subject.totalMarks,
          style: subjectStyles[subjectName] || subjectStyles.default,
          hasGraceQuestions: false
        };
      });
  
      report.responses.forEach(response => {
        const subjectName = questionSubjectMap[response.questionNumber];
        if (!subjectName || !subjectData[subjectName]) return;
  
        const solution = solutionMap[response.questionNumber] || {};
        subjectData[subjectName].totalQuestions++;
        
        if (response.markedOption && response.markedOption.trim() !== '') {
          subjectData[subjectName].attempted++;
          
          if (solution.isGrace) {
            subjectData[subjectName].correct++;
            subjectData[subjectName].marks += correctMark;
            subjectData[subjectName].hasGraceQuestions = true;
          } else if (solution.correctOptions.includes(response.markedOption)) {
            subjectData[subjectName].correct++;
            subjectData[subjectName].marks += correctMark;
          } else {
            subjectData[subjectName].wrong++;
            subjectData[subjectName].marks += wrongMark;
          }
        } else {
          subjectData[subjectName].unattempted++;
        }
      });
  
      const subjects = Object.values(subjectData).map(subject => ({
        subjectName: subject.subjectName,
        totalQuestionsAttempted: subject.attempted,
        totalQuestionsUnattempted: subject.unattempted,
        correctAnswers: subject.correct,
        wrongAnswers: subject.wrong,
        totalMarks: parseFloat(subject.marks.toFixed(2)),
        fullMarks: subject.fullMarks,
        style: subject.style,
        hasGraceQuestions: subject.hasGraceQuestions
      }));
  
      const studentInfo = studentMap[report.regNumber] || {};
  
      return {
        regNumber: report.regNumber,
        studentName: studentInfo.studentName || "N/A",
        campus: studentInfo.campus || "N/A",
        section: studentInfo.section || "N/A",
        testName: report.testName,
        date: report.date,
        stream: report.stream,
        marksType,
        subjects,
        overallTotalMarks: report.totalMarks,
        fullMarks: pattern.totalMarks,
        accuracy: report.accuracy,
        percentage: report.percentage,
        percentile,
        rank
      };
    });
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const toggleSubjectExpansion = (subjectName) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectName]: !prev[subjectName]
    }));
  };

  const filteredData = useMemo(() => {
    let data = detailedData.filter(item => {
      const matchesStream = item.stream === streamFilter;
      const matchesSearch = searchTerm === "" || 
        item.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.regNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTest = !selectedTest || item.testName === selectedTest.testName;
      const matchesCampus = selectedCampus === "All" || 
        (typeof item.campus === 'object' ? item.campus.name : item.campus) === selectedCampus;
      const matchesSection = selectedSection === "All" || item.section === selectedSection;
      const testDate = new Date(item.date);
      const matchesDate = (!startDate || testDate >= startDate) && 
                         (!endDate || testDate <= endDate);
      
      return matchesStream && matchesSearch && matchesTest && 
             matchesCampus && matchesSection && matchesDate;
    });

    if (sortConfig.key) {
      data.sort((a, b) => {
        if (sortConfig.key === 'regNumber') {
          const aNum = parseInt(a.regNumber.replace(/\D/g, '')), 
                bNum = parseInt(b.regNumber.replace(/\D/g, ''));
          if (sortConfig.direction === 'asc') {
            return aNum - bNum;
          } else {
            return bNum - aNum;
          }
        }
        
        const getValue = (obj, key) => key.split('.').reduce((o, k) => (o || {})[k], obj);
        const aValue = getValue(a, sortConfig.key);
        const bValue = getValue(b, sortConfig.key);
        
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [detailedData, streamFilter, searchTerm, selectedTest, selectedCampus, selectedSection, startDate, endDate, sortConfig]);

  const groupedData = useMemo(() => {
    const groups = {};
    filteredData.forEach(item => {
      if (!groups[item.testName]) {
        groups[item.testName] = [];
      }
      groups[item.testName].push(item);
    });
    return groups;
  }, [filteredData]);

  useEffect(() => {
    if (filteredData.length > 0) {
      const initialPages = {};
      Object.keys(groupedData).forEach(testName => {
        initialPages[testName] = 1;
      });
      setTablePages(initialPages);
    }
  }, [filteredData, groupedData]);

  const handleTablePageChange = (testName, pageNumber) => {
    setTablePages(prev => ({
      ...prev,
      [testName]: pageNumber
    }));
  };

  const getPaginatedTestData = (testName, testData) => {
    const currentPage = tablePages[testName] || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return testData.slice(startIndex, endIndex);
  };

  const getTotalPagesForTest = (testData) => {
    return Math.ceil(testData.length / rowsPerPage);
  };

  const downloadTestCSV = (testName, testData) => {
    const headers = [
      "Sl.No", "Reg No", "Student Name", "Campus", "Section",
      ...testData[0].subjects.flatMap(subject => [
        `${subject.subjectName} Attempted`,
        `${subject.subjectName} Unattempted`,
        `${subject.subjectName} Correct`,
        `${subject.subjectName} Wrong`,
        `${subject.subjectName} Marks`
      ]),
      "Total Marks", "Accuracy", "Percentage", "Percentile"
    ];

    const csvContent = [
      headers.join(","),
      ...testData.map((row, index) => [
        index + 1,
        row.regNumber,
        `"${row.studentName}"`,
        `"${typeof row.campus === 'object' ? row.campus.name : row.campus}"`,
        row.section,
        ...row.subjects.flatMap(subject => [
          subject.totalQuestionsAttempted,
          subject.totalQuestionsUnattempted,
          subject.correctAnswers,
          subject.wrongAnswers,
          subject.totalMarks
        ]),
        row.overallTotalMarks,
        row.accuracy,
        row.percentage,
        row.percentile
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${testName.replace(/[^a-zA-Z0-9]/g, "_")}_report.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSubjectCell = (subject, value, type) => {
    const isGraceAffected = type === 'correct' && subject.hasGraceQuestions;
    
    return (
      <td 
        className={`py-2 px-4 border text-center relative ${isGraceAffected ? 'bg-purple-100' : ''}`}
        style={{ backgroundColor: subject.style.background }}
      >
        {value}
        {isGraceAffected && (
          <span className="absolute top-0 right-0 text-s font-semibold text-green-600">G</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 text-4xl">
          {subject.style.watermark}
        </span>
      </td>
    );
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return null;
  };

  const renderPagination = (testName, testData) => {
    const totalPages = getTotalPagesForTest(testData);
    const currentPage = tablePages[testName] || 1;

    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-4">
        <nav className="inline-flex rounded-md shadow">
          <button
            onClick={() => handleTablePageChange(testName, currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-l-md border ${currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
            <button
              key={number}
              onClick={() => handleTablePageChange(testName, number)}
              className={`px-3 py-1 border-t border-b ${currentPage === number ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {number.toString().padStart(2, '0')}
            </button>
          ))}
          
          <button
            onClick={() => handleTablePageChange(testName, currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-r-md border ${currentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Next
          </button>
        </nav>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Tests</h1>
      </div>

      <div className="max-w-7xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2">
            <input
              type="text"
              placeholder="Search by Test Name, Reg Number, or Student Name"
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="stream"
                checked={streamFilter === "LongTerm"}
                onChange={() => {
                  setStreamFilter("LongTerm");
                  setSelectedTest(null);
                  setTablePages({});
                }}
              />
              <span className="ml-2">LongTerm</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="stream"
                checked={streamFilter === "PUC"}
                onChange={() => {
                  setStreamFilter("PUC");
                  setSelectedTest(null);
                  setTablePages({});
                }}
              />
              <span className="ml-2">PUC</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedTest ? selectedTest.testName : ""}
              onChange={(e) => {
                const test = tests.find(t => t.testName === e.target.value);
                setSelectedTest(test || null);
                setTablePages({});
              }}
            >
              <option value="">All Tests</option>
              {tests
                .filter(test => test.stream === streamFilter)
                .map((test, index) => (
                  <option key={index} value={test.testName}>
                    {test.testName} ({new Date(test.date).toLocaleDateString()})
                  </option>
                ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value);
                setTablePages({});
              }}
            >
              {campuses.map((campus, index) => (
                <option key={index} value={campus}>{campus}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setTablePages({});
              }}
            >
              {sections.map((section, index) => (
                <option key={index} value={section}>{section}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="relative">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                  setTablePages({});
                }}
                isClearable={true}
                placeholderText="Select date range"
                className="w-full p-2 border rounded pl-10"
                dateFormat="MMM d, yyyy"
              />
              <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-4 mb-4">
          <button
            onClick={generateBulkData}
            className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:shadow-lg"
          >
            Generate Bulk Upload Data
          </button>
          <DownloadDropdown
            data={filteredData}
            streamFilter={streamFilter}
            studentData={students}
          />
          <button
            onClick={() => setShowNewReport(true)}
            className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-4 rounded-lg shadow hover:shadow-lg"
          >
            New Report +
          </button>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Bulk Upload Reports</h2>
              <p className="mb-4 text-sm text-gray-600">
                Ready to upload {bulkData.length} reports for {streamFilter} students.
                This will update all test data in the system.
              </p>
              
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{uploadStatus}</p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadProgress(0);
                    setUploadStatus("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploadProgress > 0}
                  className={`px-4 py-2 ${uploadProgress > 0 ? 'bg-gray-400' : 'bg-green-600'} text-white rounded hover:bg-green-700`}
                >
                  {uploadProgress > 0 ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 text-sm text-gray-600">
          Total records found: {filteredData.length}
          {selectedTest && ` for ${selectedTest.testName}`}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {Object.entries(groupedData).length > 0 ? (
              Object.entries(groupedData).map(([testName, testData]) => {
                const paginatedData = getPaginatedTestData(testName, testData);
                const currentPage = tablePages[testName] || 1;
                const startRecord = (currentPage - 1) * rowsPerPage + 1;
                const endRecord = Math.min(currentPage * rowsPerPage, testData.length);

                return (
                  <div key={testName} className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {testName} ({new Date(testData[0].date).toLocaleDateString()})
                        </h3>
                        <p className="text-sm text-gray-600">
                          Showing records {startRecord.toString().padStart(2, '0')}-{endRecord.toString().padStart(2, '0')} of {testData.length}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadTestCSV(testName, testData)}
                        className="bg-blue-500 text-white py-1 px-3 rounded text-sm"
                      >
                        Download CSV
                      </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border">
                        <thead>
                          <tr className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white">
                            <th className="py-2 px-4 border">Sl.No</th>
                            <th 
                              className="py-2 px-4 border cursor-pointer"
                              onClick={() => requestSort("regNumber")}
                            >
                              Reg No {renderSortIndicator("regNumber")}
                            </th>
                            <th 
                              className="py-2 px-4 border cursor-pointer"
                              onClick={() => requestSort("studentName")}
                            >
                              Student {renderSortIndicator("studentName")}
                            </th>
                            <th 
                              className="py-2 px-4 border cursor-pointer"
                              onClick={() => requestSort("campus")}
                            >
                              Campus {renderSortIndicator("campus")}
                            </th>
                            <th 
                              className="py-2 px-4 border cursor-pointer"
                              onClick={() => requestSort("section")}
                            >
                              Section {renderSortIndicator("section")}
                            </th>
                            
                            {testData[0]?.subjects?.map((subject, idx) => (
                              <React.Fragment key={idx}>
                                <th 
                                  colSpan={expandedSubjects[subject.subjectName] ? 5 : 1}
                                  className="py-2 px-4 border text-center relative"
                                >
                                  <div className="flex items-center justify-center">
                                    {subject.subjectName} ({subject.fullMarks})
                                    <button 
                                      onClick={() => toggleSubjectExpansion(subject.subjectName)}
                                      className="ml-2 text-xs bg-white text-orange-500 rounded-full w-5 h-5 flex items-center justify-center"
                                    >
                                      {expandedSubjects[subject.subjectName] ? '−' : '+'}
                                    </button>
                                  </div>
                                </th>
                              </React.Fragment>
                            ))}
                            
                            <th colSpan="4" className="py-2 px-4 text-center">
                              Total ({testData[0].subjects.reduce((sum, sub) => sum + sub.fullMarks, 0)})
                            </th>
                          </tr>
                          
                          <tr className="bg-gray-50">
                            <th colSpan="5"></th>
                            {testData[0]?.subjects?.map((subject, idx) => (
                              <React.Fragment key={idx}>
                                {expandedSubjects[subject.subjectName] ? (
                                  <>
                                    <th className="py-1 px-2 border text-xs">Attempted</th>
                                    <th className="py-1 px-2 border text-xs">Unattempted</th>
                                    <th className="py-1 px-2 border text-xs">Correct</th>
                                    <th className="py-1 px-2 border text-xs">Wrong</th>
                                    <th className="py-1 px-2 border text-xs">Marks</th>
                                  </>
                                ) : (
                                  <th className="py-1 px-2 border text-xs">Marks</th>
                                )}
                              </React.Fragment>
                            ))}
                            <th className="py-1 px-2 border text-xs">Marks</th>
                            <th className="py-1 px-2 border text-xs">Accuracy</th>
                            <th className="py-1 px-2 border text-xs">%</th>
                            <th className="py-1 px-2 border text-xs">Percentile</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.map((report, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="py-2 px-4 border text-center">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                              <td className="py-2 px-4 border">
                                <div className="flex items-center gap-2"><span>{report.regNumber}</span>
                                </div>
                              </td>
                              <td className="py-2 px-4 border">{report.studentName}</td>
                              <td className="py-2 px-4 border">{typeof report.campus === 'object' ? report.campus.name : report.campus}</td>
                              <td className="py-2 px-4 border">{report.section}</td>
                              
                              {report.subjects.map((subject, idx) => (
                                <React.Fragment key={idx}>
                                  {expandedSubjects[subject.subjectName] ? (
                                    <>
                                      {renderSubjectCell(subject, subject.totalQuestionsAttempted, 'attempted')}
                                      {renderSubjectCell(subject, subject.totalQuestionsUnattempted, 'unattempted')}
                                      {renderSubjectCell(subject, subject.correctAnswers, 'correct')}
                                      {renderSubjectCell(subject, subject.wrongAnswers, 'wrong')}
                                      {renderSubjectCell(subject, subject.totalMarks, 'marks')}
                                    </>
                                  ) : (
                                    renderSubjectCell(subject, subject.totalMarks, 'marks')
                                  )}
                                </React.Fragment>
                              ))}
                              
                              <td className="py-2 px-4 border text-center font-medium">
                                {report.overallTotalMarks}
                              </td>
                              <td className="py-2 px-4 border text-center">{report.accuracy}%</td>
                              <td className="py-2 px-4 border text-center">{report.percentage}%</td>
                              <td className="py-2 px-4 border text-center">{report.percentile}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {renderPagination(testName, testData)}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg mb-4">
                  {detailedData.length === 0 ? "No reports available yet" : "No reports match your current filters"}
                </p>
                {detailedData.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedTest(null);
                      setSelectedCampus("All");
                      setSelectedSection("All");
                      setDateRange([null, null]);
                      setSearchTerm("");
                      setTablePages({});
                    }}
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showNewReport && <NewReport onClose={() => setShowNewReport(false)} />}
    </div>
  );
}