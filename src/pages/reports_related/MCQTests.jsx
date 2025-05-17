import React, { useEffect, useState, useMemo } from "react";

const subjectStyles = {
  "Physics": { background: "rgba(100, 149, 237, 0.1)", watermark: "⚛️" },
  "Chemistry": { background: "rgba(144, 238, 144, 0.1)", watermark: "🧪" },
  "Mathematics": { background: "rgba(255, 165, 0, 0.1)", watermark: "🧮" },
  "Biology": { background: "rgba(60, 179, 113, 0.1)", watermark: "🧬" },
  "Botany": { background: "rgba(34, 139, 34, 0.1)", watermark: "🌿" },
  "Zoology": { background: "rgba(46, 139, 87, 0.1)", watermark: "🐾" },
  "default": { background: "rgba(211, 211, 211, 0.1)", watermark: "📚" }
};

export default function MCQTests({
  streamFilter,
  searchTerm,
  selectedTest,
  selectedCampus,
  selectedSection,
  dateRange,
  students
}) {
  const [detailedData, setDetailedData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "regNumber", direction: "asc" });
  const [tablePages, setTablePages] = useState({});
  const [rowsPerPage] = useState(10);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const [reportsRes, patternsRes, solutionsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_URL}/api/getstudentreports?stream=${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          fetch(`${process.env.REACT_APP_URL}/api/getpatterns?stream=${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          fetch(`${process.env.REACT_APP_URL}/api/getsolutionbank?stream=${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
        ]);

        const reportsData = await reportsRes.json();
        const patternsData = await patternsRes.json();
        const solutionsData = await solutionsRes.json();

        if (reportsData.status === "success" && patternsData.status === "success" && solutionsData.status === "success") {
          const processedData = processDetailedReports(
            reportsData.data, 
            patternsData.data,
            solutionsData.data,
            students
          );
          setDetailedData(processedData);
        }

      } catch (err) {
        console.error("Error fetching MCQ data:", err);
      }
    };

    fetchData();
  }, [streamFilter, students]);

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
      // Clean test name by removing numbers and spaces
      const cleanTestName = report.testName
        .replace(/\d+/g, '')
        .replace(/\s+/g, '')
        .trim();
      
      // Find matching pattern considering PCT(NEET) and PCT(CET) as different tests
      const pattern = patterns.find(p => {
        const patternCleanName = p.testName
          .replace(/\d+/g, '')
          .replace(/\s+/g, '')
          .trim();
        return patternCleanName === cleanTestName && p.type === report.stream;
      });
      
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

    return rankedResults.map(({ report, pattern, rank, percentile }) => {
      // Determine marks type based on test name
      const isPCTNEET = report.testName.includes('PCT(NEET)');
      const isPCTCET = report.testName.includes('PCT(CET)');
      
      const marksType = report.marksType || (isPCTNEET ? "+4/-1" : isPCTCET ? "+1/0" : "+4/-1");
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
      const matchesDate = (!dateRange[0] || testDate >= dateRange[0]) && 
                         (!dateRange[1] || testDate <= dateRange[1]);
      
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
  }, [detailedData, streamFilter, searchTerm, selectedTest, selectedCampus, selectedSection, dateRange, sortConfig]);

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

  const uploadDetailedReports = async (testData) => {
    if (!testData || testData.length === 0) {
      alert('No test data available to upload');
      return;
    }
  
    if (!window.confirm(`Are you sure you want to upload detailed reports for ${testData.length} students?`)) {
      return;
    }
  
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const CHUNK_SIZE = 100;
      let successfulUploads = 0;
      let failedUploads = 0;
      let errors = [];
  
      for (let i = 0; i < testData.length; i += CHUNK_SIZE) {
        const chunk = testData.slice(i, i + CHUNK_SIZE);
        
        const payload = {
          reports: chunk.map(report => ({
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
          }))
        };
  
        try {
          const response = await fetch(`${process.env.REACT_APP_URL}/api/detailedreports/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
  
          const result = await response.json();
  
          if (!response.ok) {
            throw new Error(result.message || 'Chunk upload failed');
          }
  
          successfulUploads += result.insertedCount || chunk.length;
          
          if (result.duplicateCount) {
            failedUploads += result.duplicateCount;
          }
          if (result.validationErrors) {
            failedUploads += result.validationErrors.length;
          }
          if (result.errors) {
            errors = [...errors, ...result.errors];
          }
        } catch (chunkError) {
          console.error(`Error uploading chunk ${i / CHUNK_SIZE + 1}:`, chunkError);
          failedUploads += chunk.length;
          errors.push({
            chunk: i / CHUNK_SIZE + 1,
            error: chunkError.message
          });
        }
      }
  
      if (failedUploads > 0) {
        alert(`Upload completed with ${successfulUploads} successful and ${failedUploads} failed uploads.`);
        console.log('Detailed errors:', errors);
      } else {
        alert(`Successfully uploaded ${successfulUploads} detailed reports!`);
      }
  
    } catch (error) {
      console.error('Error in upload process:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
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
      <div className="flex justify-center items-center mt-4 space-x-2">
        <button
          onClick={() => handleTablePageChange(testName, currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md border ${
            currentPage === 1 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          &lt;
        </button>
        
        <span className="px-3 py-1 text-sm text-gray-700">
          {currentPage}/{totalPages}
        </span>
        
        <button
          onClick={() => handleTablePageChange(testName, currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-md border ${
            currentPage === totalPages 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          &gt;
        </button>
      </div>
    );
  };

  return (
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
                <div className="flex gap-2">
                  <button
                    onClick={() => uploadDetailedReports(testData)}
                    className="bg-green-600 text-white py-1 px-3 rounded text-sm"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload Detailed Reports'}
                  </button>
                  <button
                    onClick={() => downloadTestCSV(testName, testData)}
                    className="bg-blue-500 text-white py-1 px-3 rounded text-sm"
                  >
                    Download CSV
                  </button>
                </div>
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
            {detailedData.length === 0 ? "No MCQ tests available yet" : "No tests match your current filters"}
          </p>
        </div>
      )}
    </div>
  );
}