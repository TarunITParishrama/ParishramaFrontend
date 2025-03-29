import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

export default function ReportsByMonth() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { testId, monthYear, marksType } = state || {};
  const [reports, setReports] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [testName, setTestName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!testId || !monthYear) {
      navigate("/tests");
      return;
    }
  
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. First get the test details including name
        const reportResponse = await axios.get(`http://localhost:5000/api/getreport/${testId}`);
        console.log('Report response:', reportResponse.data); // Debug
        
        if (!reportResponse.data?.data) {
          throw new Error("Test details not found");
        }
        
        setTestName(reportResponse.data.data.testName || "Unknown Test");
        
        // 2. Fetch all reports for this test
        const reportsResponse = await axios.get(`http://localhost:5000/api/getreportbank?reportRef=${testId}`);
        console.log('Reports response:', reportsResponse.data);
        // 3. Filter by month
        const [selectedMonth, selectedYear] = monthYear.split(' ');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = monthNames.indexOf(selectedMonth);
        
        const monthReports = reportsResponse.data.data.filter(report => {
          if (!report.date) return false;
          const reportDate = new Date(report.date);
          return (
            reportDate.getMonth() === monthIndex && 
            reportDate.getFullYear() === parseInt(selectedYear)
          );
        });
        
        if (monthReports.length === 0) {
          throw new Error(`No reports found for ${monthYear}`);
        }
        
        setReports(monthReports);
        
        // 4. Fetch corresponding solutions
        const solutionsResponse = await axios.get(
          `http://localhost:5000/api/getsolutionbank?solutionRef=${testId}`
        );
        
        if (!solutionsResponse.data.data || solutionsResponse.data.data.length === 0) {
          throw new Error("No solutions found for this test");
        }
        
        const sortedSolutions = solutionsResponse.data.data.sort((a, b) => a.questionNumber - b.questionNumber);
        console.log("Sorted Solutions", sortedSolutions);
        setSolutions(sortedSolutions);
        
        // 5. Calculate student results
        calculateResults(monthReports, sortedSolutions, marksType);
        
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testId, monthYear, marksType, navigate]);

  const calculateResults = (reports, solutions, marksType) => {
    const results = [];
    const totalQuestions = solutions.length;
    
    // Create solution map for quick lookup
    const solutionMap = {};
    solutions.forEach(sol => {
      solutionMap[sol.questionNumber] = sol.correctOption;
    });
    
    reports.forEach(report => {
      let corrAns = 0;
      let wroAns = 0;
      let unattempted = 0;
      let totalMarks = 0;
      
      // Process marked answers
      const markedOptions = report.markedOptions || {};
      Object.entries(markedOptions).forEach(([qNum, markedOption]) => {
        const correctOption = solutionMap[parseInt(qNum)];
        if (correctOption === undefined) return;
        
        if (markedOption === null || markedOption === undefined) {
          unattempted++;
        } else if (markedOption === correctOption) {
          corrAns++;
          totalMarks += marksType.includes("+4") ? 4 : 1;
        } else {
          wroAns++;
          totalMarks += marksType.includes("-1") ? -1 : 0;
        }
      });
      
      // Count unmarked questions
      const attempted = Object.keys(markedOptions).length;
      unattempted += (totalQuestions - attempted);
      
      // Calculate metrics
      const accuracy = totalQuestions > 0 ? Math.round((corrAns / totalQuestions) * 100) : 0;
      const maxPossibleMarks = totalQuestions * (marksType.includes("+4") ? 4 : 1);
      const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 100) : 0;
      
      results.push({
        regNumber: report.regNumber,
        correctAnswers: corrAns,
        wrongAnswers: wroAns,
        unattempted,
        totalMarks,
        accuracy,
        percentage,
        percentile: 0
      });
    });
    
    // Calculate percentiles
    if (results.length > 0) {
      const sortedByMarks = [...results].sort((a, b) => b.totalMarks - a.totalMarks);
      sortedByMarks.forEach((result, index) => {
        result.percentile = Math.round(((sortedByMarks.length - index - 1) / sortedByMarks.length) * 100);
      });
      
      // Update original results with percentiles
      const resultMap = {};
      sortedByMarks.forEach((res, idx) => {
        resultMap[res.regNumber] = res.percentile;
      });
      
      results.forEach(res => {
        res.percentile = resultMap[res.regNumber];
      });
    }
    
    setStudentResults(results);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => navigate("/tests")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }
  const handleSubmit = async () => {
    try {
      setSubmitLoading(true);
      setSubmitSuccess(false);
      setError("");
  
      console.log('[SUBMIT] Starting submission process');
  
      // 1. Fetch complete report data (unchanged)
      const allReportsResponse = await axios.get("http://localhost:5000/api/getallreports");
      if (!allReportsResponse.data?.data) {
        throw new Error("Invalid response structure from getallreports API");
      }
      const completeReports = allReportsResponse.data.data;
  
      // 2. Filter relevant reports (unchanged)
      const [selectedMonth, selectedYear] = monthYear.split(' ');
      const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(selectedMonth);
  
      const filteredReports = completeReports.filter(report => {
        if (!report.date) return false;
        const reportDate = new Date(report.date);
        return (
          report.reportId === testId &&
          reportDate.getMonth() === monthIndex && 
          reportDate.getFullYear() === parseInt(selectedYear)
        );
      });
  
      if (filteredReports.length === 0) {
        throw new Error(`No reports found for ${monthYear} matching test ${testId}`);
      }
  
      // 3. Validate and prepare submissions with zero-value handling
      const submissionPromises = filteredReports.map((report) => {
        const studentResult = studentResults.find(r => r.regNumber === report.regNumber);
        if (!studentResult) {
          throw new Error(`No results found for student ${report.regNumber}`);
        }
  
        // Safely handle zero values by checking typeof number
        const safeNumber = (value) => typeof value === 'number' ? value.toString() : value;
  
        // Prepare payload with zero-value protection
        const payload = {
          regNumber: report.regNumber || '',
          subject: report.subject || '',
          chapter: report.chapter || '',
          subtopic: report.subtopic || '',
          testName: report.testName || '',
          date: report.date || new Date().toISOString(),
          marksType: report.marksType || marksType,
          totalQuestions: safeNumber(solutions.length),
          correctAnswers: safeNumber(studentResult.correctAnswers),
          wrongAnswers: safeNumber(studentResult.wrongAnswers),
          unattempted: safeNumber(studentResult.unattempted),
          accuracy: safeNumber(studentResult.accuracy),
          percentile: safeNumber(studentResult.percentile),
          totalMarks: safeNumber(studentResult.totalMarks),
          responses: solutions.map(solution => ({
            questionNumber: safeNumber(solution.questionNumber),
            markedOption: report.markedOptions?.[solution.questionNumber] ?? null,
            correctOption: solution.correctOption,
            isCorrect: report.markedOptions?.[solution.questionNumber] === solution.correctOption
          }))
        };
  
        console.log(`[SUBMIT] Payload for ${report.regNumber}:`, payload);
  
        return axios.post("http://localhost:5000/api/createstudentreports", payload)
          .then(response => ({ success: true, regNumber: report.regNumber }))
          .catch(error => {
            console.error(`Submission failed for ${report.regNumber}:`, error.response?.data || error.message);
            return { 
              success: false, 
              regNumber: report.regNumber,
              error: error.response?.data?.message || error.message
            };
          });
      });
  
      // 4. Execute all submissions (unchanged)
      const results = await Promise.all(submissionPromises);
      const failed = results.filter(r => !r.success);
  
      if (failed.length > 0) {
        throw new Error(`${failed.length} submissions failed. First error: ${failed[0].error}`);
      }
  
      setSubmitSuccess(true);
      
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };
  const renderSubmitButton = () => (
    <div className="mt-6 flex justify-end">
      <button
        onClick={handleSubmit}
        disabled={submitLoading || studentResults.length === 0}
        className={`px-6 py-2 rounded-md text-white font-medium ${
          submitLoading ? 'bg-gray-400' : 'bg-yellow-400 hover:bg-red-500'
        } transition`}
      >
        {submitLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-sm text-gray-600 mt-2">
              Submitting reports... (check console for details)
            </div>
            Submitting...
          </span>
        ) : (
          'Submit Results'
        )}
        {error && (
           <div className="text-red-500 mt-2">
           {error}
         </div>
        )}
      </button>
      {submitSuccess && (
        <div className="ml-4 flex items-center text-green-600">
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Results submitted successfully!
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white p-6">
          <div>
            <h1 className="text-2xl font-bold">{testName}</h1>
            <p className="text-white">
              {monthYear} | Marking Scheme: {marksType}
              {marksType.includes("+4") ? " (+4/-1)" : " (+1/0)"}
            </p>
          </div>
          <button
            onClick={() => navigate("/tests")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Back to Tests
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wrong</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unattempted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentile</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentResults.map((result, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.regNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{result.correctAnswers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{result.wrongAnswers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.unattempted}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.totalMarks}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{result.accuracy}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">{result.percentage}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{result.percentile}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderSubmitButton()}
      </div>
    </div>
  );
}