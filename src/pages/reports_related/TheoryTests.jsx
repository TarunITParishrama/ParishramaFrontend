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

export default function TheoryTests({
  streamFilter = "PUC",
  searchTerm,
  selectedTest,
  selectedCampus,
  selectedSection,
  students
}) {
  const [theoryData, setTheoryData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "regNumber", direction: "asc" });
  const [tablePages, setTablePages] = useState({});
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${process.env.REACT_APP_URL}/api/gettheorytests/${streamFilter}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        const data = await response.json();

        if (data.status === "success") {
          setTheoryData(data.data);
        }

      } catch (err) {
        console.error("Error fetching theory test data:", err);
      }
    };

    fetchData();
  }, [streamFilter]);

  // Process and group the theory test data
  const groupedTests = useMemo(() => {
    const groups = {};
    
    theoryData.forEach(test => {
      if (!groups[test.testName]) {
        groups[test.testName] = {
          testInfo: {
            name: test.testName,
            date: test.date,
            stream: test.stream
          },
          subjects: test.subjectDetails,
          totalMarks: test.subjectDetails.reduce((sum, sub) => sum + sub.maxMarks, 0),
          students: []
        };
      }
      
      // Add student results
      test.studentResults.forEach(result => {
        const studentInfo = students[result.regNumber] || {};
        const subjectMarksMap = {};
        
        result.subjectMarks.forEach(subject => {
          subjectMarksMap[subject.name] = subject.marks;
        });
        
        groups[test.testName].students.push({
          ...result,
          studentName: studentInfo.studentName || "N/A",
          campus: studentInfo.campus || "N/A",
          section: studentInfo.section || "N/A",
          subjectMarks: subjectMarksMap
        });
      });
    });
    
    return groups;
  }, [theoryData, students]);

  // Filter tests based on selected filters
const filteredTests = useMemo(() => {
  return Object.values(groupedTests).filter(test => {
    const matchesStream = test.testInfo.stream === streamFilter;
    const matchesSearch = !searchTerm || 
      (test.testInfo.name && test.testInfo.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTest = !selectedTest || test.testInfo.name === selectedTest.testName;
    const matchesCampus = selectedCampus === "All" || 
      test.students.some(s => s.campus === selectedCampus);
    const matchesSection = selectedSection === "All" || 
      test.students.some(s => s.section === selectedSection);
    //const testDate = new Date(test.testInfo.date);
    //const matchesDate = (!dateRange[0] || testDate >= dateRange[0]) && 
//(!dateRange[1] || testDate <= dateRange[1]);
    
    return matchesStream && matchesSearch && matchesTest && 
           matchesCampus && matchesSection;
  });
}, [groupedTests, streamFilter, searchTerm, selectedTest, selectedCampus, selectedSection]);

  // Sort students within each test
  const sortedTests = useMemo(() => {
    return filteredTests.map(test => {
      const sortedStudents = [...test.students].sort((a, b) => {
        if (sortConfig.key === 'regNumber') {
          const aNum = parseInt(a.regNumber.replace(/\D/g, '')), 
                bNum = parseInt(b.regNumber.replace(/\D/g, ''));
          if (sortConfig.direction === 'asc') {
            return aNum - bNum;
          } else {
            return bNum - aNum;
          }
        }
        
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
      
      return {
        ...test,
        students: sortedStudents
      };
    });
  }, [filteredTests, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "asc" ? "↑" : "↓";
    }
    return null;
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

  const downloadTestCSV = (testName, testData) => {
    const headers = [
      "Sl.No", "Reg No", "Student Name", "Campus", "Section",
      ...testData.subjects.map(subject => `${subject.name} (${subject.maxMarks})`),
      "Total Marks", "Percentage"
    ];

    const csvContent = [
      headers.join(","),
      ...testData.students.map((student, index) => [
        index + 1,
        student.regNumber,
        `"${student.studentName}"`,
        `"${student.campus}"`,
        student.section,
        ...testData.subjects.map(subject => student.subjectMarks[subject.name] || 0),
        student.totalMarks || 0,
        student.percentage ? 
          parseFloat(student.percentage).toFixed(2) + '%' : '0%'
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${testName.replace(/[^a-zA-Z0-9]/g, "_")}_theory_report.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSubjectCell = (subjectName, marks) => {
    const style = subjectStyles[subjectName] || subjectStyles.default;
    
    return (
      <td 
        className="py-2 px-4 border text-center relative"
        style={{ backgroundColor: style.background }}
      >
        {marks}
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 text-4xl">
          {style.watermark}
        </span>
      </td>
    );
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
      {sortedTests.length > 0 ? (
        sortedTests.map((test, index) => {
          const paginatedStudents = getPaginatedTestData(test.testInfo.name, test.students);
          const currentPage = tablePages[test.testInfo.name] || 1;
          const startRecord = (currentPage - 1) * rowsPerPage + 1;
          const endRecord = Math.min(currentPage * rowsPerPage, test.students.length);

          return (
            <div key={index} className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    {test.testInfo.name} ({new Date(test.testInfo.date).toLocaleDateString()})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Showing records {startRecord.toString().padStart(2, '0')}-{endRecord.toString().padStart(2, '0')} of {test.students.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadTestCSV(test.testInfo.name, test)}
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
                      
                      {test.subjects.map((subject, idx) => (
                        <th key={idx} className="py-2 px-4 border text-center">
                          {subject.name} ({subject.maxMarks})
                        </th>
                      ))}
                      
                      <th className="py-2 px-4 border text-center">Total ({test.totalMarks})</th>
                      <th className="py-2 px-4 border text-center">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-4 border text-center">{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                        <td className="py-2 px-4 border">{student.regNumber}</td>
                        <td className="py-2 px-4 border">{student.studentName}</td>
                        <td className="py-2 px-4 border">{student.campus}</td>
                        <td className="py-2 px-4 border">{student.section}</td>
                        
                        {test.subjects.map((subject, subIdx) => (
                          renderSubjectCell(subject.name, student.subjectMarks[subject.name] || 0)
                        ))}
                        
                        <td className="py-2 px-4 border text-center font-medium">
                          {student.totalMarks || 0}
                        </td>
                        <td className="py-2 px-4 border text-center">
                          {student.percentage ? 
                            parseFloat(student.percentage).toFixed(2) + '%' : 
                            '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPagination(test.testInfo.name, test.students)}
            </div>
          );
        })
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg mb-4">
            {theoryData.length === 0 ? "No theory tests available yet" : "No tests match your current filters"}
          </p>
        </div>
      )}
    </div>
  );
}