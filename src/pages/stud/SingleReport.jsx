import React, { useState, useEffect } from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import {
  FaFileAlt,
  FaBook,
  FaChartBar,
  FaChartPie,
  FaCalendarAlt,
  FaFolderOpen,
} from "react-icons/fa";
import { MdNotes, MdScore, MdEmojiEvents } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const SingleReport = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [detailedReports, setDetailedReports] = useState([]);
  const [groupedCompetitiveTests, setGroupedCompetitiveTests] = useState({});
  const [theoryTests, setTheoryTests] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showTheoryTab, setShowTheoryTab] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderDates, setFolderDates] = useState({});

  // Helper function to extract base test name (e.g., "PDT" from "PDT-25")
  const getBaseTestName = (testName) => {
    if (!testName) return "";
    return testName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  };

  // Function to get full test name based on abbreviation and stream
  const getFullTestName = (abbreviation, stream) => {
    const baseName = getBaseTestName(abbreviation);
    const isPUC = stream?.includes("PUC");
    const isLongTerm = stream === "LongTerm";
    const isDayScholar =
      abbreviation.includes("DS") || abbreviation.includes("SD");

    const testNames = {
      PDT: "Parishrama Daily Test",
      PCT: isPUC
        ? "Parishrama Competitive Tests"
        : "Parishrama Cumulative Tests",
      PWT: "Parishrama Weekly Tests",
      LIPDT: "LongTerm Phase 1 Daily Tests",
      LIIPDT: "LongTerm Phase 2 Daily Tests",
      IPDT: "11th PUC Daily Tests",
      IIPDT: "12th PUC Daily Tests",
      BPCT: "Bridge Course Competitive Tests",
      BPWT: "Bridge Course Weekly Tests",
      DSPDT: "Day Scholars Daily Tests",
      PDTDS: "Day Scholars Daily Tests",
    };

    let fullName = testNames[baseName] || abbreviation;

    if (isDayScholar && !fullName.includes("Day Scholars")) {
      fullName = `Day Scholars ${fullName}`;
    }

    return fullName;
  };

  // Group tests by their base pattern name
  const groupTestsByFolder = (tests, patterns, stream) => {
    const folders = {
      "Daily Tests": {},
      "Weekly Tests": {},
      "Other Tests": {},
    };

    tests.forEach((test) => {
      const baseName = getBaseTestName(test.testName);
      const pattern = patterns.find(
        (p) => getBaseTestName(p.testName) === baseName
      );
      const fullName = getFullTestName(baseName, stream);

      let folderKey;
      if (/PDT|IPDT/.test(baseName)) {
        folderKey = "Daily Tests";
      } else if (/PCT|IPCT/.test(baseName)) {
        folderKey = "Weekly Tests";
      } else {
        folderKey = "Other Tests";
      }

      if (!folders[folderKey][baseName]) {
        folders[folderKey][baseName] = {
          pattern: pattern || null,
          fullName,
          tests: [],
        };
      }

      folders[folderKey][baseName].tests.push(test);
    });

    // Sort all tests in each group
    Object.values(folders).forEach((folder) =>
      Object.values(folder).forEach((group) =>
        group.tests.sort((a, b) => new Date(b.date) - new Date(a.date))
      )
    );

    return folders;
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);

        const storedStudentData = localStorage.getItem("studentData");
        if (!storedStudentData) {
          toast.error("Student data not found. Please login again.");
          navigate("/");
          return;
        }

        const parsedStudentData = JSON.parse(storedStudentData);
        setStudentData(parsedStudentData);

        const stream = parsedStudentData.student?.stream;
        const shouldShowTheoryTab = stream?.includes("PUC");
        setShowTheoryTab(shouldShowTheoryTab);

        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Session expired. Please login again.");
          navigate("/");
          return;
        }

        // Fetch all patterns first to get total marks
        const patternsRes = await axios.get(
          `${process.env.REACT_APP_URL}/api/getpatterns`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (patternsRes.data.status === "success") {
          setPatterns(patternsRes.data.data);
        }

        // Fetch detailed reports (MCQ tests)
        const reportsRes = await axios.get(
          `${process.env.REACT_APP_URL}/api/students/${parsedStudentData.regNumber}/reports`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (reportsRes.data.status === "success") {
          // Flatten reports and add total marks from patterns
          const reportsWithTotalMarks = reportsRes.data.data.flatMap(
            (reportGroup) =>
              reportGroup.reports.map((report) => {
                const baseTestName = getBaseTestName(report.testName);
                const pattern = patternsRes.data.data.find(
                  (p) => getBaseTestName(p.testName) === baseTestName
                );

                return {
                  ...report,
                  date: reportGroup.date || report.date,
                  fullMarks: pattern?.totalMarks || report.fullMarks || 0,
                  isPresent: report.isPresent !== false,
                };
              })
          );

          setDetailedReports(reportsWithTotalMarks);

          // Group tests by their pattern
          const grouped = groupTestsByFolder(
            reportsWithTotalMarks,
            patternsRes.data.data,
            stream
          );
          setGroupedCompetitiveTests(grouped);
        }

        // Fetch theory tests data only for PUC students
        if (shouldShowTheoryTab) {
          const theoryRes = await axios.get(
            `${process.env.REACT_APP_URL}/api/getstudenttheory/${parsedStudentData.regNumber}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (theoryRes.data.status === "success") {
            // Process student's theory test results
            const processedTheoryTests = theoryRes.data.data.map((test) => {
              const studentResult = test.studentResults.find(
                (result) => result.regNumber === parsedStudentData.regNumber
              );

              return {
                ...test,
                testType: "theory",
                subjects: studentResult.subjectMarks.map((subject) => ({
                  subjectName: subject.name,
                  scored: subject.marks,
                  totalMarks:
                    test.subjectDetails.find((s) => s.name === subject.name)
                      ?.maxMarks || 0,
                })),
                totalMarks: studentResult.totalMarks,
                percentage: studentResult.percentage,
                fullMarks: test.subjectDetails.reduce(
                  (sum, sub) => sum + sub.maxMarks,
                  0
                ),
              };
            });

            setTheoryTests(processedTheoryTests);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.response?.status === 401) {
          toast.error("Session expired. Please login again.");
          navigate("/");
        } else {
          toast.error("Failed to load reports. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [navigate]);

  const toggleFolder = (folderKey) => {
    setExpandedFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const setDateFilter = (folderKey, startDate, endDate) => {
    setFolderDates((prev) => ({
      ...prev,
      [folderKey]: { startDate, endDate },
    }));
  };

  const clearDateFilters = (folderKey) => {
    setFolderDates((prev) => ({ ...prev, [folderKey]: {} }));
  };

  const filterAndSortTests = (tests, folderKey) => {
    const { startDate, endDate } = folderDates[folderKey] || {};
    return tests
      .filter((test) => {
        if (!startDate || !endDate) return true;
        const testDate = new Date(test.date);
        return testDate >= startDate && testDate <= endDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const handleReportClick = (report) => {
    setSelectedReport(report);
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
  };

  const getSubjectChartData = () => {
    if (!selectedReport) return { barData: null, pieData: null };

    const subjectLabels =
      selectedReport.subjects?.map((sub) => sub.subjectName) || [];
    const obtainedMarks =
      selectedReport.subjects?.map(
        (sub) => sub.scored || sub.obtainedMarks || 0
      ) || [];
    const fullMarks =
      selectedReport.subjects?.map((sub) => sub.totalMarks || 0) || [];

    const barData = {
      labels: subjectLabels,
      datasets: [
        {
          label: "Obtained Marks",
          data: obtainedMarks,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: "Total Marks",
          data: fullMarks,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };

    const pieData = {
      labels: subjectLabels,
      datasets: [
        {
          data: obtainedMarks,
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    return { barData, pieData };
  };

  const { barData, pieData } = getSubjectChartData();

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPerformanceColor = (percentile) => {
    if (!percentile) return "gray";
    if (percentile < 50) return "red";
    if (percentile < 75) return "orange";
    if (percentile < 90) return "blue";
    return "green";
  };

  // const filterAndSortTests = (tests) => {
  //   return tests
  //     .filter(test => {
  //       if (!startDate || !endDate) return true;
  //       const testDate = new Date(test.date);
  //       return testDate >= startDate && testDate <= endDate;
  //     })
  //     .sort((a, b) => new Date(b.date) - new Date(a.date));
  // };

  // const clearDateFilters = () => {
  //   setStartDate(null);
  //   setEndDate(null);
  // };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-gray-600">Progress Report not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 text-white rounded-lg p-6 mb-6 shadow-md">
        <button
          onClick={() => navigate("/home")}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back To Dashboard
        </button>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {studentData?.student?.name || studentData?.studentName || "Student"}
          's Reports
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm md:text-base">
          <div>
            <span className="font-semibold">Registration No:</span>{" "}
            {studentData?.regNumber || studentData?.student?.regNumber || "N/A"}
          </div>
          <div>
            <span className="font-semibold">Stream:</span>{" "}
            {studentData?.student?.stream || "N/A"}
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
          <div className="flex items-center">
            <FaCalendarAlt className="text-gray-500 mr-2" />
            <span className="font-medium text-gray-700 mr-2">
              Filter by Date:
            </span>
          </div>
          <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
            <div className="flex items-center">
              <label className="mr-2 text-sm text-gray-600">From:</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start Date"
                className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-sm text-gray-600">To:</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End Date"
                className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tabs
          selectedIndex={activeTab}
          onSelect={(index) => setActiveTab(index)}
        >
          <TabList className="flex border-b">
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaFileAlt className="mr-2" /> Competitive Tests
            </Tab>
            {showTheoryTab && (
              <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
                <FaBook className="mr-2" /> Theory Tests
              </Tab>
            )}
          </TabList>

          {/* Competitive Tests Tab */}
          <TabPanel>
            <div className="p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Competitive Test Reports
              </h2>

              {Object.keys(groupedCompetitiveTests).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No competitive test reports available yet
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedCompetitiveTests).map(
                    ([folderName, testsByPattern]) => (
                      <div key={folderName} className="mb-6">
                        <div
                          className="cursor-pointer text-lg font-semibold text-gray-800 mb-2 flex items-center"
                          onClick={() => toggleFolder(folderName)}
                        >
                          <FaFolderOpen className="mr-2" /> {folderName}
                        </div>

                        {expandedFolders[folderName] && (
                          <div className="mb-4 ml-4">
                            {/* Folder-specific date filter */}
                            <div className="flex flex-wrap gap-4 mb-4 items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  From:
                                </span>
                                <DatePicker
                                  selected={
                                    folderDates[folderName]?.startDate || null
                                  }
                                  onChange={(date) =>
                                    setDateFilter(
                                      folderName,
                                      date,
                                      folderDates[folderName]?.endDate
                                    )
                                  }
                                  selectsStart
                                  startDate={
                                    folderDates[folderName]?.startDate || null
                                  }
                                  endDate={
                                    folderDates[folderName]?.endDate || null
                                  }
                                  className="border px-2 py-1 rounded"
                                  placeholderText="Start"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  To:
                                </span>
                                <DatePicker
                                  selected={
                                    folderDates[folderName]?.endDate || null
                                  }
                                  onChange={(date) =>
                                    setDateFilter(
                                      folderName,
                                      folderDates[folderName]?.startDate,
                                      date
                                    )
                                  }
                                  selectsEnd
                                  startDate={
                                    folderDates[folderName]?.startDate || null
                                  }
                                  endDate={
                                    folderDates[folderName]?.endDate || null
                                  }
                                  minDate={
                                    folderDates[folderName]?.startDate || null
                                  }
                                  className="border px-2 py-1 rounded"
                                  placeholderText="End"
                                />
                              </div>
                              {(folderDates[folderName]?.startDate ||
                                folderDates[folderName]?.endDate) && (
                                <button
                                  className="text-sm text-blue-600"
                                  onClick={() => clearDateFilters(folderName)}
                                >
                                  Clear Filters
                                </button>
                              )}
                            </div>

                            {/* Render test groups within this folder */}
                            {Object.entries(testsByPattern)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([baseName, group]) => (
                                <div key={baseName} className="mb-8">
                                  <h3 className="text-md font-semibold mb-2 text-gray-700 border-b pb-1">
                                    {group.fullName} ({baseName}){" "}
                                    {group.pattern && (
                                      <span className="ml-2 text-sm text-gray-500">
                                        (Total Marks: {group.pattern.totalMarks}
                                        )
                                      </span>
                                    )}
                                  </h3>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filterAndSortTests(
                                      group.tests,
                                      folderName
                                    ).map((report, idx) => (
                                      <div
                                        key={idx}
                                        onClick={() =>
                                          handleReportClick(report)
                                        }
                                        className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br ${
                                          report.isPresent === false
                                            ? "from-gray-50 to-gray-100"
                                            : "from-blue-50 to-white"
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <span className="text-sm text-gray-500">
                                            {formatDate(report.date)}
                                          </span>
                                          <div className="flex items-center">
                                            {report.isPresent === false && (
                                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium mr-2">
                                                Absent
                                              </span>
                                            )}
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                              Competitive
                                            </span>
                                          </div>
                                        </div>
                                        <h4 className="font-medium text-gray-800 mb-2">
                                          {report.testName}
                                        </h4>
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center">
                                            <MdScore className="text-yellow-500 mr-1" />
                                            <span className="font-medium">
                                              {report.overallTotalMarks} /{" "}
                                              {report.fullMarks}
                                            </span>
                                          </div>
                                          <div className="text-sm text-gray-600">
                                            {report.percentage}%
                                          </div>
                                        </div>
                                        {report.percentile && (
                                          <div className="mt-2 flex items-center">
                                            <MdEmojiEvents
                                              className={`text-${getPerformanceColor(
                                                report.percentile
                                              )}-500 mr-1`}
                                            />
                                            <span
                                              className={`text-sm text-${getPerformanceColor(
                                                report.percentile
                                              )}-600`}
                                            >
                                              {report.percentile}% Percentile
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </TabPanel>

          {/* Theory Tests Tab - only shown for PUC students */}
          {showTheoryTab && (
            <TabPanel>
              <div className="p-4 md:p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Theory Test Reports
                </h2>

                {theoryTests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No theory test reports available
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filterAndSortTests(theoryTests).map((test, index) => (
                      <div
                        key={index}
                        onClick={() => handleReportClick(test)}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-white"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-500">
                            {formatDate(test.date)}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            Theory
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-800 mb-2">
                          {test.testName}
                        </h4>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <MdScore className="text-yellow-500 mr-1" />
                            <span className="font-medium">
                              {test.totalMarks} / {test.fullMarks}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {test.percentage}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabPanel>
          )}
        </Tabs>
      </div>

      {/* Detailed Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedReport.testName}
                  </h2>
                  <p className="text-gray-600">
                    {formatDate(selectedReport.date)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedReport.testType === "theory"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {selectedReport.testType === "theory"
                      ? "Theory"
                      : "Competitive"}
                  </span>
                </div>
                <button
                  onClick={closeReportDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div
                className={`bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg shadow-sm`}
              >
                <h3 className="font-medium text-gray-800">
                  Performance Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.overallTotalMarks ||
                        selectedReport.totalMarks ||
                        0}
                    </div>
                    <div className="text-xs text-gray-500">Obtained Marks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.fullMarks}
                    </div>
                    <div className="text-xs text-gray-500">Total Marks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.percentage}%
                    </div>
                    <div className="text-xs text-gray-500">Percentage</div>
                  </div>
                  {selectedReport.testType !== "theory" && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedReport.percentile}%
                      </div>
                      <div className="text-xs text-gray-500">Percentile</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                    <FaChartBar className="mr-2 text-blue-500" /> Subject-wise
                    Marks
                  </h3>
                  {barData && (
                    <div className="h-64">
                      <Bar
                        data={barData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: "top",
                            },
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  return `${context.dataset.label}: ${context.raw}`;
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: "Marks",
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                    <FaChartPie className="mr-2 text-blue-500" /> Marks
                    Distribution
                  </h3>
                  {pieData && (
                    <div className="h-64 flex items-center justify-center">
                      <Pie
                        data={pieData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: "right",
                            },
                            tooltip: {
                              callbacks: {
                                label: function (context) {
                                  const label = context.label || "";
                                  const value = context.raw || 0;
                                  const total = context.dataset.data.reduce(
                                    (a, b) => a + b,
                                    0
                                  );
                                  const percentage = Math.round(
                                    (value / total) * 100
                                  );
                                  return `${label}: ${value} (${percentage}%)`;
                                },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Subject Performance */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <MdNotes className="mr-2 text-blue-500" /> Subject-wise
                  Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border shadow-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-3 px-4 border text-left">Subject</th>
                        <th className="py-3 px-4 border text-center">
                          Marks Obtained
                        </th>
                        <th className="py-3 px-4 border text-center">
                          Max Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.subjects?.map((subject, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-3 px-4 border">
                            {subject.subjectName || subject.name}
                          </td>
                          <td className="py-3 px-4 border text-center">
                            {subject.scored || subject.obtainedMarks || 0}
                          </td>
                          <td className="py-3 px-4 border text-center">
                            {subject.totalMarks || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleReport;
