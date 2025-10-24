import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";
import { FiSearch, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  getTestPrefixes,
  filterReportsByPrefix,
} from "../../utils/testUtils.js";

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
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");

  // Bulk mode states
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("");
  const [detailedReports, setDetailedReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Tab state
  const [activeTab, setActiveTab] = useState("individual");
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState("");

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

  // Fetch sections whenever selectedCampus changes
  useEffect(() => {
    const loadSections = async () => {
      setSections([]);
      setSelectedSection("");
      if (!selectedCampus) return;
      try {
        const res = await axios.get(
          `${BASE_URL}/api/getsections?campus=${encodeURIComponent(
            selectedCampus
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // API returns { status, campus, count, sections: [...] }
        setSections(res.data.sections || res.data.data || []);
      } catch (e) {
        toast.error("Failed to load sections");
        console.error(e);
      }
    };
    loadSections();
  }, [selectedCampus]);

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
    if (!selectedCampus || !selectedSection) return;

    try {
      setIsLoadingReports(true);
      toast.info("Loading reports for selected campus & section...");
      const res = await axios.get(
        `${BASE_URL}/api/loaddetailedreports?campus=${encodeURIComponent(
          selectedCampus
        )}&section=${encodeURIComponent(selectedSection)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const compReports = res.data.data || [];
      const theoryRes = await axios.get(
        `${BASE_URL}/api/gettheoryrowsbycampus?campus=${encodeURIComponent(
          selectedCampus
        )}&section=${encodeURIComponent(selectedSection)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const theoryRows = theoryRes.data.data || [];
      const merged = [...compReports, ...theoryRows];
      setDetailedReports(merged);
      setAvailableTests(getTestPrefixes(merged));
      toast.success(
        `Found ${res.data.totalReports} reports for ${res.data.totalStudents} students`
      );
    } catch (err) {
      toast.error("Failed to load reports for campus & section");
      console.error(err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase();
  const pickNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
    return 0;
  };

  // Returns { scored, max } for a logical subject, combining Botany+Zoology into Biology when needed.
  const getSubjectMarks = (subjects, logical) => {
    const list = subjects || [];

    const findBy = (label) =>
      list.find(
        (s) =>
          norm(s.name) === norm(label) || norm(s.subjectName) === norm(label)
      );

    const valFrom = (s) => ({
      scored: pickNum(s?.scored, s?.marks, s?.obtainedMarks),
      max: pickNum(s?.max, s?.totalMarks, s?.fullMarks, s?.full),
    });

    if (norm(logical) !== "biology") {
      const s = findBy(logical);
      return s ? valFrom(s) : { scored: 0, max: 0 };
    }

    const bio = findBy("Biology");
    if (bio) return valFrom(bio);

    const bot = findBy("Botany");
    const zoo = findBy("Zoology");
    if (!bot && !zoo) return { scored: 0, max: 0 };

    const b = bot ? valFrom(bot) : { scored: 0, max: 0 };
    const z = zoo ? valFrom(zoo) : { scored: 0, max: 0 };
    return { scored: b.scored + z.scored, max: b.max + z.max };
  };

  const isQuarterlyTheory = (name) => {
    const n = String(name || "").toUpperCase();
    return n.includes("QUARTERLY TEST") || n.includes("I QUARTERLY TEST");
  };

  const quarterlySubjects = [
    "English",
    "Second Language",
    "Physics",
    "Chemistry",
    "Biology",
    "Mathematics",
  ];
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

    // Title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Progress Report", doc.internal.pageSize.width / 2, y, {
      align: "center",
    });
    y += 10;

    // Personal and Academic Info
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

    // Name & Reg No
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• Name:", leftLabelX, y);
    doc.text("• Reg No:", rightLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(selectedStudent.studentName || "-", leftValueX, y);
    doc.text(selectedStudent.regNumber || "-", rightValueX, y);
    y += 6;

    // DOB & Campus
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• DOB:", leftLabelX, y);
    doc.text("• Campus:", rightLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(formatDate(selectedStudent.dateOfBirth), leftValueX, y);
    doc.text(selectedStudent.campus?.name || "-", rightValueX, y);
    y += 6;

    // Parent & Section
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• Parent:", leftLabelX, y);
    doc.text("• Section:", rightLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(selectedStudent.fatherName || "-", leftValueX, y);
    doc.text(selectedStudent.section || "-", rightValueX, y);
    y += 6;

    // Mobile
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("• Mobile:", leftLabelX, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(selectedStudent.fatherMobile || "-", leftValueX, y);
    y += 10;

    // Group and organize tests by test prefix (e.g., PPT, PDT, PCT, etc.)
    const getPrefix = (name) => {
      if (!name) return "Others";
      const n = String(name).toUpperCase().replace(/\s+/g, "");
      const m = n.match(/^[A-Z]+/);
      return m ? m[0] : "Others";
    };

    const groupsMap = new Map();
    allReports.forEach((test) => {
      const prefix = getPrefix(test.testName);
      if (prefix.includes("BPCT") || prefix.includes("BPWT")) return; // skip baseline if required
      if (!groupsMap.has(prefix)) groupsMap.set(prefix, []);
      groupsMap.get(prefix).push(test);
    });

    // Sort tests within each group by embedded number
    const extractNumber = (str) => {
      const match = String(str || "")
        .replace(/\s+/g, "")
        .match(/(\d+)/);
      return match ? parseInt(match[0]) : 0;
    };

    // Fixed logical subjects
    // const allSubjects = ["Physics", "Chemistry", "Mathematics", "Biology"];

    for (const [prefix, tests] of groupsMap.entries()) {
      if (!tests.length) continue;
      const groupHasQuarterly = tests.some((t) =>
        isQuarterlyTheory(t.testName)
      );
      const subjectsForThisGroup = groupHasQuarterly
        ? quarterlySubjects
        : ["Physics", "Chemistry", "Mathematics", "Biology"];
      tests.sort(
        (a, b) => extractNumber(a.testName) - extractNumber(b.testName)
      );

      // Section title
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 100);
      doc.text(`${prefix} Tests`, margin, y);
      y += 6;

      // Header max marks computed from the first test in this group,
      // using getSubjectMarks so Biology can be Botany+Zoology if split.
      const subjectMaxMap = {};
      subjectsForThisGroup.forEach((s) => (subjectMaxMap[s] = "-"));

      let totalMax = 0;
      if (tests.length) {
        const first = tests[0];
        const maxVals = {};
        subjectsForThisGroup.forEach((s) => {
          const { max } = getSubjectMarks(first.subjects, s);
          maxVals[s] = Number(max) || 0;
          subjectMaxMap[s] = max ? String(max) : "-";
        });
        totalMax = Object.values(maxVals).reduce((a, b) => a + b, 0);
      }

      const headers = [
        "Test Name",
        "Date",
        ...subjectsForThisGroup.map((s) => `${s} (${subjectMaxMap[s]})`),
        `Total (${totalMax})`,
        "Percentile",
        "Rank",
      ];

      const rows = [];
      const totals = [];
      const attendedTotals = [];
      let best = null;
      let low = null;

      // Subject-wise accumulators
      const subjSums = Object.fromEntries(
        subjectsForThisGroup.map((s) => [s, 0])
      );
      const subjCounts = Object.fromEntries(
        subjectsForThisGroup.map((s) => [s, 0])
      );

      tests.forEach((t) => {
        const row = [t.testName, new Date(t.date).toLocaleDateString("en-IN")];
        let total = 0;

        const perRowMarks = {};
        subjectsForThisGroup.forEach((subj) => {
          const { scored } = getSubjectMarks(t.subjects, subj);
          const marks = Number(scored) || 0;
          perRowMarks[subj] = marks;
          row.push(String(marks));
          total += marks;
        });

        const isAbsent = total === 0;

        totals.push(total);

        if (!isAbsent) {
          subjectsForThisGroup.forEach((s) => {
            subjSums[s] += perRowMarks[s];
            subjCounts[s] += 1;
          });
          attendedTotals.push(total);
          if (!best || total > best.total) best = { name: t.testName, total };
          if (!low || total < low.total) low = { name: t.testName, total };
        }

        row.push(
          total.toString(),
          t.percentile?.toString() ?? "-",
          t.rank?.toString() ?? "-"
        );
        rows.push(row);
      });

      // Overall average (current behavior: includes absents; switch to attendedTotals if you want to exclude)
      const overallDenom = attendedTotals.length || 1;
      const overallAvg = (
        attendedTotals.reduce((a, b) => a + b, 0) / overallDenom
      ).toFixed(2);

      const avgRow = Array(headers.length).fill("");
      avgRow[0] = "Average";
      avgRow[1] = "";
      subjectsForThisGroup.forEach((s, idx) => {
        const denom = subjCounts[s] || 1;
        const mean = (subjSums[s] / denom).toFixed(2);
        avgRow[2 + idx] = mean;
      });
      avgRow[2 + subjectsForThisGroup.length] = overallAvg;
      rows.push(avgRow);

      if (attendedTotals.length) {
        const bestRow = Array(headers.length).fill("");
        bestRow[0] = `Best: ${best.name}`;
        bestRow[2 + subjectsForThisGroup.length] = String(best.total);
        rows.push(bestRow);

        const lowRow = Array(headers.length).fill("");
        lowRow[0] = `Lowest: ${low.name}`;
        lowRow[2 + subjectsForThisGroup.length] = String(low.total);
        rows.push(lowRow);
      } else {
        const noteRow = Array(headers.length).fill("");
        noteRow[0] = "No attended tests in this group";
        rows.push(noteRow);
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
    }

    // After all tables, append counselling forms
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
    const formHeight = 130;
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
          const boxHeight = 30;
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

  // const norm = (s) => String(s || "").trim().toLowerCase();
  // const pickNum = (...vals) => {
  //   for (const v of vals) {
  //     const n = Number(v);
  //     if (!isNaN(n)) return n;
  //   }
  //   return 0;
  // };

  // Returns { scored, max } for a logical subject, combining Botany+Zoology into Biology when needed.
  // const getSubjectMarks = (subjects, logical) => {
  //   const list = subjects || [];

  //   const findBy = (label) =>
  //     list.find(
  //       (s) => norm(s.name) === norm(label) || norm(s.subjectName) === norm(label)
  //     );

  //   const valFrom = (s) => ({
  //     scored: pickNum(s?.scored, s?.marks, s?.obtainedMarks),
  //     max: pickNum(s?.max, s?.totalMarks, s?.fullMarks, s?.full),
  //   });

  //   if (norm(logical) !== "biology") {
  //     const s = findBy(logical);
  //     return s ? valFrom(s) : { scored: 0, max: 0 };
  //   }

  //   const bio = findBy("Biology");
  //   if (bio) return valFrom(bio);

  //   const bot = findBy("Botany");
  //   const zoo = findBy("Zoology");
  //   if (!bot && !zoo) return { scored: 0, max: 0 };

  //   const b = bot ? valFrom(bot) : { scored: 0, max: 0 };
  //   const z = zoo ? valFrom(zoo) : { scored: 0, max: 0 };
  //   return { scored: b.scored + z.scored, max: b.max + z.max };
  // };
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

    // prefix helper
    const getPrefix = (name) => {
      if (!name) return "Others";
      const n = String(name).toUpperCase().replace(/\s+/g, "");
      const m = n.match(/^[A-Z]+/);
      return m ? m[0] : "Others";
    };

    const extractNumber = (str) => {
      const match = String(str || "")
        .replace(/\s+/g, "")
        .match(/(\d+)/);
      return match ? parseInt(match[0]) : 0;
    };

    // Fixed logical subjects for NEET stream with Bio combined
    const logicalSubjects = ["Physics", "Chemistry", "Mathematics", "Biology"];

    let studentIndex = 0;
    for (const student of studentsList) {
      // Fetch full student data for header (robustness for campus/section)
      let selectedStudent = { regNumber: student.regNumber };
      try {
        const res = await axios.get(
          `${BASE_URL}/api/getstudentbyreg/${student.regNumber}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        selectedStudent = res.data.data || selectedStudent;
      } catch (err) {
        // proceed with minimal data
      }

      // Collect reports for this student
      const studentReports = (reportsData || []).filter(
        (r) => r.regNumber === student.regNumber
      );
      const theory = (theoryReportsData || []).filter(
        (r) => r.regNumber === student.regNumber
      );
      const allReports = [...studentReports, ...theory];
      if (!allReports.length) {
        studentIndex++;
        continue;
      }

      // fresh page for each student (except first uses initial page)
      let y = margin;
      if (studentIndex > 0) doc.addPage();

      // Header
      if (headerLogo) {
        doc.addImage(headerLogo, "PNG", margin, y, 18, 18);
      }
      doc.setFontSize(15);
      doc.setTextColor(30, 30, 30);
      doc.text("Parishrama Group of Institutions", margin + 22, y + 12);

      doc.setDrawColor(200);
      doc.line(margin, y + 20, doc.internal.pageSize.width - margin, y + 20);
      y += 28;

      // Title
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text("Progress Report", doc.internal.pageSize.width / 2, y, {
        align: "center",
      });
      y += 10;

      // Student info
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Personal Details", margin, y);
      doc.text("Academic Details", margin + 100, y);
      y += 6;

      const formatDate = (isoDate) => {
        if (!isoDate) return "-";
        const d = new Date(isoDate);
        return `${String(d.getDate()).padStart(2, "0")}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}-${d.getFullYear()}`;
      };

      doc.setTextColor(60, 60, 60);
      doc.text(`Name: ${selectedStudent.studentName || "-"}`, margin, y);
      doc.text(`Reg No: ${selectedStudent.regNumber || "-"}`, margin + 100, y);
      y += 6;

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

      // Build prefix groups for this student
      const groupsMap = new Map();
      allReports.forEach((t) => {
        const prefix = getPrefix(t.testName);
        if (prefix.includes("BPCT") || prefix.includes("BPWT")) return; // skip baseline if required
        if (!groupsMap.has(prefix)) groupsMap.set(prefix, []);
        groupsMap.get(prefix).push(t);
      });

      for (const [prefix, tests] of groupsMap.entries()) {
        if (!tests.length) continue;

        tests.sort(
          (a, b) => extractNumber(a.testName) - extractNumber(b.testName)
        );

        // Decide subjects for this group
        const groupHasQuarterly = tests.some((t) =>
          isQuarterlyTheory(t.testName)
        );
        const subjectsForThisGroup = groupHasQuarterly
          ? quarterlySubjects
          : ["Physics", "Chemistry", "Mathematics", "Biology"];

        // Section title
        doc.setFontSize(13);
        doc.setTextColor(20, 20, 100);
        doc.text(`${prefix} Tests`, margin, y);
        y += 6;

        // Header max marks from first test
        const subjectMaxMap = {};
        subjectsForThisGroup.forEach((s) => (subjectMaxMap[s] = "-"));
        let totalMax = 0;
        if (tests.length) {
          const first = tests[0];
          const maxVals = {};
          subjectsForThisGroup.forEach((s) => {
            const { max } = getSubjectMarks(first.subjects, s);
            maxVals[s] = Number(max) || 0;
            subjectMaxMap[s] = max ? String(max) : "-";
          });
          totalMax = Object.values(maxVals).reduce((a, b) => a + b, 0);
        }

        const headers = [
          "Test Name",
          "Date",
          ...subjectsForThisGroup.map((s) => `${s} (${subjectMaxMap[s]})`),
          `Total (${totalMax})`,
          "Percentile",
          "Rank",
        ];

        const rows = [];
        const totals = [];
        const attendedTotals = [];
        let best = null;
        let low = null;

        // Subject-wise accumulators
        const subjSums = Object.fromEntries(
          subjectsForThisGroup.map((s) => [s, 0])
        );
        const subjCounts = Object.fromEntries(
          subjectsForThisGroup.map((s) => [s, 0])
        );

        tests.forEach((t) => {
          const row = [
            t.testName,
            new Date(t.date).toLocaleDateString("en-IN"),
          ];
          let total = 0;

          const perRowMarks = {};
          subjectsForThisGroup.forEach((subj) => {
            const { scored } = getSubjectMarks(t.subjects, subj);
            const marks = Number(scored) || 0;
            perRowMarks[subj] = marks;
            row.push(String(marks));
            total += marks;
          });

          const isAbsent = total === 0;
          totals.push(total);

          if (!isAbsent) {
            subjectsForThisGroup.forEach((s) => {
              subjSums[s] += perRowMarks[s];
              subjCounts[s] += 1;
            });
            attendedTotals.push(total);
            if (!best || total > best.total) best = { name: t.testName, total };
            if (!low || total < low.total) low = { name: t.testName, total };
          }

          row.push(
            total.toString(),
            t.percentile?.toString() ?? "-",
            t.rank?.toString() ?? "-"
          );
          rows.push(row);
        });

        const overallDenom = attendedTotals.length || 1;
        const overallAvg = (
          attendedTotals.reduce((a, b) => a + b, 0) / overallDenom
        ).toFixed(2);

        const avgRow = Array(headers.length).fill("");
        avgRow[0] = "Average";
        avgRow[1] = "";
        subjectsForThisGroup.forEach((s, idx) => {
          const denom = subjCounts[s] || 1;
          const mean = (subjSums[s] / denom).toFixed(2);
          avgRow[2 + idx] = mean;
        });
        avgRow[2 + subjectsForThisGroup.length] = overallAvg;
        rows.push(avgRow);

        if (attendedTotals.length) {
          const bestRow = Array(headers.length).fill("");
          bestRow[0] = `Best: ${best.name}`;
          bestRow[2 + subjectsForThisGroup.length] = String(best.total);
          rows.push(bestRow);

          const lowRow = Array(headers.length).fill("");
          lowRow[0] = `Lowest: ${low.name}`;
          lowRow[2 + subjectsForThisGroup.length] = String(low.total);
          rows.push(lowRow);
        } else {
          const noteRow = Array(headers.length).fill("");
          noteRow[0] = "No attended tests in this group";
          rows.push(noteRow);
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
      }

      // After all tables for this student, append counselling forms
      doc.addPage();
      appendCounsellingForms(doc, margin);
      const totalPages = doc.getNumberOfPages();
      if (totalPages % 2 === 1) {
        // Optionally mark the filler page
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          "This page intentionally left blank.",
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() / 2,
          { align: "center" }
        );
        doc.addPage(); // move to a clean page for the next student
      }

      studentIndex++;
    }

    doc.save("BulkStudentReports.pdf");
  };

  const generateBulkExcel = (students, reports) => {
    // 1. Collect unique testNames sorted by number

    const testNames = [...new Set(reports.map((r) => r.testName))].sort(
      (a, b) => {
        const getNum = (str) => parseInt(str.replace(/\D+/g, "")) || 0;
        return getNum(a) - getNum(b);
      }
    );

    // 2. Collect subjects dynamically across reports
    const allSubjects = Array.from(
      new Set(
        reports.flatMap(
          (r) => r.subjects?.map((s) => s.subjectName || s.name) || []
        )
      )
    );

    // 3. Build headers
    const headers = ["RegNumber", "StudentName", "Campus", "Section"];
    testNames.forEach((test) => {
      allSubjects.forEach((sub) => headers.push(`${test}_${sub}`));
      headers.push(`${test}_OverallTotalMarks`);
    });

    // 4. Build rows
    const rows = students.map((student) => {
      const row = [
        student.regNumber,
        student.studentName,
        student.campus,
        student.section,
      ];

      testNames.forEach((test) => {
        const report = reports.find(
          (r) => r.regNumber === student.regNumber && r.testName === test
        );

        if (report) {
          allSubjects.forEach((sub) => {
            const found = report.subjects?.find(
              (s) =>
                s.subjectName?.toLowerCase() === sub.toLowerCase() ||
                s.name?.toLowerCase() === sub.toLowerCase()
            );
            row.push(found ? found.scored : "A"); // Absent = A
          });
          row.push(report.overallTotalMarks ?? 0);
        } else {
          allSubjects.forEach(() => row.push("A"));
          row.push(0);
        }
      });

      return row;
    });

    // 5. Create Excel file
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      "Campus_Test_Reports.xlsx"
    );
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

            <select
              className="border px-3 py-2 rounded"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedCampus || sections.length === 0}
            >
              <option value="">Select Section</option>
              {sections.map((s, i) => {
                const val = typeof s === "string" ? s : s.name || s._id || "";
                const label = typeof s === "string" ? s : s.name || String(val);
                return (
                  <option key={`${val}-${i}`} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>

            <select
              className="border px-3 py-2 rounded"
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              disabled={!availableTests.length}
            >
              <option value="">All Tests</option>
              {availableTests.map((test, i) => (
                <option key={i} value={test}>
                  {test}
                </option>
              ))}
            </select>

            <button
              onClick={fetchReportsForCampus}
              className="bg-blue-600 text-white px-4 py-2 rounded"
              disabled={!selectedCampus || !selectedSection}
            >
              Load Reports
            </button>
            <div className="relative inline-block">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
                disabled={
                  !selectedCampus ||
                  !selectedSection ||
                  !detailedReports.length ||
                  isDownloading
                }
              >
                {isDownloading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Generating Reports...
                  </>
                ) : (
                  "Download Reports ▾"
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10">
                  {/* Excel */}
                  <button
                    onClick={() => {
                      try {
                        const finalReports = filterReportsByPrefix(
                          detailedReports,
                          selectedTest
                        );
                        const students = [
                          ...new Map(
                            finalReports.map((r) => [
                              r.regNumber,
                              {
                                regNumber: r.regNumber,
                                studentName: r.studentName,
                                campus: r.campus,
                                section: r.section,
                              },
                            ])
                          ).values(),
                        ];

                        if (!finalReports.length) {
                          toast.error("No data for Excel");
                          return;
                        }

                        generateBulkExcel(students, finalReports);
                      } catch (err) {
                        toast.error("Error generating Excel");
                      } finally {
                        setIsMenuOpen(false); // close after action
                      }
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Download Excel
                  </button>

                  {/* PDF */}
                  <button
                    onClick={async () => {
                      try {
                        setIsDownloading(true);

                        const finalReports = filterReportsByPrefix(
                          detailedReports,
                          selectedTest
                        );
                        if (!finalReports.length) {
                          toast.error("No data for PDF");
                          return;
                        }

                        // Robust theory detector
                        const isTheory = (name) => {
                          const n = String(name || "")
                            .toUpperCase()
                            .trim();
                          return n.includes("IPTT") || n.includes("PTT"); // add others explicitly if needed
                        };

                        const theoryReports = finalReports.filter((r) =>
                          isTheory(r.testName)
                        );
                        const competitiveReports = finalReports.filter(
                          (r) => !isTheory(r.testName)
                        );

                        const students = [
                          ...new Set(finalReports.map((r) => r.regNumber)),
                        ].map((reg) => ({ regNumber: reg }));

                        await generateBulkPDF(
                          students,
                          competitiveReports, // non-theory
                          theoryReports // theory
                        );
                      } catch (err) {
                        toast.error("Error generating PDF");
                        console.error(err);
                      } finally {
                        setIsDownloading(false);
                        setIsMenuOpen(false);
                      }
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>
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
