import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

const DownloadReports = () => {
  // Common states
  const token = localStorage.getItem('token');
  const BASE_URL = process.env.REACT_APP_URL;

  // Individual mode states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentReports, setStudentReports] = useState([]);
  const [theoryReports, setTheoryReports] = useState([]);

  // Bulk mode states
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [detailedReports, setDetailedReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('individual');

  // Fetch campuses for bulk mode
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/getcampuses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCampuses(response.data.data || []);
      } catch (err) {
        toast.error("Failed to load campuses");
        console.error(err);
      }
    };

    fetchCampuses();
  }, []);

  // Individual mode functions
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
      const studentDetailRes = await axios.get(`${BASE_URL}/api/getstudentbyreg/${student.regNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const studentData = studentDetailRes.data.data;
      setSelectedStudent(studentData);

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

  // Bulk mode functions
  const fetchReportsForCampus = async () => {
    if (!selectedCampus) return;

    try {
      setIsLoadingReports(true);
      toast.info("Loading reports for selected campus...");
      const res = await axios.get(
        `${BASE_URL}/api/loaddetailedreports?campus=${encodeURIComponent(
          selectedCampus
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDetailedReports(res.data.data);
      toast.success(
        `Found ${res.data.totalReports} reports for ${res.data.totalStudents} students`
      );
    } catch (err) {
      toast.error("Failed to load reports for campus");
      console.error(err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  // PDF generation functions
  const generateIndividualPDF = () => {
    if (!selectedStudent) return toast.warn("No student selected");
    
    const allReports = [...studentReports, ...theoryReports];
    if (allReports.length === 0) return toast.warn("No reports to generate PDF");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Student info
    doc.setFontSize(14);
    doc.text(`Name: ${selectedStudent.studentName || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Reg No: ${selectedStudent.regNumber}`, margin, y);
    y += 6;
    doc.text(`Campus: ${selectedStudent.campus?.name || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Section: ${selectedStudent.section || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Stream: ${selectedStudent.allotmentType || "N/A"}`, margin, y);
    y += 10;

    // Reports
    allReports.forEach((test) => {
      doc.setFontSize(12);
      doc.text(
        `Test: ${test.testName} (${new Date(test.date).toLocaleDateString(
          "en-IN"
        )}) - ${test.type}`,
        margin,
        y
      );
      y += 6;

      if (test.subjects?.length) {
        const subjectRows = (test.subjects || []).map((s) => [
          s.name || s.subjectName || "Subject",
          String(s.scored ?? s.marks ?? s.obtainedMarks ?? "0"),
          String(s.max ?? s.totalMarks ?? s.fullMarks ?? "0"),
        ]);
        autoTable(doc, {
          head: [["Subject", "Obtained", "Max"]],
          body: subjectRows,
          theme: "grid",
          startY: y,
          styles: { fontSize: 9 },
          margin: { left: margin + 10, right: margin },
          didDrawPage: (data) => {
            y = data.cursor.y + 8;
          },
        });
      } else {
        doc.text(
          `Score: ${test.totalMarks || 0} / ${test.fullMarks || "-"}`,
          margin + 10,
          y
        );
        y += 6;
        if (test.percentage)
          doc.text(`Percentage: ${test.percentage}%`, margin + 10, y);
        if (test.rank) doc.text(`Rank: ${test.rank}`, margin + 80, y);
        y += 10;
      }

      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    });

    doc.save(`${selectedStudent.regNumber}_Detailed_Report.pdf`);
  };

  const generateBulkPDF = () => {
    if (!detailedReports.length)
      return toast.warn("No reports to generate PDF");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    const groupedByStudent = {};
    detailedReports.forEach((report) => {
      if (!groupedByStudent[report.regNumber])
        groupedByStudent[report.regNumber] = [];
      groupedByStudent[report.regNumber].push(report);
    });

    for (const [reg, reports] of Object.entries(groupedByStudent)) {
      const student = reports[0];
      doc.setFontSize(14);
      doc.text(`Name: ${student.studentName || "N/A"}`, margin, y);
      y += 6;
      doc.text(`Reg No: ${reg}`, margin, y);
      y += 6;
      doc.text(`Campus: ${student.campus || "N/A"}`, margin, y);
      y += 6;
      doc.text(`Section: ${student.section || "N/A"}`, margin, y);
      y += 6;
      doc.text(`Stream: ${student.stream || "N/A"}`, margin, y);
      y += 10;

      reports.forEach((test) => {
        doc.setFontSize(12);
        doc.text(
          `Test: ${test.testName} (${new Date(test.date).toLocaleDateString(
            "en-IN"
          )})`,
          margin,
          y
        );
        y += 6;

        if (test.subjects?.length) {
          const subjectRows = (test.subjects || []).map((s) => [
            s.name || s.subjectName || "Subject",
            String(s.scored ?? s.marks ?? s.obtainedMarks ?? "0"),
            String(s.max ?? s.totalMarks ?? s.fullMarks ?? "0"),
          ]);
          autoTable(doc, {
            head: [["Subject", "Obtained", "Max"]],
            body: subjectRows,
            theme: "grid",
            startY: y,
            styles: { fontSize: 9 },
            margin: { left: margin + 10, right: margin },
            didDrawPage: (data) => {
              y = data.cursor.y + 8;
            },
          });
        } else {
          doc.text(
            `Score: ${test.totalMarks || 0} / ${test.fullMarks || "-"}`,
            margin + 10,
            y
          );
          y += 6;
          if (test.percentage)
            doc.text(`Percentage: ${test.percentage}%`, margin + 10, y);
          if (test.rank) doc.text(`Rank: ${test.rank}`, margin + 80, y);
          y += 10;
        }

        if (y > 270) {
          doc.addPage();
          y = margin;
        }
      });

      doc.addPage();
      y = margin;
    }

    doc.save(`${selectedCampus.replace(/\s/g, "_")}_Detailed_Report.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Download Student Reports</h2>

      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'individual' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('individual')}
        >
          Individual Report
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'bulk' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('bulk')}
        >
          Bulk Download
        </button>
      </div>

      {activeTab === 'individual' && (
        <div className="border p-4 rounded shadow-md">
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
                  <p className="text-sm text-gray-600">Campus: {selectedStudent.campus?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Section: {selectedStudent.section || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Stream: {selectedStudent.allotmentType || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={generateIndividualPDF}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Download PDF Report
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="border p-4 rounded shadow-md">
          <div className="flex gap-4 mb-4">
            <select
              className="border px-3 py-2 rounded"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
            >
              <option value="">Select Campus</option>
              {campuses.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={fetchReportsForCampus}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Load Reports
            </button>
            <button
              onClick={generateBulkPDF}
              className="bg-green-600 text-white px-4 py-2 rounded"
              disabled={!detailedReports.length}
            >
              Download PDF
            </button>
          </div>

          {isLoadingReports && (
            <div className="text-blue-700 font-semibold">
              Downloading... (Please wait ~90-120s for larger campuses)
            </div>
          )}

          {detailedReports.length > 0 && (
            <div className="text-green-700 font-semibold">
              Loaded reports for {detailedReports.length} students
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DownloadReports;