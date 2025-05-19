import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AllTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStream, setSelectedStream] = useState("LongTerm");

  const processTestData = (reports) => {
    const testMap = {};
    
    reports.forEach(report => {
      // Skip if required fields are missing
      if (!report?.testName || !report?.date) {
        console.warn("Skipping report with missing required fields:", report);
        return;
      }
  
      const testName = report.testName;
      const date = new Date(report.date);
      
      if (isNaN(date.getTime())) {
        console.warn("Invalid date format:", report.date);
        return;
      }
  
      const monthYear = date.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      // Initialize data structure if it doesn't exist
      if (!testMap[testName]) {
        testMap[testName] = {
          months: {},
          testId: report.reportId,
          stream: report.stream
        };
      }
      
      // Add month data
      testMap[testName].months[monthYear] = {
        date: report.date,
        monthName: monthYear,
        marksType: report.marksType
      };
    });
    
    // Convert to final array structure
    const result = Object.entries(testMap).map(([testName, testData]) => ({
      testName,
      testId: testData.testId,
      stream: testData.stream,
      months: Object.values(testData.months).sort((a, b) => new Date(b.date) - new Date(a.date))
    })).sort((a, b) => a.testName.localeCompare(b.testName));
    
    console.log("Processed result:", result);
    return result;
  };

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/getallreports`);
        
        if (!response.data?.data) {
          throw new Error("Invalid API response structure");
        }

        // Filter reports by selected stream
        const filteredReports = response.data.data.filter(
          report => report.stream === selectedStream
        );

        const processedTests = processTestData(filteredReports);
        
        if (processedTests.length === 0 && response.data.data.length > 0) {
          throw new Error("Data processing failed - check console for warnings");
        }

        setTests(processedTests);
        setError("");
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [selectedStream]);

  const handleViewData = (testName, date) => {
    navigate(`/home/reportsbymonth`, { 
      state: { 
        testName,
        date,
        stream: selectedStream
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">All Reports</h1>
      </div>

      {/* Stream Selection Radio Buttons */}
      <div className="flex space-x-4 my-4 p-4 bg-gray-50 rounded-lg">
        <label className="inline-flex items-center">
          <input
            type="radio"
            className="form-radio text-blue-600"
            name="stream"
            value="LongTerm"
            checked={selectedStream === "LongTerm"}
            onChange={() => setSelectedStream("LongTerm")}
          />
          <span className="ml-2">Long Term</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            className="form-radio text-blue-600"
            name="stream"
            value="PUC"
            checked={selectedStream === "PUC"}
            onChange={() => setSelectedStream("PUC")}
          />
          <span className="ml-2">PUC</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      ) : tests.length === 0 ? (
        <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
          No tests found for {selectedStream} stream.
        </div>
      ) : (
        <div className="space-y-6">
          {tests.map((test) => (
            <div key={test.testName} className="border border-gray-200 rounded-lg overflow-hidden">
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
        </div>
      )}
    </div>
  );
}