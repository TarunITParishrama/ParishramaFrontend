import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getMonthDateRange } from "../../utils/dateUtils";

export default function AllTests() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [tests, setTests] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStream, setSelectedStream] = useState("LongTerm");
  const observer = useRef();

  // Infinite scroll logic
  const lastElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && page < totalPages) {
          fetchReports(page + 1);
        } else if (entries[0].isIntersecting && page >= totalPages) {
          console.log("No more pages to load.");
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, page, totalPages, selectedStream]
  );

  // Process and group reports into tests by testName
  const processTestData = (allReports) => {
    console.log("All reports before processing:", allReports);
    const testMap = {};
    const longTermReports = allReports.filter((r) => r.stream === "LongTerm");
    console.log("LongTerm reports:", longTermReports);
    allReports.forEach((report) => {
      // Skip if essential fields are missing
      if (!report || !report.testName || !report.date) {
        console.warn("Skipping report with missing fields:", report);
        return;
      }

      // Skip if stream doesn't match
      if (report.stream !== selectedStream) {
        return;
      }

      const date = new Date(report.date);

      // Skip if date is invalid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date in report:", report);
        return;
      }

      const monthYear = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!testMap[report.testName]) {
        testMap[report.testName] = {
          months: {},
          testId: report.reportId,
          stream: report.stream,
        };
      }

      testMap[report.testName].months[monthYear] = {
        date: report.date,
        monthName: monthYear,
        marksType: report.marksType,
      };
    });

    return Object.entries(testMap)
      .map(([testName, testData]) => ({
        testName,
        testId: testData.testId,
        stream: testData.stream,
        months: Object.values(testData.months).sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        ),
      }))
      .sort((a, b) => a.testName.localeCompare(b.testName));
  };

  const fetchReports = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getallreports?page=${pageNum}&limit=50`
      );
      console.log("API Response:", response.data);
      const newReports = response.data.data;
      console.log("New reports:", newReports);
      const allReports = [...reports, ...newReports];

      setReports(allReports);
      setPage(pageNum);
      setTotalPages(response.data.totalPages);
      setError("");

      const processedTests = processTestData(allReports);
      setTests(processedTests);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch first page or reset when stream changes
  useEffect(() => {
    setReports([]);
    setTests([]);
    setPage(1);
    setTotalPages(1);
    fetchReports(1);
  }, [selectedStream]);

  const handleViewData = (testName, date) => {
    const { dateFrom, dateTo } = getMonthDateRange(date);
    navigate(`/home/reportsbymonth`, {
      state: {
        testName,
        dateFrom,
        dateTo,
        stream: selectedStream,
      },
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">All Reports</h1>
      </div>

      {/* Stream Selection */}
      <div className="flex space-x-4 my-4 p-4 bg-gray-50 rounded-lg">
        {["LongTerm", "PUC"].map((stream) => (
          <label key={stream} className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600"
              name="stream"
              value={stream}
              checked={selectedStream === stream}
              onChange={() => setSelectedStream(stream)}
            />
            <span className="ml-2">{stream}</span>
          </label>
        ))}
      </div>

      {/* Loading/Error UI */}
      {loading && page === 1 ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
      ) : tests.length === 0 ? (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
          No tests found for {selectedStream} stream.
        </div>
      ) : (
        <div className="space-y-6">
          {tests.map((test, index) => (
            <div
              key={test.testName}
              ref={index === tests.length - 1 ? lastElementRef : null}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-100 p-4">
                <h2 className="text-xl font-semibold">{test.testName}</h2>
              </div>
              <div className="p-4">
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {test.months.map((month) => (
                    <div
                      key={month.monthName}
                      className="p-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center hover:bg-gray-50"
                    >
                      <div>
                        <span className="font-medium">{month.monthName}</span>
                        <span className="ml-4 text-sm text-gray-500">
                          {month.marksType}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleViewData(test.testName, month.date)
                        }
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                      >
                        View Data
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Infinite Scroll Spinner */}
          {loading && page > 1 && (
            <div className="text-center py-4 text-blue-600 font-semibold animate-pulse">
              Loading more reports...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
