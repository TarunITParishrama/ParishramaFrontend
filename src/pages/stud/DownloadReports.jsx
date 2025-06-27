import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import { FiSearch, FiX } from "react-icons/fi";
import { toast } from "react-toastify";

const DownloadReports = () => {
  // Common states
  const token = localStorage.getItem("token");
  const BASE_URL = process.env.REACT_APP_URL;

  // Individual mode states
  const [searchQuery, setSearchQuery] = useState("");
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
  const [activeTab, setActiveTab] = useState("individual");

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
        `${BASE_URL}/api/searchstudents?query=${encodeURIComponent(
          searchQuery
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSearchResults(response.data.data || []);
      if (response.data.data.length === 0) toast.info("No students found");
      else
        toast.success(`Found ${response.data.data.length} matching students`);
    } catch (err) {
      toast.error("Search failed");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchReportsForStudent = async (student) => {
    try {
      const studentDetailRes = await axios.get(
        `${BASE_URL}/api/getstudentbyreg/${student.regNumber}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const studentData = studentDetailRes.data.data;
      setSelectedStudent(studentData);

      const compRes = await axios.get(
        `${BASE_URL}/api/students/${student.regNumber}/reports`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const compTests = compRes.data.data.flatMap((group) =>
        group.reports.map((report) => ({
          ...report,
          date: group.date || report.date,
          type: "Competitive",
        }))
      );
      setStudentReports(compTests);

      const theoryRes = await axios.get(
        `${BASE_URL}/api/getstudenttheory/${student.regNumber}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const theoryTests = theoryRes.data.data.map((test) => {
        const result = test.studentResults.find(
          (r) => r.regNumber === student.regNumber
        );
        return {
          testName: test.testName,
          date: test.date,
          percentage: result.percentage,
          totalMarks: result.totalMarks,
          fullMarks: test.subjectDetails.reduce(
            (sum, s) => sum + s.maxMarks,
            0
          ),
          subjects: result.subjectMarks.map((s) => ({
            name: s.name,
            scored: s.marks,
            max:
              test.subjectDetails.find((d) => d.name === s.name)?.maxMarks || 0,
          })),
          type: "Theory",
        };
      });

      setTheoryReports(theoryTests);
    } catch (err) {
      toast.error("Failed to fetch reports");
      console.error(err);
    }
  };

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

  //Individual PDF
  const generateIndividualPDF = async () => {
    if (!selectedStudent) return toast.warn("No student selected");

    const allReports = [...studentReports, ...theoryReports];
    if (allReports.length === 0)
      return toast.warn("No reports to generate PDF");

    const doc = new jsPDF();
    const margin = 15;
    let y = margin;

    const headerLogo = await loadImageAsBase64("/assets/mainlogo.png");

    const avatarURL =
      selectedStudent.studentImageURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        selectedStudent.studentName
      )}&background=random&color=fff&size=128`;
    const avatar = await fetchImageAsBase64(avatarURL);

    if (headerLogo) {
      doc.addImage(headerLogo, "PNG", margin, y, 16, 16);
    }
    doc.setFontSize(15);
    doc.setTextColor(30, 30, 30);
    doc.text("Parishrama Institutions", margin + 20, y + 12);

    // 🔻 Line separator
    doc.setDrawColor(200);
    doc.line(margin, y + 20, doc.internal.pageSize.width - margin, y + 20);
    y += 28;

    // 🧍 Student Info
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Student Report", margin, y);
    y += 10;

    if (avatar) {
      doc.addImage(
        avatar,
        "JPEG",
        doc.internal.pageSize.width - 45,
        y - 10,
        25,
        25
      );
    }

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Name: ${selectedStudent.studentName}`, margin, y);
    y += 6;
    doc.text(`Reg No: ${selectedStudent.regNumber}`, margin, y);
    y += 6;
    doc.text(`Campus: ${selectedStudent.campus?.name || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Section: ${selectedStudent.section || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Parent: ${selectedStudent.fatherName || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Mobile: ${selectedStudent.fatherMobile || "N/A"}`, margin, y);
    y += 10;

    // 📂 Group Tests
    const grouped = {
      "Daily Tests": [],
      "Weekly Tests": [],
      Others: [],
    };

    allReports.forEach((test) => {
      if (/DT/i.test(test.testName)) grouped["Daily Tests"].push(test);
      else if (/WT/i.test(test.testName)) grouped["Weekly Tests"].push(test);
      else grouped["Others"].push(test);
    });

    Object.keys(grouped).forEach((category) => {
      const tests = grouped[category].sort((a, b) =>
        a.testName.localeCompare(b.testName)
      );

      doc.setFontSize(13);
      doc.setTextColor(20, 20, 100);
      doc.text(category, margin, y);
      y += 8;

      tests.forEach((test) => {
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(
          `Test: ${test.testName} (${new Date(test.date).toLocaleDateString(
            "en-IN"
          )}) - ${test.type || ""}`,
          margin,
          y
        );
        y += 6;

        if (test.subjects?.length) {
          const subjectRows = test.subjects.map((s) => [
            s.name || s.subjectName || "Subject",
            String(s.max ?? s.totalMarks ?? s.fullMarks ?? "0"),
            String(s.scored ?? s.marks ?? s.obtainedMarks ?? "0"),
            "",
          ]);

          const calculatedFullMarks =
            test.subjects.reduce(
              (sum, s) => sum + (s.max ?? s.totalMarks ?? s.fullMarks ?? 0),
              0
            ) || "-";

          const rankRow = [
            "",
            "",
            "",
            `Rank: ${test.rank ?? "-"}, Total: ${
              test.totalMarks || 0
            }/${calculatedFullMarks}`,
          ];
          subjectRows.push(rankRow);

          autoTable(doc, {
            head: [["Subject", "Max Marks", "Obtained", ""]],
            body: subjectRows,
            theme: "grid",
            startY: y,
            styles: {
              fontSize: 9,
              halign: "center",
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: "bold",
            },
            columnStyles: {
              1: { halign: "right" },
              2: { halign: "right" },
              3: { halign: "left" },
            },
            margin: { left: margin + 2, right: margin },
            didDrawPage: (data) => {
              y = data.cursor.y + 10;
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

      y += 10;
      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    });

    doc.save(`${selectedStudent.regNumber}_Detailed_Report.pdf`);
  };

  //Bulk PDF
  const generateBulkPDF = async () => {
    if (!detailedReports.length)
      return toast.warn("No reports to generate PDF");

    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin;

    const headerLogo = await loadImageAsBase64("/assets/mainlogo.png");

    // 🔁 Group reports by regNumber
    const groupedByStudent = {};
    detailedReports.forEach((report) => {
      if (!groupedByStudent[report.regNumber])
        groupedByStudent[report.regNumber] = [];
      groupedByStudent[report.regNumber].push(report);
    });

    for (const [reg, reports] of Object.entries(groupedByStudent)) {
      const student = reports[0];

      // 🏫 Header
      if (headerLogo) {
        doc.addImage(headerLogo, "PNG", margin, y, 16, 16);
      }
      doc.setFontSize(15);
      doc.setTextColor(30, 30, 30);
      doc.text("Parishrama Institutions", margin + 20, y + 12);

      // 🔻 Line separator
      doc.setDrawColor(200);
      doc.line(margin, y + 20, pageWidth - margin, y + 20);
      y += 28;

      // 👤 Student Info
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
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

      // 📚 Tests for each student
      reports.forEach((test) => {
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text(
          `Test: ${test.testName} (${new Date(test.date).toLocaleDateString(
            "en-IN"
          )}) - ${test.type || ""}`,
          margin,
          y
        );
        y += 6;

        if (test.subjects?.length) {
          const subjectRows = test.subjects.map((s) => [
            s.name || s.subjectName || "Subject",
            String(s.scored ?? s.marks ?? s.obtainedMarks ?? "0"),
            String(s.max ?? s.totalMarks ?? s.fullMarks ?? "0"),
            "",
          ]);

          const calculatedFullMarks =
            test.subjects.reduce(
              (sum, s) => sum + (s.max ?? s.totalMarks ?? s.fullMarks ?? 0),
              0
            ) || "-";

          const rankRow = [
            "",
            "",
            "",
            `Rank: ${test.rank ?? "-"}, Total: ${
              test.totalMarks || 0
            }/${calculatedFullMarks}`,
          ];
          subjectRows.push(rankRow);

          autoTable(doc, {
            head: [["Subject", "Obtained", "Max", ""]],
            body: subjectRows,
            theme: "grid",
            startY: y,
            styles: {
              fontSize: 9,
              halign: "center",
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: "bold",
            },
            columnStyles: {
              1: { halign: "right" },
              2: { halign: "right" },
              3: { halign: "left" },
            },
            margin: { left: margin + 2, right: margin },
            didDrawPage: (data) => {
              y = data.cursor.y + 10;
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

  //Helper functions to display Image in PDF
  const fetchImageAsBase64 = async (url) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return null;
    }
  };
  const loadImageAsBase64 = (url) =>
    new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg"));
        };
        img.onerror = () => resolve(null);
        img.src = url;
      } catch {
        resolve(null);
      }
    });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Download Student Reports</h2>

      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "individual"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("individual")}
        >
          Individual Report
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "bulk"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("bulk")}
        >
          Bulk Download
        </button>
      </div>

      {activeTab === "individual" && (
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
                <FiX
                  className="cursor-pointer"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                />
              )}
              <button type="submit" disabled={isSearching}>
                {isSearching ? (
                  <div className="animate-spin h-4 w-4 border-t-2 border-blue-500 rounded-full"></div>
                ) : (
                  <FiSearch />
                )}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="border rounded shadow mb-4 max-h-72 overflow-y-auto p-2">
              {searchResults.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between border-b py-2"
                >
                  <div className="flex gap-3 items-center">
                    <img
                      src={
                        s.studentImageURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          s.studentName
                        )}&background=random`
                      }
                      className="h-10 w-10 rounded-full"
                      alt={s.studentName}
                    />
                    <div>
                      <p className="font-medium">{s.studentName}</p>
                      <p className="text-sm text-gray-600">
                        Reg: {s.regNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchReportsForStudent(s)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
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
                  src={
                    selectedStudent.studentImageURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedStudent.studentName
                    )}&background=random`
                  }
                  className="h-16 w-16 rounded-full"
                  alt={selectedStudent.studentName}
                />
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedStudent.studentName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Reg No: {selectedStudent.regNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Campus: {selectedStudent.campus?.name || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Section: {selectedStudent.section || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Stream: {selectedStudent.allotmentType || "N/A"}
                  </p>
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

      {activeTab === "bulk" && (
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
