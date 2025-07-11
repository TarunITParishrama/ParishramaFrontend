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
  const [isDownloading, setIsDownloading] = useState(false);
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
  }, [BASE_URL, token]);

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

    if (headerLogo) {
      doc.addImage(headerLogo, "PNG", margin, y, 18, 18);
    }

    doc.setFontSize(15);
    doc.setTextColor(30, 30, 30);
    doc.text("Parishrama Group of Institutions", margin + 22, y + 12);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("PU College | NEET Academy", margin + 22, y + 18);

    doc.setDrawColor(200);
    doc.line(margin, y + 25, doc.internal.pageSize.width - margin, y + 25);
    y += 33;

    // 🧾 Title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Progress Report", doc.internal.pageSize.width / 2, y, {
      align: "center",
    });
    y += 10;

    // 📋 Personal and Academic Info
    const formatDate = (isoDate) => {
      if (!isoDate) return "-";
      const d = new Date(isoDate);
      return `${String(d.getDate()).padStart(2, "0")}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${d.getFullYear()}`;
    };
    // Alignment Config
    const leftLabelX = margin;
    const leftValueX = margin + 32;

    const rightLabelX = margin + 100;
    const rightValueX = rightLabelX + 22;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Personal Details", leftLabelX, y);
    doc.text("Academic Details", rightLabelX, y);
    y += 6;

    doc.setFontSize(11);

    // 🔹 Name & Reg No
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• Name:", leftLabelX, y);
    doc.text("• Reg No:", rightLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(selectedStudent.studentName || "-", leftValueX, y);
    doc.text(selectedStudent.regNumber || "-", rightValueX, y);
    y += 6;

    // 🔹 DOB & Campus
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• DOB:", leftLabelX, y);
    doc.text("• Campus:", rightLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(formatDate(selectedStudent.dateOfBirth), leftValueX, y);
    doc.text(selectedStudent.campus?.name || "-", rightValueX, y);
    y += 6;

    // 🔹 Parent & Section
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• Parent:", leftLabelX, y);
    doc.text("• Section:", rightLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(selectedStudent.fatherName || "-", leftValueX, y);
    doc.text(selectedStudent.section || "-", rightValueX, y);
    y += 6;

    // 🔹 Mobile
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• Mobile:", leftLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(selectedStudent.fatherMobile || "-", leftValueX, y);
    y += 10;

    // Group and organize tests
    const grouped = {
      "Daily Tests Performance": [],
      "Weekly Tests Performance": [],
      "Theory Tests Performance": [],
      "Others Tests Performance": [],
    };

    allReports.forEach((test) => {
      const name = test.testName.toUpperCase();
      if (name.includes("BPCT") || name.includes("BPWT")) return;
      if (name.includes("PDT") || name.includes("IPDT"))
        grouped["Daily Tests Performance"].push(test);
      else if (
        name.includes("PCT") ||
        name.includes("PWT") ||
        name.includes("IPCT") ||
        name.includes("IPWT")
      )
        grouped["Weekly Tests Performance"].push(test);
      else if (name.includes("PTT"))
        grouped["Theory Tests Performance"].push(test);
      else grouped["Others Tests Performance"].push(test);
    });

    const extractNumber = (str) => {
      const match = str.replace(/\s+/g, "").match(/(\d+)/);
      return match ? parseInt(match[0]) : 0;
    };

    const allSubjects = ["Physics", "Chemistry", "Mathematics", "Biology"];

    Object.entries(grouped).forEach(([category, tests]) => {
      if (!tests.length) return;

      tests.sort(
        (a, b) => extractNumber(a.testName) - extractNumber(b.testName)
      );

      doc.setFontSize(13);
      doc.setTextColor(20, 20, 100);
      doc.text(category, margin, y);
      y += 6;

      // Dynamic Max Marks in headers
      const subjectMaxMap = {};
      for (const subj of allSubjects) subjectMaxMap[subj] = "-";
      let totalMax = 0;
      if (tests.length) {
        tests[0].subjects?.forEach((s) => {
          const sub = s.name || s.subjectName;
          if (allSubjects.includes(sub)) {
            subjectMaxMap[sub] =
              s.max ?? s.totalMarks ?? s.fullMarks ?? s.full ?? "-";
          }
        });
        totalMax = Object.values(subjectMaxMap).reduce((a, b) => {
          const v = parseInt(b);
          return isNaN(v) ? a : a + v;
        }, 0);
      }

      const headers = [
        "Test Name",
        "Date",
        ...allSubjects.map((s) => `${s} (${subjectMaxMap[s]})`),
        `Total (${totalMax})`,
        "Percentile",
        "Rank",
      ];

      const rows = [];
      let allTotals = [];
      let bestTest = null;
      let lowestTest = null;

      tests.forEach((test) => {
        const row = [
          test.testName,
          new Date(test.date).toLocaleDateString("en-IN"),
        ];
        let total = 0;

        allSubjects.forEach((subj) => {
          const found = test.subjects?.find(
            (s) => s.name === subj || s.subjectName === subj
          );
          const marks =
            found?.scored ?? found?.marks ?? found?.obtainedMarks ?? 0;
          row.push(String(marks || 0));
          total += Number(marks);
        });

        if (total === 0) {
          for (let i = 2; i < 6; i++) row[i] = "Absent";
          row.push("0", "0", "-");
        } else {
          row.push(
            total.toString(),
            test.percentile?.toString() ?? "-",
            test.rank?.toString() ?? "-"
          );
        }

        if (!bestTest || total > bestTest.total)
          bestTest = { name: test.testName, total };
        if (!lowestTest || total < lowestTest.total)
          lowestTest = { name: test.testName, total };

        allTotals.push(total);
        rows.push(row);
      });

      if (allTotals.length) {
        const avg = (
          allTotals.reduce((a, b) => a + b, 0) / allTotals.length
        ).toFixed(2);
        rows.push(["Average", "", "", "", "", avg, "", ""]);
        rows.push([
          `Best: `,
          "",
          "",
          `${bestTest.name}`,
          "",
          `${bestTest.total}`,
          "",
          "",
        ]);
        rows.push([
          `Lowest: `,
          "",
          "",
          `${lowestTest.name}`,
          "",
          `${lowestTest.total}`,
          "",
          "",
        ]);
      }

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: y,
        styles: {
          fontSize: 9,
          halign: "center",
          cellPadding: 2,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [26, 188, 156],
          textColor: 255,
          fontStyle: "bold",
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          y = data.cursor.y + 10;
        },
      });

      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    });

    doc.addPage();
    appendCounsellingForms(doc, margin);

    doc.save(`${selectedStudent.regNumber}_Detailed_Report.pdf`);
  };

  const appendCounsellingForms = (doc, margin) => {
  const departments = [
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
    "______________", // for 'Others'
  ];

  const questions = [
    "Alertness in Classroom",
    "Understanding Levels",
    "Effectiveness in Reading",
    "Memory Skills",
    "MCQ Solving Ability",
    "Time Management in Tests",
    "Class Notes Verification & Handwriting",
    "Ability to solve Questions in Theory Tests",
    "Study Planning & Strategy",
  ];

  const pageWidth = doc.internal.pageSize.width;
  const fullWidth = pageWidth - 2 * margin;
  const suggestionsHeight = 30;
  //const formHeight = 130;
  let yStart = 20;

  departments.forEach((dept, index) => {
    // Every 2 forms, start new page
    if (index % 2 === 0 && index !== 0) {
      doc.addPage();
      yStart = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 100);
    doc.text(`Department of ${dept}`, margin, yStart);

    const tableData = questions.map((q) => [q, "", "", ""]);
    autoTable(doc, {
      startY: yStart + 5,
      head: [["Questions", "Good", "Average", "Poor"]],
      body: tableData,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.6,
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [26, 188, 156],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: fullWidth * 0.55 },
        1: { halign: "center", cellWidth: fullWidth * 0.12 },
        2: { halign: "center", cellWidth: fullWidth * 0.12 },
        3: { halign: "center", cellWidth: fullWidth * 0.12 },
      },
      margin: { left: margin, right: margin },
      tableWidth: fullWidth * 0.95,
      didDrawPage: (data) => {
        const tableBottom = data.cursor.y;

        // 📦 Suggestion Box (full-width)
        const boxY = tableBottom + 10;
        //const boxHeight = 30;
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Suggestions", margin + 2, boxY + 5);
        doc.rect(margin, boxY, fullWidth, suggestionsHeight);

        // 🖋 Signature lines
        const sigY = boxY + suggestionsHeight + 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(20, 20, 100);
        doc.text("Lecturer Name & Signature with Date", margin, sigY);
        doc.text("Student Signature", pageWidth - margin - 50, sigY);

        // Update yStart for next form in the same page
        yStart = sigY + 20;
      },
    });
  });
};


  //Bulk PDF
  const generateBulkPDF = async (
    studentsList,
    reportsData,
    theoryReportsData
  ) => {
    if (!Array.isArray(studentsList) || !studentsList.length) {
      toast.error("No student data to generate bulk PDF");
      return;
    }

    const doc = new jsPDF();
    const margin = 15;
    const token = localStorage.getItem("token");
    const headerLogo = await loadImageAsBase64("/assets/mainlogo.png");

    for (const student of studentsList) {
      // Fetch full student data from backend
      let selectedStudent = { regNumber: student.regNumber };
      try {
        const res = await axios.get(
          `${BASE_URL}/api/getstudentbyreg/${student.regNumber}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        selectedStudent = res.data.data;
      } catch (err) {
        console.warn(
          `Warning: Couldn't fetch data for ${student.regNumber}`,
          err
        );
        continue; // Skip this student if fetch fails
      }

      const studentReports = reportsData.filter(
        (r) => r.regNumber === student.regNumber
      );
      const theory = theoryReportsData.filter(
        (r) => r.regNumber === student.regNumber
      );

      const allReports = [...studentReports, ...theory];
      if (!allReports.length) continue;

      const grouped = {
        "Daily Tests": [],
        "Weekly Tests": [],
        "Theory Tests": [],
        Others: [],
      };

      allReports.forEach((test) => {
        const name = test.testName?.toUpperCase?.() || "";
        if (name.includes("BPCT") || name.includes("BPWT")) return;

        if (name.includes("PDT") || name.includes("IPDT")) {
          grouped["Daily Tests"].push(test);
        } else if (
          name.includes("PCT") ||
          name.includes("PWT") ||
          name.includes("IPCT") ||
          name.includes("IPWT")
        ) {
          grouped["Weekly Tests"].push(test);
        } else if (name.includes("PTT")) {
          grouped["Theory Tests"].push(test);
        } else {
          grouped["Others"].push(test);
        }
      });

      let y = margin;

      if (headerLogo) {
        doc.addImage(headerLogo, "PNG", margin, y, 18, 18);
      }

      doc.setFontSize(15);
      doc.setTextColor(30, 30, 30);
      doc.text("Parishrama Group of Institutions", margin + 22, y + 12);
      doc.setDrawColor(200);
      doc.line(margin, y + 20, doc.internal.pageSize.width - margin, y + 20);
      y += 28;

      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text("Progress Report", doc.internal.pageSize.width / 2, y, {
        align: "center",
      });
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Personal Details", margin, y);
      doc.text("Academic Details", margin + 100, y);
      y += 6;
      doc.setTextColor(60, 60, 60);
      doc.text(`Name: ${selectedStudent.studentName || "-"}`, margin, y);
      doc.text(`Reg No: ${selectedStudent.regNumber}`, margin + 100, y);
      y += 6;
      const formatDate = (isoDate) => {
        if (!isoDate) return "-";
        const d = new Date(isoDate);
        return `${String(d.getDate()).padStart(2, "0")}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}-${d.getFullYear()}`;
      };

      doc.text(`DOB: ${formatDate(selectedStudent.dateOfBirth)}`, margin, y);
      doc.text(
        `Campus: ${selectedStudent?.campus?.name || "-"}`,
        margin + 100,
        y
      );
      y += 6;
      doc.text(`Parent: ${selectedStudent.fatherName || "-"}`, margin, y);
      doc.text(`Section: ${selectedStudent.section || "-"}`, margin + 100, y);
      y += 6;
      doc.text(`Mobile: ${selectedStudent.fatherMobile || "-"}`, margin, y);
      y += 10;

      const extractNumber = (str) => {
        const match = str.replace(/\s+/g, "").match(/(\d+)/);
        return match ? parseInt(match[0]) : 0;
      };

      const allSubjects = ["Physics", "Chemistry", "Mathematics", "Biology"];

      let pagesUsed = 0;

      for (const [category, tests] of Object.entries(grouped)) {
        if (!tests.length) continue;

        tests.sort(
          (a, b) => extractNumber(a.testName) - extractNumber(b.testName)
        );

        doc.setFontSize(13);
        doc.setTextColor(20, 20, 100);
        doc.text(category, margin, y);
        y += 6;

        const headers = [
          "Test Name",
          "Date",
          ...allSubjects,
          "Total Marks",
          "Max Marks",
          "Percentile",
          "Rank",
        ];

        const rows = [];
        let allTotals = [];
        let bestTest = null;
        let lowestTest = null;
        
        tests.forEach((test) => {
          const row = [
            test.testName,
            new Date(test.date).toLocaleDateString("en-IN"),
          ];
          let total = 0;
          let full = 0;
          
          allSubjects.forEach((subj) => {
            const found = test.subjects?.find(
              (s) => s.name === subj || s.subjectName === subj
            );
            const marks =
              found?.scored ?? found?.marks ?? found?.obtainedMarks ?? 0;
            const max =
              found?.max ?? found?.totalMarks ?? found?.fullMarks ?? 0;
            row.push(String(marks || 0));
            total += Number(marks);
            full += Number(max);
          });

          if (total === 0 && full === 0) {
            for (let i = 2; i < 6; i++) row[i] = "Absent";
            row.push("0", "0", "-", test.rank ?? "-");
          } else {
            row.push(
              total.toString(),
              full.toString(),
              test.percentile?.toString() ?? "-",
              test.rank?.toString() ?? "-"
            );
          }

          if (!bestTest || total > bestTest.total)
            bestTest = { name: test.testName, total, full };
          if (!lowestTest || total < lowestTest.total)
            lowestTest = { name: test.testName, total, full };

          allTotals.push(total);
          rows.push(row);
        });

        if (allTotals.length) {
          const avg = (
            allTotals.reduce((a, b) => a + b, 0) / allTotals.length
          ).toFixed(2);
          rows.push(["Average", "", "", "", "", "", avg, "", "", ""]);
          rows.push([
            `Best: ${bestTest.name}`,
            "",
            "",
            "",
            "",
            "",
            `${bestTest.total}/${bestTest.full}`,
            "",
            "",
            "",
          ]);
          rows.push([
            `Lowest: ${lowestTest.name}`,
            "",
            "",
            "",
            "",
            "",
            `${lowestTest.total}/${lowestTest.full}`,
            "",
            "",
            "",
          ]);
        }
        
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: y,
          styles: { fontSize: 9, halign: "center", cellPadding: 2 },
          headStyles: {
            fillColor: [26, 188, 156],
            textColor: 255,
            fontStyle: "bold",
          },
          margin: { left: margin, right: margin },
          // didDrawPage: (data) => {
          //   y = data.cursor.y + 10;
          // },
        });

        if (++pagesUsed < 2) {
          doc.addPage();
          y = margin;
        }
      }

      // From page 3 onward, append counselling forms
      doc.addPage();
      appendCounsellingForms(doc, margin);
    }

    doc.save("Bulk_Student_Reports.pdf");
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
              onClick={async () => {
                try {
                  setIsDownloading(true); // loading starts

                  const finalData = [...detailedReports]; // Assuming detailedReports is the complete source

                  const reportsData = finalData.filter(
                    (r) =>
                      r.testName.includes("PDT") ||
                      r.testName.includes("PCT") ||
                      r.testName.includes("IP")
                  );

                  const theoryReports = finalData.filter((r) =>
                    r.testName.includes("PTT")
                  );

                  const students = [
                    ...new Set(finalData.map((r) => r.regNumber)),
                  ].map((reg) => ({ regNumber: reg }));

                  if (!Array.isArray(finalData) || !finalData.length) {
                    toast.error("No data to generate reports");
                    return;
                  }

                  await generateBulkPDF(students, reportsData, theoryReports);
                } catch (err) {
                  toast.error("Error generating PDF");
                } finally {
                  setIsDownloading(false); // loading ends
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
              disabled={!detailedReports.length || isDownloading}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Generating Reports (60-90 sec)...
                </>
              ) : (
                "Download PDF"
              )}
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
