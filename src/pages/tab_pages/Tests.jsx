import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NewReport from "../stud/NewReport";
import DatePicker from "react-datepicker";
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const [reportsRes, studentReportsRes, patternsRes, studentsRes, solutionsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_URL}/api/getallreports`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getstudentreports`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getpatterns`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getstudents`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.REACT_APP_URL}/api/getsolutionbank`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const reportsData = await reportsRes.json();
        if (reportsData.status === "success" && Array.isArray(reportsData.data)) {
          const uniqueTests = Array.from(new Set(
            reportsData.data.map(item => item.testName)
          )).map(testName => {
            const test = reportsData.data.find(item => item.testName === testName);
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
  }, []);

  // Updated processDetailedReports function
  const processDetailedReports = (studentReports, patterns, solutions, studentMap) => {
    // Create solution map with grace information and correct options
    const solutionMap = {};
    solutions.forEach(sol => {
      // Handle both array and single value cases for correctOptions
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
  
    // Process each report with pattern matching
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
  
    // Calculate ranks with proper tie handling
    const rankedReports = [...reportsWithPatterns].sort((a, b) => {
      // Primary sort by total marks descending
      if (b.report.totalMarks !== a.report.totalMarks) {
        return b.report.totalMarks - a.report.totalMarks;
      }
      // Secondary sort by accuracy if marks are equal
      return b.report.accuracy - a.report.accuracy;
    });
  
    // Calculate ranks and percentiles
    let currentRank = 1;
    const rankedResults = [];
    
    for (let i = 0; i < rankedReports.length; i++) {
      // Same rank if marks and accuracy are equal to previous
      if (i > 0 && 
          rankedReports[i].report.totalMarks === rankedReports[i-1].report.totalMarks &&
          rankedReports[i].report.accuracy === rankedReports[i-1].report.accuracy) {
        // Same rank as previous
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
  
    // Process subject breakdown with grace marks
    return rankedResults.map(({ report, pattern, rank, percentile }) => {
      const marksType = report.marksType || "+4/-1";
      const correctMark = marksType.includes("+4") ? 4 : 1;
      const wrongMark = marksType.includes("-1") ? -1 : 0;
  
      // Question to subject mapping
      const questionSubjectMap = {};
      let currentQuestion = 1;
      
      pattern.subjects.forEach(subject => {
        const questionsInSubject = subject.totalQuestions || 0;
        for (let i = 0; i < questionsInSubject; i++) {
          questionSubjectMap[currentQuestion] = subject.subject.subjectName;
          currentQuestion++;
        }
      });
  
      // Initialize subject data
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
          hasGraceQuestions: false // Track if subject has any grace questions
        };
      });
  
      // Process each response with grace mark consideration
      report.responses.forEach(response => {
        const subjectName = questionSubjectMap[response.questionNumber];
        if (!subjectName || !subjectData[subjectName]) return;
  
        const solution = solutionMap[response.questionNumber] || {};
        subjectData[subjectName].totalQuestions++;
        
        if (response.markedOption && response.markedOption.trim() !== '') {
          subjectData[subjectName].attempted++;
          
          // Grace mark takes precedence
          if (solution.isGrace) {
            subjectData[subjectName].correct++;
            subjectData[subjectName].marks += correctMark;
            subjectData[subjectName].hasGraceQuestions = true;
          } else if (solution.correctOptions.includes(response.markedOption)) {
            // Correct option marked
            subjectData[subjectName].correct++;
            subjectData[subjectName].marks += correctMark;
          } else {
            // Wrong option marked
            subjectData[subjectName].wrong++;
            subjectData[subjectName].marks += wrongMark;
          }
        } else {
          subjectData[subjectName].unattempted++;
        }
      });
  
      // Convert to array format
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

  // Request sort for a specific column
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter data based on all selected filters
  const filteredData = useMemo(() => {
    return detailedData.filter(item => {
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
  }, [detailedData, streamFilter, searchTerm, selectedTest, selectedCampus, selectedSection, startDate, endDate]);
  
  // Sort the data
  const sortedData = useMemo(() => {
    let sortableData = [...filteredData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        const getValue = (obj, key) => key.split('.').reduce((o, k) => (o || {})[k], obj);
        const aValue = getValue(a, sortConfig.key);
        const bValue = getValue(b, sortConfig.key);
        
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);

  // Calculate total marks for each subject and overall total
  const subjectTotalMarks = {};
  let overallTotal = 0;

  if (sortedData.length > 0 && sortedData[0].subjects) {
    sortedData[0].subjects.forEach(subject => {
      subjectTotalMarks[subject.subjectName] = subject.fullMarks;
      overallTotal += subject.fullMarks;
    });
  }

  // Render watermarked subject cell
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

  // Render sort indicator
  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Tests</h1>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Search Input */}
          <div className="col-span-1 md:col-span-2">
            <input
              type="text"
              placeholder="Search by Test Name, Reg Number, or Student Name"
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Stream Filter */}
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="stream"
                checked={streamFilter === "LongTerm"}
                onChange={() => setStreamFilter("LongTerm")}
              />
              <span className="ml-2">LongTerm</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="stream"
                checked={streamFilter === "PUC"}
                onChange={() => setStreamFilter("PUC")}
              />
              <span className="ml-2">PUC</span>
            </label>
          </div>
          
          {/* Test Name Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedTest ? selectedTest.testName : ""}
              onChange={(e) => {
                const test = tests.find(t => t.testName === e.target.value);
                setSelectedTest(test || null);
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
          
          {/* Campus Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
            >
              {campuses.map((campus, index) => (
                <option key={index} value={campus}>{campus}</option>
              ))}
            </select>
          </div>
          
          {/* Section Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {sections.map((section, index) => (
                <option key={index} value={section}>{section}</option>
              ))}
            </select>
          </div>
          
          {/* Date Range Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              isClearable={true}
              placeholderText="Select date range"
              className="w-full p-2 border rounded"
              dateFormat="MMM d, yyyy"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-4 mb-4">
          <DownloadDropdown
            data={sortedData}
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

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {sortedData.length} of {detailedData.length} records
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {sortedData.length > 0 ? (
              <table className="min-w-full bg-white border">
                <thead>
                  <tr className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white">
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
                    
                    {/* Dynamic Subject Headers */}
                    {sortedData[0]?.subjects?.map((subject, idx) => (
                      <th key={idx} colSpan="5" className="py-2 px-4 border text-center">
                        {subject.subjectName} ({subject.fullMarks})
                      </th>
                    ))}
                    
                    <th colSpan="4" className="py-2 px-4 text-center">
                      Total ({overallTotal})
                    </th>
                  </tr>
                  
                  {/* Sub-headers for subjects */}
                  <tr className="bg-gray-50">
                    <th colSpan="4"></th>
                    {sortedData[0]?.subjects?.map((subject, idx) => (
                      <React.Fragment key={idx}>
                        <th className="py-1 px-2 border text-xs">Attempted</th>
                        <th className="py-1 px-2 border text-xs">Unattempted</th>
                        <th className="py-1 px-2 border text-xs">Correct</th>
                        <th className="py-1 px-2 border text-xs">Wrong</th>
                        <th className="py-1 px-2 border text-xs">Marks</th>
                      </React.Fragment>
                    ))}
                    <th className="py-1 px-2 border text-xs">Marks</th>
                    <th className="py-1 px-2 border text-xs">Accuracy</th>
                    <th className="py-1 px-2 border text-xs">%</th>
                    <th className="py-1 px-2 border text-xs">Percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((report, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border">
                        <div className="flex items-center gap-2"><span>{report.regNumber}</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 border">{report.studentName}</td>
                      <td className="py-2 px-4 border">{typeof report.campus === 'object' ? report.campus.name : report.campus}</td>
                      <td className="py-2 px-4 border">{report.section}</td>
                      
                      {/* Subject-wise data with watermarks */}
                      {report.subjects.map((subject, idx) => (
                        <React.Fragment key={idx}>
                          {renderSubjectCell(subject, subject.totalQuestionsAttempted, 'attempted')}
                          {renderSubjectCell(subject, subject.totalQuestionsUnattempted, 'unattempted')}
                          {renderSubjectCell(subject, subject.correctAnswers, 'correct')}
                          {renderSubjectCell(subject, subject.wrongAnswers, 'wrong')}
                          {renderSubjectCell(subject, subject.totalMarks, 'marks')}
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

      {/* New Report Modal */}
      {showNewReport && <NewReport onClose={() => setShowNewReport(false)} />}
    </div>
  );
}