import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/mainlogo.png';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const DownloadAllTestsButton = ({ streamFilter, students }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mcqTests, setMcqTests] = useState([]);
  const [theoryTests, setTheoryTests] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchRegNumber, setSearchRegNumber] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);

  useEffect(() => {
    const fetchAllTestData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const [mcqRes, theoryRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_URL}/api/getstudentreports?stream=${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          fetch(`${process.env.REACT_APP_URL}/api/gettheory?stream=${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
        ]);

        const mcqData = await mcqRes.json();
        const theoryData = await theoryRes.json();

        if (mcqData.status === "success") {
          setMcqTests(mcqData.data || []);
        }

        if (theoryData.status === "success") {
          setTheoryTests(theoryData.data?.tests || []);
        }

      } catch (err) {
        console.error("Error fetching test data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllTestData();
  }, [streamFilter]);

  const processMcqData = (mcqTests) => {
    return mcqTests.map(test => ({
      ...test,
      type: 'MCQ',
      studentName: students[test.regNumber]?.studentName || 'N/A',
      campus: students[test.regNumber]?.campus || 'N/A',
      section: students[test.regNumber]?.section || 'N/A'
    }));
  };

  const processTheoryData = (theoryTests) => {
    return theoryTests.flatMap(test => {
      return test.studentResults.map(result => ({
        ...result,
        testName: test.testName || 'Unnamed Test',
        date: test.date || new Date(),
        stream: test.stream || streamFilter,
        type: 'Theory',
        studentName: students[result.regNumber]?.studentName || 'N/A',
        campus: students[result.regNumber]?.campus || 'N/A',
        section: students[result.regNumber]?.section || 'N/A'
      }));
    });
  };

  const searchStudent = async () => {
    if (!searchRegNumber.trim()) {
      alert("Please enter a registration number");
      return;
    }

    try {
      setIsLoading(true);
      
      // First check if student exists in our local students data
      if (students[searchRegNumber]) {
        const studentInfo = students[searchRegNumber];
        setFoundStudent({
          regNumber: searchRegNumber,
          studentName: studentInfo.studentName,
          campus: studentInfo.campus,
          section: studentInfo.section,
          studentImageURL: studentInfo.studentImageURL
        });
        return;
      }
      
      // If not found locally, fetch from API
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_URL}/api/getstudentbyreg/${searchRegNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.status === "success") {
        setFoundStudent({
          ...result.data,
          studentImageURL: result.data.studentImageURL || null
        });
      } else {
        alert("Student not found");
        setFoundStudent(null);
      }
    } catch (err) {
      console.error("Error fetching student:", err);
      alert("Error fetching student data");
      setFoundStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchRegNumber('');
    setFoundStudent(null);
  };

  const generateStudentReportPDF = async () => {
    if (!foundStudent) return;

    setIsLoading(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape'
      });

      // Header with logo
      doc.addImage(logo, "PNG", 10, 10, 30, 20);
      
      // Academy info
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Parishrama NEET Academy", 50, 15);
      doc.setFont("helvetica", "normal");
      doc.text("Omkar Hills, Dr. Vishnuvardan Road, Uttarahalli Main Road, Bengaluru - 560060", 50, 22);
      doc.text("Phone: 080-45912222, Email: officeparishrama@gmail.com", 50, 29);
      
      // Divider line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, 35, doc.internal.pageSize.width - 10, 35);

      // Student information
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Student Information", 15, 45);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Reg Number: ${foundStudent.regNumber}`, 15, 55);
      doc.text(`Name: ${foundStudent.studentName}`, 15, 65);
      doc.text(`Section: ${foundStudent.section}`, 15, 75);
      doc.text(`Campus: ${typeof foundStudent.campus === 'object' ? foundStudent.campus.name : foundStudent.campus}`, 15, 85);
      
      // Student image
      if (foundStudent.studentImageURL) {
        try {
          const imageData = await loadStudentImage(foundStudent.regNumber);
          if (imageData) {
            doc.addImage(imageData, 'JPEG', doc.internal.pageSize.width - 50, 45, 40, 50);
          }
        } catch (error) {
          console.error('Error adding student image:', error);
        }
      }

      // Test performance header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Test Performance Report", doc.internal.pageSize.width / 2, 120, { align: 'center' });

      // Get all tests for this student
      const processedMcq = processMcqData(mcqTests);
      const processedTheory = processTheoryData(theoryTests);
      const allTests = [...processedMcq, ...processedTheory];
      const studentTests = allTests.filter(test => test.regNumber === foundStudent.regNumber);

      if (studentTests.length === 0) {
        doc.setFontSize(12);
        doc.text("No test reports available for this student", doc.internal.pageSize.width / 2, 140, { align: 'center' });
      } else {
        // Group tests by type
        const groupedTests = {};
        studentTests.forEach(test => {
          const testType = test.type;
          if (!groupedTests[testType]) {
            groupedTests[testType] = [];
          }
          groupedTests[testType].push(test);
        });

        let startY = 125;

        // Process each test type
        for (const [testType, tests] of Object.entries(groupedTests)) {
          // Add test type header
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`${testType} Tests`, 15, startY);
          startY += 10;

          // Prepare table data
          const tableData = tests.map(test => {
            if (testType === 'MCQ') {
              return [
                test.testName,
                format(new Date(test.date), 'dd/MM/yyyy'),
                `${test.overallTotalMarks}/${test.fullMarks}`,
                `${test.percentage}%`,
                `${test.accuracy}%`,
                `${test.percentile}%`,
                test.rank,
                ...(test.subjects?.map(subject => `${subject.totalMarks}/${subject.fullMarks}`)) || []
              ];
            } else {
              // Theory test
              return [
                test.testName,
                format(new Date(test.date), 'dd/MM/yyyy'),
                ...Object.entries(test.subjectMarks || {})
                  .filter(([key]) => !['totalMarks', 'percentage'].includes(key))
                  .map(([_, marks]) => marks),
                test.totalMarks || 0,
                test.percentage ? `${test.percentage}%` : '0%'
              ];
            }
          });

          // Get headers
          const headers = testType === 'MCQ' ? [
            'Test Name',
            'Date',
            'Total Marks',
            'Percentage',
            'Accuracy',
            'Percentile',
            'Rank',
            ...(tests[0]?.subjects?.map(subject => subject.subjectName) || [])
          ] : [
            'Test Name',
            'Date',
            ...Object.keys(tests[0]?.subjectMarks || {})
              .filter(key => !['totalMarks', 'percentage'].includes(key))
              .map(sub => sub.charAt(0).toUpperCase() + sub.slice(1)),
            'Total Marks',
            'Percentage'
          ];

          // Generate table
          autoTable(doc, {
            startY,
            head: [headers],
            body: tableData,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2,
              overflow: 'linebreak',
              halign: 'center'
            },
            headStyles: {
              fillColor: [234, 88, 12],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center'
            },
            margin: { horizontal: 10 }
          });

          startY = doc.lastAutoTable.finalY + 10;
          
          // Add page break if needed
          if (startY > doc.internal.pageSize.height - 50) {
            doc.addPage('landscape');
            startY = 20;
          }
        }
      }

      // Footer
      const footerY = doc.internal.pageSize.height - 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, footerY);
      doc.text("Parishrama NEET Academy - Confidential", 
        doc.internal.pageSize.width - 14, 
        footerY, 
        { align: 'right' }
      );

      doc.save(`${foundStudent.studentName}_Performance_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAllTestsPDF = async () => {
    setIsLoading(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape'
      });

      const processedMcq = processMcqData(mcqTests);
      const processedTheory = processTheoryData(theoryTests);
      const allTests = [...processedMcq, ...processedTheory];

      // Group by student
      const studentsMap = {};
      allTests.forEach(test => {
        if (!studentsMap[test.regNumber]) {
          studentsMap[test.regNumber] = {
            regNumber: test.regNumber,
            studentName: test.studentName,
            campus: test.campus,
            section: test.section,
            tests: []
          };
        }
        studentsMap[test.regNumber].tests.push(test);
      });

      const studentList = Object.values(studentsMap);
      
      // Process each student
      for (let i = 0; i < studentList.length; i++) {
        const student = studentList[i];
        const studentDetails = students[student.regNumber] || {};

        // Add new page for each student (except first)
        if (i > 0) {
          doc.addPage('landscape');
        }

        // Header with logo
        doc.addImage(logo, "PNG", 10, 10, 30, 20);
        
        // Academy info
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Parishrama NEET Academy", 50, 15);
        doc.setFont("helvetica", "normal");
        doc.text("Omkar Hills, Dr. Vishnuvardan Road, Uttarahalli Main Road, Bengaluru - 560060", 50, 22);
        doc.text("Phone: 080-45912222, Email: officeparishrama@gmail.com", 50, 29);
        
        // Divider line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(10, 35, doc.internal.pageSize.width - 10, 35);

        // Student information
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Student Information", 15, 45);
        doc.setFont("helvetica", "normal");
        
        doc.text(`Reg Number: ${student.regNumber}`, 15, 55);
        doc.text(`Name: ${student.studentName}`, 15, 65);
        doc.text(`Section: ${student.section}`, 15, 75);
        doc.text(`Campus: ${typeof student.campus === 'object' ? student.campus.name : student.campus}`, 15, 85);
        
        if (studentDetails.fatherName) {
          doc.text(`Parent's Name: ${studentDetails.fatherName}`, 15, 95);
        }
        if (studentDetails.fatherMobile) {
          doc.text(`Parent's Mobile: ${studentDetails.fatherMobile}`, 15, 105);
        }

        // Student image
        if (studentDetails.studentImageURL) {
          try {
            const imageData = await loadStudentImage(student.regNumber);
            if (imageData) {
              doc.addImage(imageData, 'JPEG', doc.internal.pageSize.width - 50, 45, 40, 50);
            }
          } catch (error) {
            console.error('Error adding student image:', error);
          }
        }

        // Test performance header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("All Test Performance Report", doc.internal.pageSize.width / 2, 120, { align: 'center' });

        // Group tests by type
        const groupedTests = {};
        student.tests.forEach(test => {
          const testType = test.type;
          if (!groupedTests[testType]) {
            groupedTests[testType] = [];
          }
          groupedTests[testType].push(test);
        });

        let startY = 125;

        // Process each test type
        for (const [testType, tests] of Object.entries(groupedTests)) {
          // Add test type header
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`${testType} Tests`, 15, startY);
          startY += 10;

          // Prepare table data
          const tableData = tests.map(test => {
            if (testType === 'MCQ') {
              return [
                test.testName,
                format(new Date(test.date), 'dd/MM/yyyy'),
                `${test.overallTotalMarks}/${test.fullMarks}`,
                `${test.percentage}%`,
                `${test.accuracy}%`,
                `${test.percentile}%`,
                test.rank,
                ...(test.subjects?.map(subject => `${subject.totalMarks}/${subject.fullMarks}`)) || []
              ];
            } else {
              // Theory test
              return [
                test.testName,
                format(new Date(test.date), 'dd/MM/yyyy'),
                ...Object.entries(test.subjectMarks || {})
                  .filter(([key]) => !['totalMarks', 'percentage'].includes(key))
                  .map(([_, marks]) => marks),
                test.totalMarks || 0,
                test.percentage ? `${test.percentage}%` : '0%'
              ];
            }
          });

          // Get headers
          const headers = testType === 'MCQ' ? [
            'Test Name',
            'Date',
            'Total Marks',
            'Percentage',
            'Accuracy',
            'Percentile',
            'Rank',
            ...(tests[0]?.subjects?.map(subject => subject.subjectName) || [])
          ] : [
            'Test Name',
            'Date',
            ...Object.keys(tests[0]?.subjectMarks || {})
              .filter(key => !['totalMarks', 'percentage'].includes(key))
              .map(sub => sub.charAt(0).toUpperCase() + sub.slice(1)),
            'Total Marks',
            'Percentage'
          ];

          // Generate table
          autoTable(doc, {
            startY,
            head: [headers],
            body: tableData,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2,
              overflow: 'linebreak',
              halign: 'center'
            },
            headStyles: {
              fillColor: [234, 88, 12],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center'
            },
            margin: { horizontal: 10 }
          });

          startY = doc.lastAutoTable.finalY + 10;
          
          // Add page break if needed
          if (startY > doc.internal.pageSize.height - 50) {
            doc.addPage('landscape');
            startY = 20;
          }
        }

        // Footer
        const footerY = doc.internal.pageSize.height - 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 14, footerY);
        doc.text("Parishrama NEET Academy - Confidential", 
          doc.internal.pageSize.width - 14, 
          footerY, 
          { align: 'right' }
        );
      }

      doc.save(`All_Students_All_Tests_Reports_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report');
    } finally {
      setIsLoading(false);
    }
  };

  const exportAllToExcel = () => {
    const processedMcq = processMcqData(mcqTests);
    const processedTheory = processTheoryData(theoryTests);
    const allTests = [...processedMcq, ...processedTheory];

    const wsData = allTests.map(test => {
      const row = {
        "Reg Number": test.regNumber,
        "Student Name": test.studentName,
        "Campus": test.campus,
        "Section": test.section,
        "Test Name": test.testName,
        "Date": test.date ? format(new Date(test.date), 'dd/MM/yyyy') : 'N/A',
        "Type": test.type,
        "Stream": test.stream || streamFilter
      };

      if (test.type === 'MCQ') {
        test.subjects?.forEach(subject => {
          row[`${subject.subjectName} Attempted`] = subject.totalQuestionsAttempted;
          row[`${subject.subjectName} Unattempted`] = subject.totalQuestionsUnattempted;
          row[`${subject.subjectName} Correct`] = subject.correctAnswers;
          row[`${subject.subjectName} Wrong`] = subject.wrongAnswers;
          row[`${subject.subjectName} Marks`] = `${subject.totalMarks}/${subject.fullMarks}`;
        });
        
        row["Total Marks"] = `${test.overallTotalMarks}/${test.fullMarks}`;
        row["Accuracy (%)"] = test.accuracy;
        row["Percentage (%)"] = test.percentage;
        row["Percentile (%)"] = test.percentile;
        row["Rank"] = test.rank;
      } else {
        // Theory test
        Object.entries(test.subjectMarks || {}).forEach(([subject, marks]) => {
          if (subject !== 'totalMarks' && subject !== 'percentage') {
            row[subject.charAt(0).toUpperCase() + subject.slice(1)] = marks;
          }
        });
        
        row["Total Marks"] = test.totalMarks || 0;
        row["Percentage"] = test.percentage ? `${test.percentage}%` : '0%';
      }
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "All Test Reports");
    XLSX.writeFile(wb, `All_Tests_${streamFilter}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const loadStudentImage = async (regNumber) => {
    try {
      if (!students[regNumber]?.studentImageURL) {
        return null;
      }

      const response = await fetch(students[regNumber].studentImageURL);
      if (!response.ok) {
        throw new Error('Image not found');
      }
      
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading student image:', error);
      return null;
    }
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center items-center bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-4 rounded-lg shadow hover:shadow-lg"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isLoading}
        >
          Download
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isDropdownOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-auto rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={() => {
                exportAllToExcel();
                setIsDropdownOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-white bg-green-500 hover:bg-green-400 hover:text-gray-700"
              role="menuitem"
            >
              Download All Tests Excel
            </button>
            <button
              onClick={() => {
                generateAllTestsPDF();
                setIsDropdownOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-400 hover:text-gray-700"
              role="menuitem"
            >
              Download All Tests PDF
            </button>
            
            <div className="border-t border-gray-200"></div>
            
            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Download Student Report</p>
              <div className="flex mb-2">
                <input
                  type="text"
                  placeholder="Enter Reg Number"
                  className="flex-1 p-2 border rounded text-sm"
                  value={searchRegNumber}
                  onChange={(e) => setSearchRegNumber(e.target.value)}
                />
                <button
                  onClick={searchStudent}
                  className="ml-2 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                  disabled={isLoading}
                >
                  Search
                </button>
              </div>
              
              {foundStudent && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-start">
                    {foundStudent.studentImageURL && (
                      <img 
                        src={foundStudent.studentImageURL} 
                        alt={foundStudent.studentName}
                        className="w-12 h-12 rounded-full object-cover mr-3"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{foundStudent.studentName}</p>
                      <p className="text-xs text-gray-600">{foundStudent.regNumber}</p>
                      <p className="text-xs text-gray-600">{foundStudent.section}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      generateStudentReportPDF();
                      setIsDropdownOpen(false);
                    }}
                    className="mt-2 w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                    disabled={isLoading}
                  >
                    Download Report
                  </button>
                  <button
                    onClick={clearSearch}
                    className="mt-1 w-full bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadAllTestsButton;