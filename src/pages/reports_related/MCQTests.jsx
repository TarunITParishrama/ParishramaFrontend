import React, { useEffect, useState, useMemo } from "react";
import crown from "../../assets/crown.png";

const subjectStyles = {
  "Physics": { background: "rgba(100, 149, 237, 0.1)", watermark: "⚛️" },
  "Chemistry": { background: "rgba(144, 238, 144, 0.1)", watermark: "🧪" },
  "Mathematics": { background: "rgba(255, 165, 0, 0.1)", watermark: "🧮" },
  "Biology": { background: "rgba(60, 179, 113, 0.1)", watermark: "🧬" },
  "default": { background: "rgba(211, 211, 211, 0.1)", watermark: "📚" }
};

export default function MCQTests({
  streamFilter,
  selectedCampus,
  selectedSection,
  students
}) {
  const [testResults, setTestResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "rank", direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTestName, setSelectedTestName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch all test names when component mounts or stream changes
  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.REACT_APP_URL}/api/getalltestnames?stream=${streamFilter}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (data.status === "success") {
          setAvailableTests(data.data);
        }
      } catch (err) {
        console.error("Error fetching test names:", err);
        setError("Failed to load test names");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTestNames();
  }, [streamFilter]);

  const loadTestResults = async (testName) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Fetch present students' results
      const resultsRes = await fetch(
        `${process.env.REACT_APP_URL}/api/gettestresultsbytest/${encodeURIComponent(testName)}?stream=${streamFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const resultsData = await resultsRes.json();
      
      if (resultsData.status !== "success") {
        throw new Error(resultsData.message || "No results found for this test");
      }
      
      setTestResults(resultsData.data || []);
      setSelectedTestName(testName);
    } catch (err) {
      console.error("Error fetching test results:", err);
      setError(err.message);
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  };

const submitDetailedReport = async () => {
  if (!selectedTestName || testResults.length === 0) {
    setSubmitError("No test selected or no results available");
    return;
  }

  try {
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    const token = localStorage.getItem('token');
    const testDate = testResults[0].date;
    const fullMarks = testResults[0].fullMarks || 0;
    
    // Get subject structure from present students
    const subjectStructure = testResults[0]?.subjects ? 
      Object.entries(testResults[0].subjects).map(([subjectName, subjectData]) => ({
        subjectName,
        totalMarks: subjectData.marks
      })) : [];

    // Prepare reports data
    const reports = combinedData.map(item => {
      // For absent students, create subjects with 0 scores but keep the structure
      const subjectsForAbsent = subjectStructure.map(subject => ({
        subjectName: subject.subjectName,
        scored: 0,
        totalMarks: subject.totalMarks
      }));

      const report = {
        regNumber: item.regNumber,
        studentName: item.studentName,
        campus: item.campus,
        section: item.section,
        stream: streamFilter,
        testName: selectedTestName,
        date: testDate,
        subjects: item.isPresent 
          ? Object.entries(item.subjects).map(([subjectName, subjectData]) => ({
              subjectName,
              scored: subjectData.scored,
              totalMarks: subjectData.marks
            }))
          : subjectsForAbsent,
        overallTotalMarks: item.isPresent ? item.totalMarks : 0,
        fullMarks: fullMarks,
        percentage: item.isPresent ? item.percentage : 0,
        percentile: item.isPresent ? item.percentile : 0,
        rank: item.isPresent ? item.rank : 0,
        isPresent: item.isPresent
      };

      // Add remarks based on percentile
      if (item.isPresent) {
        if (item.percentile < 50) {
          report.remarks = "Needs foundational revision";
        } else if (item.percentile >= 50 && item.percentile < 75) {
          report.remarks = "May secure BDS / AYUSH / Pvt Mgmt seat";
        } else if (item.percentile >= 75 && item.percentile < 90) {
          report.remarks = "Pvt MBBS / Reserved Govt possibility";
        } else {
          report.remarks = "High performance zone - Strong Govt MBBS chance";
        }
      } else {
        report.remarks = "Absent for the test";
      }

      return report;
    });

    const response = await fetch(
      `${process.env.REACT_APP_URL}/api/detailedreports/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          reports, 
          markAbsentStudents: true 
        })
      }
    );

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message || "Failed to submit detailed reports");
    }

    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);
  } catch (err) {
    console.error("Error submitting detailed reports:", err);
    setSubmitError(err.message);
  } finally {
    setSubmitLoading(false);
  }
};

  const combinedData = useMemo(() => {
    if (!students || Object.keys(students).length === 0) return [];
    
    // Get all student regNumbers
    const allStudentRegNumbers = Object.keys(students);
    
    // Get present student regNumbers from test results
    const presentRegNumbers = new Set(testResults.map(result => result.regNumber));
    
    // Create combined data
    return allStudentRegNumbers.map(regNumber => {
      const studentInfo = students[regNumber];
      
      if (presentRegNumbers.has(regNumber)) {
        // Student is present - find their test result
        const result = testResults.find(r => r.regNumber === regNumber);
        return {
          ...result,
          studentName: studentInfo.studentName,
          campus: studentInfo.campus,
          section: studentInfo.section,
          isPresent: true
        };
      } else {
        // Student is absent
        return {
          regNumber,
          studentName: studentInfo.studentName,
          campus: studentInfo.campus,
          section: studentInfo.section,
          isPresent: false,
          rank: null,
          subjects: null,
          totalMarks: null,
          percentage: null,
          percentile: null
        };
      }
    });
  }, [testResults, students]);

  const filteredData = useMemo(() => {
    let data = combinedData.filter(item => {
      const matchesCampus = selectedCampus === "All" || item.campus === selectedCampus;
      const matchesSection = selectedSection === "All" || item.section === selectedSection;
      return matchesCampus && matchesSection;
    });

    // Sorting logic
    if (sortConfig.key) {
      data.sort((a, b) => {
        // Handle absent students (they won't have ranks/scores)
        if (!a.isPresent && !b.isPresent) return 0;
        if (!a.isPresent) return 1;
        if (!b.isPresent) return -1;

        // Special handling for rank (absent students should be last)
        if (sortConfig.key === 'rank') {
          return sortConfig.direction === 'asc' 
            ? (a.rank || Infinity) - (b.rank || Infinity)
            : (b.rank || -Infinity) - (a.rank || -Infinity);
        }

        // Special handling for regNumber (numeric sorting)
        if (sortConfig.key === 'regNumber') {
          const aNum = parseInt(a.regNumber.replace(/\D/g, ''), 10);
          const bNum = parseInt(b.regNumber.replace(/\D/g, ''), 10);
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // Default sorting for other fields
        const aValue = sortConfig.key.includes('.') 
          ? sortConfig.key.split('.').reduce((o, k) => (o || {})[k], a)
          : a[sortConfig.key];
        const bValue = sortConfig.key.includes('.') 
          ? sortConfig.key.split('.').reduce((o, k) => (o || {})[k], b)
          : b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [combinedData, selectedCampus, selectedSection, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const downloadCSV = () => {
    if (filteredData.length === 0) {
      alert('No data available to download');
      return;
    }

    const headers = [
      'Rank', 'Reg Number', 'Student Name', 'Campus', 'Section', 'Status'
    ];

    // Add subject columns if present
    const subjects = testResults[0]?.subjects ? Object.keys(testResults[0].subjects) : [];
    headers.push(...subjects);
    headers.push('Total Marks', 'Percentage', 'Percentile');

    const csvContent = [
      headers.join(','),
      ...filteredData.map((row) => {
        const rowData = [
          row.isPresent ? row.rank : 'N/A',
          row.regNumber,
          `"${row.studentName}"`,
          row.campus,
          row.section,
          row.isPresent ? 'Present' : 'Absent'
        ];

        // Add subject scores if present
        if (row.isPresent && row.subjects) {
          subjects.forEach(subject => {
            rowData.push(row.subjects[subject]?.scored || 'N/A');
          });
        } else {
          // Add placeholders for absent students
          rowData.push(...Array(subjects.length).fill('N/A'));
        }

        // Add totals
        rowData.push(
          row.isPresent ? row.totalMarks : 'N/A',
          row.isPresent ? row.percentage : 'N/A',
          row.isPresent ? row.percentile : 'N/A'
        );

        return rowData.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TestResults_${selectedTestName || 'All'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
      {/* Test Selection Section */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Test</label>
            <select
              value={selectedTestName}
              onChange={(e) => loadTestResults(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || availableTests.length === 0}
            >
              <option value="">-- Select a test --</option>
              {availableTests.map((test, index) => (
                <option key={index} value={test}>
                  {test}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-500">
            {error}
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Showing results for: {selectedTestName} • 
            Date: {new Date(testResults[0].date).toLocaleDateString()} • 
            Present: {testResults.length} • Absent: {Object.keys(students).length - testResults.length}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredData.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">
              {selectedTestName || 'Test Results'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Download CSV
              </button>
              <button
                onClick={submitDetailedReport}
                disabled={submitLoading || !selectedTestName}
                className={`px-4 py-2 rounded ${submitLoading || !selectedTestName ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {submitLoading ? 'Submitting...' : 'Submit Detailed Report'}
              </button>
            </div>
          </div>

          {submitError && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
              <p>{submitError}</p>
            </div>
          )}

          {submitSuccess && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
              <p>Detailed reports submitted successfully!</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-50">
                  <th 
                    className="py-3 px-4 border-b cursor-pointer"
                    onClick={() => requestSort('rank')}
                  >
                    Rank {renderSortIndicator('rank')}
                  </th>
                  <th 
                    className="py-3 px-4 border-b cursor-pointer"
                    onClick={() => requestSort('regNumber')}
                  >
                    Reg No {renderSortIndicator('regNumber')}
                  </th>
                  <th 
                    className="py-3 px-4 border-b cursor-pointer"
                    onClick={() => requestSort('studentName')}
                  >
                    Student Name {renderSortIndicator('studentName')}
                  </th>
                  <th 
                    className="py-3 px-4 border-b cursor-pointer"
                    onClick={() => requestSort('campus')}
                  >
                    Campus {renderSortIndicator('campus')}
                  </th>
                  <th 
                    className="py-3 px-4 border-b cursor-pointer"
                    onClick={() => requestSort('section')}
                  >
                    Section {renderSortIndicator('section')}
                  </th>
                  <th className="py-3 px-4 border-b">Status</th>
                  
                  {/* Dynamic subject columns */}
                  {testResults[0]?.subjects && Object.entries(testResults[0].subjects).map(([subject, data]) => (
                    <th 
                      key={subject}
                      className="py-3 px-4 border-b text-center"
                    >
                      {subject} ({data.marks})
                    </th>
                  ))}
                  
                  <th className="py-3 px-4 border-b">Total</th>
                  <th className="py-3 px-4 border-b">%</th>
                  <th className="py-3 px-4 border-b">Percentile</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-center">
                      {row.isPresent ? row.rank : 'N/A'}
                    </td>
                    <td className="py-2 px-4 border-b">
                      <div className="flex items-center gap-2">
                        {row.regNumber}
                        {row.rank === 1 && (
                          <span className="ml-2 bg-yellow-600 text-white px-2 py-1 rounded-full text-xs inline-flex items-center">
                            TOP 1
                            <img src={crown} className="w-3 h-3 ml-1 -mt-px" alt="crown" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 border-b">{row.studentName}</td>
                    <td className="py-2 px-4 border-b">{row.campus}</td>
                    <td className="py-2 px-4 border-b">{row.section}</td>
                    <td className="py-2 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {row.isPresent ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    
                    {/* Subject scores */}
                    {testResults[0]?.subjects && Object.entries(testResults[0].subjects).map(([subject]) => (
                      <td key={subject} className="py-2 px-4 border-b text-center">
                        {row.isPresent && row.subjects?.[subject]?.scored !== undefined 
                          ? row.subjects[subject].scored 
                          : 'N/A'}
                      </td>
                    ))}
                    
                    <td className="py-2 px-4 border-b text-center font-medium">
                      {row.isPresent ? row.totalMarks : 'N/A'}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      {row.isPresent ? row.percentage : 'N/A'}%
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      {row.isPresent ? row.percentile : 'N/A'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            {selectedTestName
              ? "No students match your current filters"
              : "Please select a test to view results"}
          </p>
        </div>
      )}
    </div>
  );
}