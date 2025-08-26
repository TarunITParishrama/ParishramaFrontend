import React, { useState, useEffect } from "react";
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

  // Process and group reports into tests by testName.
  // Guarantees: month entry keeps latest date for that month; tests sorted by latest report date desc.
  const processTestData = (allReports) => {
    const testMap = {};

    for (const report of allReports) {
      if (!report || !report.testName || !report.date) continue;
      if (report.stream !== selectedStream) continue;

      const dateObj = new Date(report.date);
      if (isNaN(dateObj.getTime())) continue;

      const monthYear = dateObj.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      if (!testMap[report.testName]) {
        testMap[report.testName] = {
          months: {},
          testId: report._id,
          stream: report.stream,
          latest: dateObj,
        };
      }

      // Update test's latest date & testId if this report is newer
      if (dateObj > new Date(testMap[report.testName].latest)) {
        testMap[report.testName].latest = dateObj;
        testMap[report.testName].testId = report._id;
      }

      // For a given month, keep the report with the latest date (don't let older pages override)
      const existingMonth = testMap[report.testName].months[monthYear];
      if (!existingMonth || dateObj > new Date(existingMonth.date)) {
        testMap[report.testName].months[monthYear] = {
          date: report.date,
          monthName: monthYear,
          marksType: report.marksType,
        };
      }
    }

    const testsArray = Object.entries(testMap).map(([testName, data]) => ({
      testName,
      testId: data.testId,
      stream: data.stream,
      months: Object.values(data.months).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      ),
      latest: data.latest,
    }));

    // Sort tests by latest report date (newest tests first)
    testsArray.sort((a, b) => new Date(b.latest) - new Date(a.latest));

    // remove 'latest' key if you don't want it exposed to UI
    return testsArray;
  };

  const fetchReports = async (pageNum) => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/reports`, {
        params: { stream: selectedStream, page: pageNum, limit: 30, sort: "desc" },
      });

      if (response.data.status === "success") {
        const newReports = response.data.data || [];

        // Use functional update to avoid stale 'reports' state
        setReports((prev) => {
          // combine previous + new
          const combined = pageNum === 1 ? newReports.slice() : [...prev, ...newReports];

          // Ensure newest-first ordering by date (guard vs backend order)
          combined.sort((a, b) => new Date(b.date) - new Date(a.date));

          // Deduplicate by _id (preserve first occurrence -> newest-first)
          const seen = new Set();
          const deduped = [];
          for (const r of combined) {
            if (!r || !r._id) continue;
            if (!seen.has(r._id)) {
              seen.add(r._id);
              deduped.push(r);
            }
          }

          // Update paging metadata (safe to set outside setReports but keeping here to use response values)
          setPage(response.data.page);
          setTotalPages(response.data.totalPages);
          setError("");

          // Recompute grouped tests from deduped reports
          const processed = processTestData(deduped);
          setTests(processed);

          return deduped;
        });
      } else {
        setError("Failed to fetch reports");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  // Reset & fetch when stream changes
  useEffect(() => {
    setReports([]);
    setTests([]);
    setPage(1);
    setTotalPages(1);
    fetchReports(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {tests.map((test) => (
            <div
              key={test.testName}
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
                        onClick={() => handleViewData(test.testName, month.date)}
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

          {/* Load More Button */}
          {page < totalPages && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => fetchReports(page + 1)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
