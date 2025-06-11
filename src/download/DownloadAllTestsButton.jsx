import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/mainlogo.png';
import watermark from '../assets/mainlogo.png'; 
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const DownloadAllTestsButton = ({ streamFilter, students }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mcqTests, setMcqTests] = useState([]);
  const [theoryTests, setTheoryTests] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchRegNumber, setSearchRegNumber] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);
  const [allTestNames, setAllTestNames] = useState([]);

  // SVG placeholder for students without images
const placeholderSvg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAB+0lEQVR4nO3dPUoDQRRF0a8MNIkYVCxDHKACIQpMhK3KDMKwAMMiQ4F4zW+fVtOX6ed+Wf2n6rTzB4vv7ywTFYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYDBYjBY3Q9S7fAU28+23Unvsr1+dy1up/hqftn1WfO5vNcKX1e5PpF4R0fFzVuH77lUMXJf+yYfpC3vjT1H1qe9exOeV3veZXbYO04z7B2VPcvkq/nh3L3t2/YZdfB/j2Nt7te+k9GnnG39Uan5A+/ch/0W+rHtdUPi+1v4tvWvh3cL4wWAwWAzWRvYDc8kkgGBgMZgAAAABJRU5ErkJggg==";


  useEffect(() => {
    const fetchAllTestData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const [mcqRes, theoryRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_URL}/api/getstudentreports?stream=${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          fetch(`${process.env.REACT_APP_URL}/api/gettheorytests/${streamFilter}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
        ]);

        const mcqData = await mcqRes.json();
        const theoryData = await theoryRes.json();

        if (mcqData.status === "success") {
          setMcqTests(mcqData.data || []);
        }

        if (theoryData.status === "success") {
          setTheoryTests(theoryData.data || []);
        }

        // Extract all unique test names
        const mcqTestNames = mcqData.status === "success" ? 
          [...new Set(mcqData.data.map(test => test.testName))] : [];
        const theoryTestNames = theoryData.status === "success" ? 
          [...new Set(theoryData.data.map(test => test.testName))] : [];
        
        setAllTestNames([...mcqTestNames, ...theoryTestNames]);

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
      campus: students[test.regNumber]?.campus?.name || 
              (typeof students[test.regNumber]?.campus === 'string' ? 
               students[test.regNumber]?.campus : 'N/A'),
      section: students[test.regNumber]?.section || 'N/A',
      studentImageURL: students[test.regNumber]?.studentImageURL || null
    }));
  };

  const processTheoryData = (theoryTests) => {
    return theoryTests.flatMap(test => {
      return test.studentResults.map(result => ({
        ...result,
        testName: test.testName,
        date: test.date,
        stream: test.stream,
        type: 'Theory',
        subjectDetails: test.subjectDetails,
        studentName: students[result.regNumber]?.studentName || 'N/A',
        campus: students[result.regNumber]?.campus?.name || 
                (typeof students[result.regNumber]?.campus === 'string' ? 
                 students[result.regNumber]?.campus : 'N/A'),
        section: students[result.regNumber]?.section || 'N/A',
        studentImageURL: students[result.regNumber]?.studentImageURL || null
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
      
      // Check if student exists in our local students data
      if (students[searchRegNumber]) {
        const studentInfo = students[searchRegNumber];
        setFoundStudent({
          regNumber: searchRegNumber,
          studentName: studentInfo.studentName,
          campus: studentInfo.campus?.name || studentInfo.campus,
          section: studentInfo.section,
          studentImageURL: studentInfo.studentImageURL || placeholderSvg
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
          campus: result.data.campus?.name || result.data.campus,
          studentImageURL: result.data.studentImageURL || placeholderSvg
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

  // Function to calculate performance summary stats
  const calculatePerformanceSummary = (studentTests, allTests) => {
    // Skip if no tests
    if (!studentTests || studentTests.length === 0) {
      return {
        averagePercentage: 'N/A',
        averageAccuracy: 'N/A',
        averagePercentile: 'N/A',
        bestTest: 'N/A',
        bestPerformance: 'N/A',
        attendanceRate: '0%',
        classRanking: {
          top10: 0,
          top25: 0,
          below50: 0
        },
        testCount: 0,
        totalPossibleTests: [...new Set(allTests.map(t => t.testName))].length
      };
    }

    // Count only MCQ tests for most metrics
    const mcqTests = studentTests.filter(test => test.type === 'MCQ');
    const totalPossibleTests = [...new Set(allTests.map(t => t.testName))].length;
    
    if (mcqTests.length === 0) {
      return {
        averagePercentage: 'N/A',
        averageAccuracy: 'N/A',
        averagePercentile: 'N/A',
        bestTest: 'N/A',
        bestPerformance: 'N/A',
        attendanceRate: `${studentTests.length}/${totalPossibleTests}`,
        classRanking: {
          top10: 0,
          top25: 0,
          below50: 0
        },
        testCount: studentTests.length,
        totalPossibleTests
      };
    }

    // Calculate attendance rate - how many tests of total possible tests did the student take
    const attendedTests = [...new Set(studentTests.map(t => t.testName))];
    const attendanceRate = (attendedTests.length / totalPossibleTests) * 100;

    // Calculate average percentage, accuracy, and percentile for MCQ tests
    const totalPercentage = mcqTests.reduce((sum, test) => sum + (test.percentage || 0), 0);
    const totalAccuracy = mcqTests.reduce((sum, test) => sum + (test.accuracy || 0), 0);
    const totalPercentile = mcqTests.reduce((sum, test) => sum + (test.percentile || 0), 0);
    
    const averagePercentage = totalPercentage / mcqTests.length;
    const averageAccuracy = totalAccuracy / mcqTests.length;
    const averagePercentile = totalPercentile / mcqTests.length;

    // Find the best performing test
    const bestTest = mcqTests.reduce((best, test) => {
      return (!best || (test.percentage > best.percentage)) ? test : best;
    }, null);

    // Count tests where student ranked in top 10%, top 25%, or below 50%
    const classRanking = mcqTests.reduce((counts, test) => {
      if (test.percentile >= 90) counts.top10++;
      else if (test.percentile >= 75) counts.top25++;
      else if (test.percentile < 50) counts.below50++;
      return counts;
    }, { top10: 0, top25: 0, below50: 0 });

    return {
      averagePercentage: averagePercentage.toFixed(2) + '%',
      averageAccuracy: averageAccuracy.toFixed(2) + '%',
      averagePercentile: averagePercentile.toFixed(2) + '%',
      bestTest: bestTest?.testName || 'N/A',
      bestPerformance: bestTest ? `${bestTest.percentage || ''}%` : 'N/A',
      attendanceRate: `${attendedTests.length}/${totalPossibleTests} (${attendanceRate.toFixed(2)}%)`,
      classRanking,
      testCount: studentTests.length,
      totalPossibleTests
    };
  };

  // Function to add watermark as faded background
  const addWatermark = (doc) => {
    // Save current graphics state
    doc.saveGraphicsState();
    
    // Set transparency for the watermark (0.1 = 10% opacity)
    doc.setGState(new doc.GState({opacity: 0.1}));
    
    // Calculate center positioning
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Add watermark image (scaled to 30% of page width)
    const watermarkWidth = pageWidth * 0.3;
    const watermarkHeight = (watermarkWidth * 150) / 150; // Maintain aspect ratio
    
    try {
  doc.addImage(
    watermark,
    'PNG',
    pageWidth / 2 - watermarkWidth / 2,
    pageHeight / 2 - watermarkHeight / 2,
    watermarkWidth,
    watermarkHeight,
    undefined,
    'FAST'
  );
} catch (error) {
  console.warn('Failed to add watermark image. Skipping watermark.');
}

    
    // Restore graphics state
    doc.restoreGraphicsState();
  };

  // Function to add student image or placeholder
  const addStudentImage = async (doc, student, x, y, width, height) => {
  try {
    let imageData = placeholderSvg;

    if (student.studentImageURL && student.studentImageURL !== placeholderSvg) {
      const loadedImage = await loadStudentImage(student.regNumber);
      if (loadedImage) {
        imageData = loadedImage;
      } else {
        console.warn(`Falling back to placeholder for ${student.regNumber}`);
      }
    }

    let format = 'JPEG';
if (imageData.includes('image/png')) format = 'PNG';
else if (imageData.includes('image/svg+xml')) format = 'SVG';
doc.addImage(imageData, format, x, y, width, height);

  } catch (error) {
    console.error('Error adding student image to PDF:', error);
    // Absolute fallback: still insert placeholder
    try {
      doc.addImage(placeholderSvg, 'SVG', x, y, width, height);
    } catch (fallbackError) {
      console.error('Error adding fallback placeholder SVG:', fallbackError);
    }
  }
};


  const generateStudentReportPDF = async () => {
    if (!foundStudent) return;

    setIsLoading(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape'
      });

      // Process test data
      const processedMcq = processMcqData(mcqTests);
      const processedTheory = processTheoryData(theoryTests);
      const allTests = [...processedMcq, ...processedTheory];
      const studentTests = allTests.filter(test => test.regNumber === foundStudent.regNumber);
      
      // Calculate performance summary
      const performanceSummary = calculatePerformanceSummary(studentTests, allTests);

      // Add watermark to each page
      addWatermark(doc);
      
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
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Student Information", 15, 45);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      doc.text(`Reg Number: ${foundStudent.regNumber}`, 15, 55);
      doc.text(`Name: ${foundStudent.studentName}`, 15, 65);
      doc.text(`Section: ${foundStudent.section}`, 15, 75);
      doc.text(`Campus: ${foundStudent.campus}`, 15, 85);
      
      // Student image with placeholder
      await addStudentImage(doc, foundStudent, doc.internal.pageSize.width - 50, 45, 40, 50);

      // Performance Summary Box - with motivational analysis
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(15, 95, 260, 60, 3, 3, 'FD');
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Performance Analysis", 20, 105);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Performance metrics
      doc.text(` Tests Taken: ${performanceSummary.testCount}/${performanceSummary.totalPossibleTests}`, 20, 115);
      doc.text(` Average Score: ${performanceSummary.averagePercentage}`, 20, 125);
      doc.text(` Average Accuracy: ${performanceSummary.averageAccuracy}`, 20, 135);
      
      // Motivational analysis based on performance
      let motivationalText = "";
      if (performanceSummary.averagePercentile !== 'N/A') {
        const avgPercentile = parseFloat(performanceSummary.averagePercentile);
        if (avgPercentile >= 75) {
          motivationalText = " Excellent Performance! You're in the top 25% of your class!";
        } else if (avgPercentile >= 50) {
          motivationalText = " Good Performance! You're above average - keep pushing!";
        } else {
          motivationalText = " Keep Working! You're improving - focus on weak areas!";
        }
      }
      
      doc.setFont("helvetica", "bolditalic");
      doc.setTextColor(234, 88, 12); // Orange color for motivational text
      doc.text(motivationalText, 20, 145, { maxWidth: 250 });
      doc.setTextColor(0, 0, 0); // Reset to black
      doc.setFont("helvetica", "normal");

      // Detailed Performance Metrics
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Performance Metrics", doc.internal.pageSize.width / 2, 165, { align: 'center' });

      // Performance details table
      autoTable(doc, {
        startY: 170,
        head: [['Metric', 'Value', 'Analysis']],
        body: [
          ['Best Test', performanceSummary.bestTest, performanceSummary.bestPerformance],
          ['Tests in Top 10%', performanceSummary.classRanking.top10, getPerformanceAnalysis(performanceSummary.classRanking.top10, 'top10')],
          ['Tests in Top 25%', performanceSummary.classRanking.top25, getPerformanceAnalysis(performanceSummary.classRanking.top25, 'top25')],
          ['Tests Below 50%', performanceSummary.classRanking.below50, getPerformanceAnalysis(performanceSummary.classRanking.below50, 'below50')],
          ['Attendance Rate', performanceSummary.attendanceRate, getAttendanceAnalysis(performanceSummary.attendanceRate)]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [234, 88, 12],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          2: { fontStyle: 'italic', fontSize: 9 }
        },
        didDrawPage: () => addWatermark(doc)
      });

      let startY = doc.lastAutoTable.finalY + 15;

      // Test performance header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Test Performance Breakdown", doc.internal.pageSize.width / 2, startY, { align: 'center' });
      startY += 10;

      if (studentTests.length === 0) {
        doc.setFontSize(12);
        doc.text("No test reports available for this student", doc.internal.pageSize.width / 2, startY, { align: 'center' });
      } else {
        // Group tests by type and then by test series (PWT, PDT, etc.)
        const groupedTests = {};
        
        studentTests.forEach(test => {
          const testType = test.type;
          if (!groupedTests[testType]) {
            groupedTests[testType] = {};
          }
          
          // Extract test series (first 3 letters before hyphen)
          const testSeries = test.testName.split('-')[0].trim();
          if (!groupedTests[testType][testSeries]) {
            groupedTests[testType][testSeries] = [];
          }
          
          groupedTests[testType][testSeries].push(test);
        });

        // Process each test type (MCQ first, then Theory)
        const orderedTestTypes = ['MCQ', 'Theory'];
        
        for (const testType of orderedTestTypes) {
          if (!groupedTests[testType]) continue;
          
          // Add test type header
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`${testType} Tests`, 15, startY);
          startY += 10;
          
          // Process each test series within this type
          for (const [testSeries, tests] of Object.entries(groupedTests[testType])) {
            // Sort tests by test name
            tests.sort((a, b) => a.testName.localeCompare(b.testName));
            
            // Add test series header
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`${testSeries} Series`, 20, startY);
            startY += 7;
            
            // Prepare table data - include all possible tests, mark absent if not taken
            const tableData = [];
            
            // Get all tests in this series
            const seriesTestNames = allTestNames
              .filter(name => name.startsWith(testSeries))
              .sort();
            
            for (const testName of seriesTestNames) {
              const studentTest = tests.find(t => t.testName === testName);
              
              if (studentTest) {
                // Student took this test
                if (testType === 'MCQ') {
                  // const rankInfo = studentTest.percentile
                  //   ? ` (Top ${100 - studentTest.percentile}%)` 
                  //   : '';
                    
                  tableData.push([
                    studentTest.testName,
                    format(new Date(studentTest.date), 'dd/MM/yyyy'),
                    `${studentTest.totalMarks}`,
                    `${studentTest.percentage}%`,
                    `${studentTest.accuracy}%`,
                    `${studentTest.percentile}%`,
                    ...(studentTest.subjects?.map(subject => `${subject.totalMarks}/${subject.fullMarks}`)) || []
                  ]);
                } else {
                  // Theory test
                  const subjectMarks = {};
                  studentTest.subjectMarks?.forEach(sm => {
                    subjectMarks[sm.name] = sm.marks;
                  });
                  
                  tableData.push([
                    studentTest.testName,
                    format(new Date(studentTest.date), 'dd/MM/yyyy'),
                    ...studentTest.subjectDetails?.map(sub => 
                      subjectMarks[sub.name] || '0'
                    ) || [],
                    studentTest.totalMarks || '0',
                    studentTest.percentage ? `${studentTest.percentage}%` : '0%'
                  ]);
                }
              } else {
                // Student didn't take this test - mark as absent
                if (testType === 'MCQ') {
                  const testRef = allTests.find(t => t.testName === testName && t.type === 'MCQ');
                  tableData.push([
                    testName,
                    'N/A',
                    'Absent',
                    'Absent',
                    'Absent',
                    'Absent',
                    'Absent',
                    ...(testRef?.subjects?.map(() => 'Absent') || [])
                  ]);
                } else {
                  const testRef = allTests.find(t => t.testName === testName && t.type === 'Theory');
                  tableData.push([
                    testName,
                    'N/A',
                    ...testRef?.subjectDetails?.map(() => 'Absent') || [],
                    'Absent',
                    'Absent'
                  ]);
                }
              }
            }
            
            // Get headers
            const headers = testType === 'MCQ' ? [
              'Test Name',
              'Date',
              'Total Marks',
              'Percentage',
              'Accuracy',
              'Percentile',
              ...(tests[0]?.subjects?.map(subject => subject.subjectName) || [])
            ] : [
              'Test Name',
              'Date',
              ...(tests[0]?.subjectDetails?.map(sub => sub.name) || []),
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
                fillColor: [234, 88, 12], // Orange color
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
              },
              columnStyles: testType === 'MCQ' ? {
                5: { fontStyle: 'bold' }, // Make percentile bold
                6: { fontStyle: 'bold' }  // Make rank bold
              } : {},
              margin: { horizontal: 10 },
              didDrawPage: () => addWatermark(doc)
            });

            startY = doc.lastAutoTable.finalY + 10;
            
            // Add page break if needed
            if (startY > doc.internal.pageSize.height - 50) {
              doc.addPage('landscape');
              startY = 20;
              addWatermark(doc);
            }
          }
        }
      }

      // Final motivational note
      if (startY < doc.internal.pageSize.height - 30) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bolditalic");
        doc.setTextColor(234, 88, 12);
        doc.text("Keep up the good work! Consistent practice leads to success!", 
          doc.internal.pageSize.width / 2, 
          doc.internal.pageSize.height - 20, 
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
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

    try {
      doc.save(`${foundStudent.studentName}_Performance_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (saveError) {
      console.error('Error saving PDF:', saveError);
      alert('Failed to download PDF. Please try again.');
    }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function for performance analysis text
  const getPerformanceAnalysis = (count, type) => {
    if (type === 'top10') {
      if (count >= 5) return "🌟 Exceptional! You're consistently in the top tier!";
      if (count >= 3) return "👍 Great job! You're frequently among the best!";
      if (count >= 1) return "Good start! Aim for more top 10% finishes!";
      return "Focus area - aim for top 10% in upcoming tests!";
    } else if (type === 'top25') {
      if (count >= 5) return "Strong performance! You're consistently above average!";
      if (count >= 3) return "Doing well! Keep pushing to reach top 10%!";
      if (count >= 1) return "Making progress! Build on these performances!";
      return "Room for improvement - target top 25% in next tests!";
    } else { // below50
      if (count === 0) return "Perfect! No tests below 50% percentile!";
      if (count <= 2) return "Minor setbacks - focus on weak areas!";
      return "Needs attention - analyze these tests for improvement!";
    }
  };

  // Helper function for attendance analysis
  const getAttendanceAnalysis = (attendanceRate) => {
    const percentageMatch = attendanceRate.match(/(\d+\.\d+)%/);
    if (!percentageMatch) return "Attendance data not available";
    
    const percentage = parseFloat(percentageMatch[1]);
    if (percentage >= 90) return "Excellent attendance! Keep it up!";
    if (percentage >= 75) return "Good attendance - aim for perfect!";
    if (percentage >= 50) return "Needs improvement - attend more tests!";
    return "Low attendance - prioritize test participation!";
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
            studentImageURL: test.studentImageURL,
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
        
        // Calculate performance summary for this student
        const performanceSummary = calculatePerformanceSummary(student.tests, allTests);

        // Add new page for each student (except first)
        if (i > 0) {
          doc.addPage('landscape');
        }

        // Add watermark
        addWatermark(doc);

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
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Student Information", 15, 45);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        
        doc.text(`Reg Number: ${student.regNumber}`, 15, 55);
        doc.text(`Name: ${student.studentName}`, 15, 65);
        doc.text(`Section: ${student.section}`, 15, 75);
        doc.text(`Campus: ${student.campus}`, 15, 85);
        
        if (studentDetails.fatherName) {
          doc.text(`Parent's Name: ${studentDetails.fatherName}`, 15, 95);
        }
        if (studentDetails.fatherMobile) {
          doc.text(`Parent's Mobile: ${studentDetails.fatherMobile}`, 15, 105);
        }

        // Student image (with placeholder if needed)
        await addStudentImage(doc, student, doc.internal.pageSize.width - 50, 45, 40, 50);

        // Performance Summary Box
        const summaryStartY = Math.max(
          studentDetails.fatherMobile ? 115 : (studentDetails.fatherName ? 105 : 95),
          105 // Minimum start Y
        );
        
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(15, summaryStartY, 260, 45, 3, 3, 'FD');
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Performance Summary", 20, summaryStartY + 10);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Left column
        doc.text(`Average Score: ${performanceSummary.averagePercentage}`, 20, summaryStartY + 20);
        doc.text(`Average Accuracy: ${performanceSummary.averageAccuracy}`, 20, summaryStartY + 30);
        doc.text(`Attendance Rate: ${performanceSummary.attendanceRate}`, 20, summaryStartY + 40);
        
        // Middle column
        doc.text(`Average Percentile: ${performanceSummary.averagePercentile}`, 120, summaryStartY + 20);
        doc.text(`Best Test: ${performanceSummary.bestTest}`, 120, summaryStartY + 30);
        doc.text(`Best Performance: ${performanceSummary.bestPerformance}`, 120, summaryStartY + 40);
        
        // Right column
        doc.text(`Tests in Top 10%: ${performanceSummary.classRanking.top10}`, 220, summaryStartY + 20);
        doc.text(`Tests in Top 25%: ${performanceSummary.classRanking.top25}`, 220, summaryStartY + 30);
        doc.text(`Tests Below 50%: ${performanceSummary.classRanking.below50}`, 220, summaryStartY + 40);

        // Test performance header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("All Test Performance Report", doc.internal.pageSize.width / 2, summaryStartY + 60, { align: 'center' });

        // Group tests by type and then by test series
        const groupedTests = {};
        
        student.tests.forEach(test => {
          const testType = test.type;
          if (!groupedTests[testType]) {
            groupedTests[testType] = {};
          }
          
          // Extract test series (first 3 letters before hyphen)
          const testSeries = test.testName.split('-')[0].trim();
          if (!groupedTests[testType][testSeries]) {
            groupedTests[testType][testSeries] = [];
          }
          
          groupedTests[testType][testSeries].push(test);
        });

        let startY = summaryStartY + 65;

        // Process each test type (MCQ first, then Theory)
        const orderedTestTypes = ['MCQ', 'Theory'];
        
        for (const testType of orderedTestTypes) {
          if (!groupedTests[testType]) continue;
          
          // Add test type header
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`${testType} Tests`, 15, startY);
          startY += 10;
          
          // Process each test series within this type
          for (const [testSeries, tests] of Object.entries(groupedTests[testType])) {
            // Sort tests by test name
            tests.sort((a, b) => a.testName.localeCompare(b.testName));
            
            // Add test series header
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`${testSeries} Series`, 20, startY);
            startY += 7;
            
            // Prepare table data - include all possible tests, mark absent if not taken
            const tableData = [];
            
            // Get all tests in this series
            const seriesTestNames = allTestNames
              .filter(name => name.startsWith(testSeries))
              .sort();
            
            for (const testName of seriesTestNames) {
              const studentTest = tests.find(t => t.testName === testName);
              
              if (studentTest) {
                // Student took this test
                if (testType === 'MCQ') {
                  tableData.push([
                    studentTest.testName,
                    format(new Date(studentTest.date), 'dd/MM/yyyy'),
                    `${studentTest.totalMarks}/${studentTest.fullMarks}`,
                    `${studentTest.percentage}%`,
                    `${studentTest.accuracy}%`,
                    `${studentTest.percentile}%`,
                    studentTest.rank,
                    ...(studentTest.subjects?.map(subject => `${subject.totalMarks}/${subject.fullMarks}`)) || []
                  ]);
                } else {
                  // Theory test
                  const subjectMarks = {};
                  studentTest.subjectMarks?.forEach(sm => {
                    subjectMarks[sm.name] = sm.marks;
                  });
                  
                  tableData.push([
                    studentTest.testName,
                    format(new Date(studentTest.date), 'dd/MM/yyyy'),
                    ...studentTest.subjectDetails?.map(sub => 
                      subjectMarks[sub.name] || '0'
                    ) || [],
                    studentTest.totalMarks || '0',
                    studentTest.percentage ? `${studentTest.percentage}%` : '0%'
                  ]);
                }
              } else {
                // Student didn't take this test - mark as absent
                if (testType === 'MCQ') {
                  const testRef = allTests.find(t => t.testName === testName && t.type === 'MCQ');
                  tableData.push([
                    testName,
                    'N/A',
                    'Absent',
                    'Absent',
                    'Absent',
                    'Absent',
                    'Absent',
                    ...(testRef?.subjects?.map(() => 'Absent') || [])
                  ]);
                } else {
                  const testRef = allTests.find(t => t.testName === testName && t.type === 'Theory');
                  tableData.push([
                    testName,
                    'N/A',
                    ...testRef?.subjectDetails?.map(() => 'Absent') || [],
                    'Absent',
                    'Absent'
                  ]);
                }
              }
            }
            
            // Get headers
            const headers = testType === 'MCQ' ? [
              'Test Name',
              'Date',
              'Total Marks',
              'Percentage',
              'Accuracy',
              'Percentile',
              ...(tests[0]?.subjects?.map(subject => subject.subjectName) || [])
            ] : [
              'Test Name',
              'Date',
              ...(tests[0]?.subjectDetails?.map(sub => sub.name) || []),
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
                fillColor: [234, 88, 12], // Orange color
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
              },
              margin: { horizontal: 10 },
              didDrawPage: addWatermark
            });

            startY = doc.lastAutoTable.finalY + 10;
            
            // Add page break if needed
            if (startY > doc.internal.pageSize.height - 50) {
              doc.addPage('landscape');
              startY = 20;
              addWatermark();
            }
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

  const exportAllToExcel = () => {
    const processedMcq = processMcqData(mcqTests);
    const processedTheory = processTheoryData(theoryTests);
    const allTests = [...processedMcq, ...processedTheory];

    // Create a workbook with separate sheets for MCQ and Theory tests
    const wb = XLSX.utils.book_new();

    // Process MCQ tests
    const mcqWsData = processedMcq.map(test => {
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

      test.subjects?.forEach(subject => {
        row[`${subject.subjectName} Attempted`] = subject.totalQuestionsAttempted;
        row[`${subject.subjectName} Unattempted`] = subject.totalQuestionsUnattempted;
        row[`${subject.subjectName} Correct`] = subject.correctAnswers;
        row[`${subject.subjectName} Wrong`] = subject.wrongAnswers;
        row[`${subject.subjectName} Marks`] = `${subject.totalMarks}/${subject.fullMarks}`;
      });
      
      row["Total Marks"] = `${test.totalMarks}/${test.fullMarks}`;
      row["Accuracy (%)"] = test.accuracy;
      row["Percentage (%)"] = test.percentage;
      row["Percentile (%)"] = test.percentile;      
      return row;
    });

    const mcqWs = XLSX.utils.json_to_sheet(mcqWsData);
    XLSX.utils.book_append_sheet(wb, mcqWs, "MCQ Tests");

    // Process Theory tests
    const theoryWsData = processedTheory.map(test => {
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

      // Create subject marks map
      const subjectMarks = {};
      test.subjectMarks?.forEach(sm => {
        subjectMarks[sm.name] = sm.marks;
      });

      test.subjectDetails?.forEach(subject => {
        row[subject.name] = subjectMarks[subject.name] || 0;
      });
      
      row["Total Marks"] = test.totalMarks || 0;
      row["Percentage"] = test.percentage ? `${test.percentage}%` : '0%';
      
      return row;
    });

    const theoryWs = XLSX.utils.json_to_sheet(theoryWsData);
    XLSX.utils.book_append_sheet(wb, theoryWs, "Theory Tests");

    // Create a summary sheet
    const summaryData = [];
    const allStudents = [...new Set(allTests.map(test => test.regNumber))];
    
    // Get all unique test names sorted by type and name
    const sortedTestNames = [...allTestNames].sort((a, b) => {
      const aType = a.includes('PTT') ? 'Theory' : 'MCQ';
      const bType = b.includes('PTT') ? 'Theory' : 'MCQ';
      
      if (aType !== bType) return aType === 'MCQ' ? -1 : 1;
      return a.localeCompare(b);
    });

    for (const regNumber of allStudents) {
      const student = students[regNumber] || {};
      const studentRow = {
        "Reg Number": regNumber,
        "Student Name": student.studentName || 'N/A',
        "Campus": student.campus?.name || student.campus || 'N/A',
        "Section": student.section || 'N/A'
      };

      // Add test columns
      for (const testName of sortedTestNames) {
        const test = allTests.find(t => t.regNumber === regNumber && t.testName === testName);
        
        if (test) {
          if (test.type === 'MCQ') {
            studentRow[testName] = `${test.totalMarks}/${test.fullMarks} (${test.percentage}%)`;
          } else {
            studentRow[testName] = `${test.totalMarks} (${test.percentage}%)`;
          }
        } else {
          studentRow[testName] = 'Absent';
        }
      }

      summaryData.push(studentRow);
    }

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Save the workbook
    XLSX.writeFile(wb, `All_Tests_${streamFilter}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const loadStudentImage = async (regNumber) => {
  try {
    const imageUrl = students[regNumber]?.studentImageURL;
    if (!imageUrl) return null;

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Image fetch failed');

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('loadStudentImage failed:', error);
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
                      <p className="text-xs text-gray-600">{foundStudent.campus}</p>
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