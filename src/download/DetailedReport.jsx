import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/mainlogo.png';
import { format } from 'date-fns';

const DownloadDropdown = ({ data, streamFilter, studentData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const exportToExcel = () => {
    const wsData = data.map(item => {
      const row = {
        "Reg Number": item.regNumber,
        "Student Name": item.studentName,
        "Campus": typeof item.campus === 'object' ? item.campus.name : item.campus,
        "Section": item.section,
        "Test Name": item.testName,
        "Date": new Date(item.date).toLocaleDateString(),
        "Stream": item.stream,
        "Marks Type": item.marksType
      };
      
      item.subjects.forEach((subject, idx) => {
        row[`${subject.subjectName} Attempted`] = subject.totalQuestionsAttempted;
        row[`${subject.subjectName} Unattempted`] = subject.totalQuestionsUnattempted;
        row[`${subject.subjectName} Correct`] = subject.correctAnswers;
        row[`${subject.subjectName} Wrong`] = subject.wrongAnswers;
        row[`${subject.subjectName} Marks`] = `${subject.totalMarks}/${subject.fullMarks}`;
      });
      
      row["Total Marks"] = `${item.overallTotalMarks}/${item.fullMarks}`;
      row["Accuracy (%)"] = item.accuracy;
      row["Percentage (%)"] = item.percentage;
      row["Percentile (%)"] = item.percentile;
      
      return row;
    });
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Reports");
    XLSX.writeFile(wb, `TestReports_${streamFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateDetailedPDF = (student) => {
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

    // Get student details from studentData if available
    const studentDetails = studentData[student.regNumber] || {};
    
    // Student information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Student Information", 15, 45);
    doc.setFont("helvetica", "normal");
    
    // Left side student details - use studentData where available
    doc.text(`Reg Number: ${student.regNumber}`, 15, 55);
    doc.text(`Name: ${studentDetails.studentName || student.studentName}`, 15, 65);
    doc.text(`Section: ${studentDetails.section || student.section}`, 15, 75);
    doc.text(`Campus: ${studentDetails.campus || (typeof student.campus === 'object' ? student.campus.name : student.campus)}`, 15, 85);
    
    // Add more student details if available from studentData
    if (studentDetails.fatherName) {
      doc.text(`Father's Name: ${studentDetails.fatherName}`, 15, 95);
    }
    if (studentDetails.fatherMobile) {
      doc.text(`Father's Mobile: ${studentDetails.fatherMobile}`, 15, 105);
    }

    // Right side student image placeholder
    doc.setFillColor(200, 200, 200);
    doc.rect(doc.internal.pageSize.width - 50, 45, 40, 50, 'F');
    doc.setFontSize(8);
    doc.text("Student Photo", doc.internal.pageSize.width - 30, 70, { align: 'center' });

    // Test performance header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Test Performance Report", doc.internal.pageSize.width / 2, 120, { align: 'center' });

    // Get student reports
    const studentReports = data.filter(report => report.regNumber === student.regNumber);
    
    if (studentReports.length === 0) {
      doc.setFontSize(12);
      doc.text("No test reports available for this student", doc.internal.pageSize.width / 2, 150, { align: 'center' });
      doc.save(`${student.studentName}_Detailed_Performance_Report.pdf`);
      return;
    }

    // Prepare table data
    const tableData = studentReports.map(report => {
      const row = [
        report.testName,
        format(new Date(report.date), 'dd/MM/yyyy'),
        `${report.overallTotalMarks}/${report.fullMarks}`, // Display total as obtained/full format
        `${report.percentage}%`,
        `${report.accuracy}%`,
        `${report.percentile}%`,
        report.rank
      ];
      
      // Add subject marks
      report.subjects.forEach(subject => {
        row.push(`${subject.totalMarks}/${subject.fullMarks}`);
      });
      
      return row;
    });

    // Get all subject names for headers
    const subjectHeaders = studentReports[0]?.subjects?.map(subject => subject.subjectName) || [];

    // Generate table
    autoTable(doc, {
      startY: 125,
      head: [
        [
          'Test Name',
          'Date',
          'Total Marks',
          'Percentage',
          'Accuracy',
          'Percentile',
          'Rank',
          ...subjectHeaders
        ]
      ],
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
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 'auto' },
        // Dynamic column styles for subjects
        ...Object.fromEntries(
          subjectHeaders.map((_, index) => [7 + index, { cellWidth: 'auto' }])
        )
      },
      margin: { horizontal: 10 },
      tableWidth: 'auto'
    });

    // Add performance summary
    if (studentReports.length > 0) {
      const lastY = doc.lastAutoTable.finalY || 220;
      
      // Calculate average performance
      const avgMarks = studentReports.reduce((sum, report) => sum + report.overallTotalMarks, 0) / studentReports.length;
      const avgPercentage = studentReports.reduce((sum, report) => sum + report.percentage, 0) / studentReports.length;
      const bestRank = Math.min(...studentReports.map(report => report.rank));
      const bestPerformance = studentReports.reduce((best, report) => 
        report.overallTotalMarks > best.overallTotalMarks ? report : best, studentReports[0]);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Summary", 15, lastY + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      doc.text(`Average Score: ${avgMarks.toFixed(2)} (${avgPercentage.toFixed(2)}%)`, 15, lastY + 25);
      doc.text(`Best Rank Achieved: ${bestRank}`, 15, lastY + 35);
      doc.text(`Best Performance: ${bestPerformance.testName} - ${bestPerformance.overallTotalMarks}/${bestPerformance.fullMarks} (${bestPerformance.percentage}%)`, 15, lastY + 45);
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

    doc.save(`${student.studentName}_Detailed_Performance_Report.pdf`);
  };

  const handleStudentSearch = async (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Stop event propagation
    
    if (!searchTerm.trim()) {
      alert("Please enter a registration number");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // First check if student exists in our local studentData
      if (studentData && studentData[searchTerm]) {
        const studentInfo = studentData[searchTerm];
        const studentReports = data.filter(report => report.regNumber === searchTerm);
        
        if (studentReports.length > 0) {
          // Create a merged student object with data from reports
          const firstReport = studentReports[0];
          setSelectedStudent({
            regNumber: searchTerm,
            studentName: studentInfo.studentName,
            campus: studentInfo.campus,
            section: studentInfo.section
          });
          return;
        }
      }
      
      // If not found locally or no reports, fetch from API
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_URL}/api/getstudentbyreg/${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.status === "success") {
        setSelectedStudent(result.data);
      } else {
        alert("Student not found");
        setSelectedStudent(null);
      }
    } catch (err) {
      console.error("Error fetching student:", err);
      alert("Error fetching student data");
      setSelectedStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white hover:bg-green-700 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          Download
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportToExcel();
                setIsOpen(false);
              }}
              className="block bg-green-500 w-full text-left font-semibold px-4 py-2 text-sm text-white hover:bg-green-600"
              role="menuitem"
            >
              Download as Excel
            </button>
            
            <div className="border-t border-gray-100"></div>
            
            <div className="p-4 bg-gradient-to-b from-red-500 to-white">
              <p className="text-sm font-semibold text-white mb-2">PDF Options</p>
              
              <form onSubmit={handleStudentSearch}>
                <input
                  type="text"
                  placeholder="Enter Student Reg Number"
                  className="p-2 border rounded w-full text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                
                <div className="flex mt-2 gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:bg-blue-300"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Searching...' : 'Search'}
                  </button>
                  
                  <button
                    type="button"
                    className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      setSelectedStudent(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </form>
              
              {selectedStudent && (
                <div className="mt-3 p-2 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium">Student Found:</p>
                  <p className="text-xs">{selectedStudent.studentName}</p>
                  <p className="text-xs">{selectedStudent.regNumber}</p>
                  <p className="text-xs">{selectedStudent.section || 'N/A'}</p>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateDetailedPDF(selectedStudent);
                    }}
                    className="mt-2 w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                  >
                    Download Detailed PDF
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

export default DownloadDropdown;