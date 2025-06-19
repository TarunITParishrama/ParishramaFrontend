import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

const DownloadReports = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentReports, setStudentReports] = useState([]);
  const [theoryReports, setTheoryReports] = useState([]);

  const token = localStorage.getItem('token');
  const BASE_URL = process.env.REACT_APP_URL;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const response = await axios.get(
        `${BASE_URL}/api/searchstudents?query=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSearchResults(response.data.data || []);
      if (response.data.data.length === 0) toast.info("No students found");
      else toast.success(`Found ${response.data.data.length} matching students`);
    } catch (err) {
      toast.error("Search failed");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchReportsForStudent = async (student) => {
    try {
      setSelectedStudent(student);
      const compRes = await axios.get(`${BASE_URL}/api/students/${student.regNumber}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const compTests = compRes.data.data.flatMap(group =>
        group.reports.map(report => ({
          ...report,
          date: group.date || report.date,
          type: 'Competitive'
        }))
      );
      setStudentReports(compTests);

      const theoryRes = await axios.get(`${BASE_URL}/api/getstudenttheory/${student.regNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const theoryTests = theoryRes.data.data.map(test => {
        const result = test.studentResults.find(r => r.regNumber === student.regNumber);
        return {
          testName: test.testName,
          date: test.date,
          percentage: result.percentage,
          totalMarks: result.totalMarks,
          fullMarks: test.subjectDetails.reduce((sum, s) => sum + s.maxMarks, 0),
          subjects: result.subjectMarks.map(s => ({
            name: s.name,
            scored: s.marks,
            max: test.subjectDetails.find(d => d.name === s.name)?.maxMarks || 0
          })),
          type: 'Theory'
        };
      });

      setTheoryReports(theoryTests);
    } catch (err) {
      toast.error("Failed to fetch reports");
      console.error(err);
    }
  };

  const generatePDF = async () => {
  if (!selectedStudent) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  doc.setFontSize(16);
  doc.text("Parishrama Student Report", margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.text(`Name: ${selectedStudent.studentName}`, margin, y);
  y += 6;
  doc.text(`Reg No: ${selectedStudent.regNumber}`, margin, y);
  y += 6;
  doc.text(`Stream: ${selectedStudent.stream}`, margin, y);
  y += 10;

  const avatarURL = selectedStudent.studentImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.studentName)}&background=random`;

  const allTests = [...studentReports, ...theoryReports];
  if (allTests.length === 0) {
    doc.text("No test data available.", margin, y);
    return doc.save(`${selectedStudent.regNumber}_Report.pdf`);
  }

  // Group by baseTestName
  const getBaseTestName = (testName) => testName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  const groupedTests = {};

  for (const test of allTests) {
    const base = getBaseTestName(test.testName);
    if (!groupedTests[base]) groupedTests[base] = [];
    groupedTests[base].push(test);
  }

  const drawBox = (title) => {
    // Draw gradient-like colored header
    doc.setFillColor(255, 215, 0); // Yellow fallback
    doc.setDrawColor(255, 87, 34); // Red-orange
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
    doc.text(title, margin + 4, y + 7);
    y += 14;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  };

  for (const groupName of Object.keys(groupedTests)) {
    if (y + 30 > pageHeight) {
      doc.addPage(); y = margin;
    }

    drawBox(groupName);

    groupedTests[groupName].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const test of groupedTests[groupName]) {
      doc.setFontSize(11);
      doc.text(`• ${test.testName} (${new Date(test.date).toLocaleDateString('en-IN')})`, margin + 5, y);
      y += 6;

      const subjectRows = (test.subjects || []).map(s => [
        s.name || s.subjectName,
        s.scored || s.obtainedMarks || 0,
        s.max || s.totalMarks || 0
      ]);

      if (subjectRows.length) {
        autoTable(doc, {
          head: [['Subject', 'Obtained', 'Max']],
          body: subjectRows,
          theme: 'grid',
          startY: y,
          styles: { fontSize: 9 },
          margin: { left: margin + 10, right: margin },
          didDrawPage: data => {
            y = data.cursor.y + 8;
          }
        });
      } else {
        doc.text(`Score: ${test.totalMarks || test.overallTotalMarks || 0} / ${test.fullMarks || '-'}`, margin + 10, y);
        y += 6;
        if (test.percentage)
          doc.text(`Percentage: ${test.percentage}%`, margin + 10, y);
        if (test.percentile)
          doc.text(`Percentile: ${test.percentile}%`, margin + 80, y);
        y += 10;
      }

      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }
    }
  }

  // Best & Least Scoring
  const testsWithPercent = allTests.filter(t => t.percentage != null);
  if (testsWithPercent.length > 0) {
    const best = testsWithPercent.reduce((a, b) => (a.percentage > b.percentage ? a : b));
    const worst = testsWithPercent.reduce((a, b) => (a.percentage < b.percentage ? a : b));

    doc.setFontSize(13);
    drawBox("Performance Summary");
    doc.text(`Best Test: ${best.testName} - ${best.percentage}%`, margin + 5, y);
    y += 6;
    doc.text(`Lowest Test: ${worst.testName} - ${worst.percentage}%`, margin + 5, y);
  }

  // Load Avatar if possible
  try {
    const imgRes = await fetch(avatarURL);
    const blob = await imgRes.blob();
    const reader = new FileReader();
    reader.onload = () => {
      doc.addImage(reader.result, 'JPEG', pageWidth - 55, 20, 35, 35);
      doc.save(`${selectedStudent.regNumber}_Report.pdf`);
    };
    reader.readAsDataURL(blob);
  } catch {
    doc.save(`${selectedStudent.regNumber}_Report.pdf`);
  }
};


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Download Student Reports</h2>

      <form onSubmit={handleSearch} className="relative mb-4">
        <input
          type="text"
          placeholder="Search by Name or Reg Number"
          className="w-full px-4 py-2 border rounded-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="absolute right-3 top-2.5 flex gap-2 items-center">
          {searchQuery && (
            <FiX className="cursor-pointer" onClick={() => { setSearchQuery(""); setSearchResults([]); }} />
          )}
          <button type="submit" disabled={isSearching}>
            {isSearching ? <div className="animate-spin h-4 w-4 border-t-2 border-blue-500 rounded-full"></div> : <FiSearch />}
          </button>
        </div>
      </form>

      {searchResults.length > 0 && (
        <div className="border rounded shadow mb-4 max-h-72 overflow-y-auto p-2">
          {searchResults.map(s => (
            <div key={s._id} className="flex items-center justify-between border-b py-2">
              <div className="flex gap-3 items-center">
                <img
                  src={s.studentImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.studentName)}&background=random`}
                  className="h-10 w-10 rounded-full"
                  alt={s.studentName}
                />
                <div>
                  <p className="font-medium">{s.studentName}</p>
                  <p className="text-sm text-gray-600">Reg: {s.regNumber}</p>
                </div>
              </div>
              <button onClick={() => fetchReportsForStudent(s)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                Review & Download
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div className="bg-gray-50 p-4 rounded shadow-md">
          <div className="flex items-center gap-4 mb-3">
            <img
              src={selectedStudent.studentImageURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.studentName)}&background=random`}
              className="h-16 w-16 rounded-full"
              alt={selectedStudent.studentName}
            />
            <div>
              <h3 className="text-lg font-semibold">{selectedStudent.studentName}</h3>
              <p className="text-sm text-gray-600">Reg No: {selectedStudent.regNumber}</p>
              <p className="text-sm text-gray-600">Stream: {selectedStudent.stream}</p>
            </div>
          </div>
          <button onClick={generatePDF} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Download PDF Report
          </button>
        </div>
      )}
    </div>
  );
};

export default DownloadReports;
