import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AllTests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const processTestData = (reports) => {
    const testMap = {};
    
    reports.forEach(report => {
      // Skip if required fields are missing
      if (!report?.subject || !report?.testName) {
        console.warn("Skipping report with missing required fields:", report);
        return;
      }
  
      const subjectName = report.subject;
      const testName = report.testName;
      const date = new Date(report.date);
      
      if (isNaN(date.getTime())) {
        console.warn("Invalid date format:", report.date);
        return;
      }
  
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Initialize data structures if they don't exist
      if (!testMap[subjectName]) testMap[subjectName] = {};
      if (!testMap[subjectName][testName]) {
        testMap[subjectName][testName] = {
          months: {},
          subjectId: report.subject,
          testId: report.reportId    
        };
      }
      
      // Add month data
      testMap[subjectName][testName].months[monthYear] = {
        date: report.date,
        monthName: monthYear,
        marksType: report.marksType
      };
    });
    
    // Convert to final array structure
    const result = Object.entries(testMap).map(([subject, tests]) => ({
      subjectName: subject,
      tests: Object.entries(tests).map(([testName, testData]) => ({
        testName,
        subjectId: testData.subjectId,
        testId: testData.testId,
        months: Object.values(testData.months).sort((a, b) => new Date(b.date) - new Date(a.date))
      }))
    })).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    
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

        const processedTests = processTestData(response.data.data);
        
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
  }, []);

  const handleViewData = (testId, monthYear, marksType) => {
    navigate(`/reportsbymonth`, { 
      state: { 
        testId,
        monthYear,
        marksType
      }
    });
  };
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
<div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        {/* <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button> */}
        <h1 className="text-3xl font-bold">All Tests</h1>
      </div>      
      {tests.length === 0 ? (
        <p>No tests found in the database.</p>
      ) : (
        <div className="space-y-8">
          {tests.map((subjectGroup) => (
            <div key={subjectGroup.subjectName} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4">
                <h2 className="text-xl font-semibold">{subjectGroup.subjectName}</h2>
              </div>
              
              <div className="p-4 space-y-6">
                {subjectGroup.tests.map((test) => (
                  <div key={test.testName} className="border border-gray-200 rounded-md">
                    <div className="bg-gray-50 p-3 border-b border-gray-200">
                      <h3 className="font-medium">{test.testName}</h3>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      {test.months.map((month) => (
                        <div key={month.monthName} className="p-3 border-b border-gray-200 last:border-b-0 flex justify-between items-center">
                          <span className="font-medium">{month.monthName}</span>
                          <button
                            onClick={() => handleViewData(test.testId, month.monthName, month.marksType)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                          >
                            View Data
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}