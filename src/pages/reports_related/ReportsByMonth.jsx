import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

export default function ReportsByMonth() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { testId, monthYear } = state || {}; // Removed marksType from props
  const [solutions, setSolutions] = useState([]);
  const [testName, setTestName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [groupedReports, setGroupedReports] = useState({});

  const getMonthRange = (monthYear) => {
    const [monthStr, yearStr] = monthYear.split(' ');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.indexOf(monthStr);
    const year = parseInt(yearStr);
    
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    };
  };

  useEffect(() => {
    if (!testId || !monthYear) {
      navigate("/tests");
      return;
    }
  
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        const reportResponse = await axios.get(`${process.env.REACT_APP_URL}/api/getreport/${testId}`);
        if (!reportResponse.data?.data) throw new Error("Test details not found");
        
        const testData = reportResponse.data.data;
        const fetchedTestName = testData.testName || "Unknown Test";
        const fetchedSubject = testData.subject?.subjectName || testData.subject || "Unknown Subject";
        
        setTestName(fetchedTestName);
        setSubjectName(fetchedSubject);
        
        const { start, end } = getMonthRange(monthYear);
        
        const reportsResponse = await axios.get(`${process.env.REACT_APP_URL}/api/getreportbank`, {
          params: {
            reportRef: testId,
            testName: fetchedTestName,
            subject: fetchedSubject,
            dateFrom: start,
            dateTo: end
          }
        });
        
        if (!reportsResponse.data?.data || reportsResponse.data.data.length === 0) {
          throw new Error(`No reports found for ${fetchedTestName}, ${fetchedSubject}, ${monthYear}`);
        }
        
        const groupedByDate = {};
        
        reportsResponse.data.data.forEach(report => {
          if (!report.date) return;
          
          const reportDate = new Date(report.date).toISOString().split('T')[0];
          
          if (!groupedByDate[reportDate]) {
            groupedByDate[reportDate] = {
              reports: [],
              regNumbers: new Set(),
              marksType: report.marksType // Store marksType for each date
            };
          }
          
          if (!groupedByDate[reportDate].regNumbers.has(report.regNumber)) {
            groupedByDate[reportDate].regNumbers.add(report.regNumber);
            groupedByDate[reportDate].reports.push(report);
          }
        });
        
        setGroupedReports(groupedByDate);
        
        const solutionsResponse = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank?solutionRef=${testId}`
        );
        
        if (!solutionsResponse.data.data || solutionsResponse.data.data.length === 0) {
          throw new Error("No solutions found for this test");
        }
        
        const sortedSolutions = solutionsResponse.data.data.sort((a, b) => 
          a.questionNumber - b.questionNumber
        );
        setSolutions(sortedSolutions);
        
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch data");
        setGroupedReports({});
        setSolutions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testId, monthYear, navigate]);

  const calculateResults = (reports, solutions, marksType) => {
    const results = [];
    const totalQuestions = solutions.length;
    
    const solutionMap = {};
    solutions.forEach(sol => {
      solutionMap[sol.questionNumber] = sol.correctOption;
    });
    
    reports.forEach(report => {
      let corrAns = 0;
      let wroAns = 0;
      let totalMarks = 0;
      
      const unattemptedCount = report.unmarkedOptions ? 
        (Array.isArray(report.unmarkedOptions) ? report.unmarkedOptions.length : 
         typeof report.unmarkedOptions === 'object' ? Object.keys(report.unmarkedOptions).length :
         0) : 0;

      const markedOptions = report.markedOptions || {};
      Object.entries(markedOptions).forEach(([qNum, markedOption]) => {
        const correctOption = solutionMap[parseInt(qNum)];
        if (correctOption === undefined) return;
  
        if (markedOption === correctOption) {
          corrAns++;
          // Use the marksType from the report for calculations
          totalMarks += marksType.includes("+4") ? 4 : 1;
        } else {
          wroAns++;
          totalMarks += marksType.includes("-1") ? -1 : 0;
        }
      });
            
      const accuracy = totalQuestions > 0 ? Math.round((corrAns / totalQuestions) * 100) : 0;
      const maxPossibleMarks = totalQuestions * (marksType.includes("+4") ? 4 : 1);
      const percentage = maxPossibleMarks > 0 ? Math.round((totalMarks / maxPossibleMarks) * 100) : 0;
      
      results.push({
        regNumber: report.regNumber,
        correctAnswers: corrAns,
        wrongAnswers: wroAns,
        unattempted: unattemptedCount,
        totalMarks,
        accuracy,
        percentage,
        percentile: 0,
        date: report.date
      });
    });
    
    if (results.length > 0) {
      const sortedByMarks = [...results].sort((a, b) => b.totalMarks - a.totalMarks);
      sortedByMarks.forEach((result, index) => {
        result.percentile = Math.round(((sortedByMarks.length - index - 1) / sortedByMarks.length) * 100);
      });
      
      const resultMap = {};
      sortedByMarks.forEach((res, idx) => {
        resultMap[res.regNumber] = res.percentile;
      });
      
      results.forEach(res => {
        res.percentile = resultMap[res.regNumber];
      });
    }
    
    return results;
  };

  const handleSubmit = async (date, marksType) => {
    try {
      setSubmitLoading(true);
      setSubmitSuccess(false);
      setError("");
  
      const dateReports = groupedReports[date]?.reports || [];
      if (dateReports.length === 0) {
        throw new Error(`No reports found for ${date}`);
      }
      
      const dateResults = calculateResults(dateReports, solutions, marksType);
      
      const submissionPromises = dateReports.map(async (report) => {
        const studentResult = dateResults.find(r => r.regNumber === report.regNumber);
        if (!studentResult) {
          throw new Error(`No results found for student ${report.regNumber}`);
        }
  
        const safeNumber = (value) => typeof value === 'number' ? value.toString() : value;
  
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
  
        try {
          const response = await axios.post(`${process.env.REACT_APP_URL}/api/createstudentreports`, payload);
          return { success: true, regNumber: report.regNumber };
        } catch (error) {
          console.error(`Submission failed for ${report.regNumber}:`, error);
          return { 
            success: false, 
            regNumber: report.regNumber,
            error: error.response?.data?.message || error.message
          };
        }
      });
  
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

  const renderDateTables = () => {
    return Object.entries(groupedReports).map(([date, { reports, marksType }]) => {
      const dateResults = calculateResults(reports, solutions, marksType);
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return (
        <div key={date} className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">{formattedDate}</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Marking Scheme: {marksType}
            </span>
          </div>
          
          <div className="overflow-x-auto mb-4">
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
                {dateResults.map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.regNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm bg-green-600 text-white font-semibold">{result.correctAnswers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm bg-red-600 text-white font-semibold">{result.wrongAnswers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm bg-yellow-500 text-white font-semibold">{result.unattempted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">{result.totalMarks}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">{result.accuracy}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">{result.percentage}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">{result.percentile}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleSubmit(date, marksType)}
              disabled={submitLoading || dateResults.length === 0}
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
                  Submitting...
                </span>
              ) : (
                `Submit Results for ${formattedDate}`
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
          {error && (
            <div className="text-red-500 mt-2">
              {error}
            </div>
          )}
        </div>
      );
    });
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white p-6">
          <div>
            <h1 className="text-2xl font-bold">{testName}</h1>
            <p className="text-white">
              {monthYear} | Subject: {subjectName}
            </p>
          </div>
          <button
            onClick={() => navigate("/tests")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Back to Tests
          </button>
        </div>

        {Object.keys(groupedReports).length > 0 ? (
          renderDateTables()
        ) : (
          <p>No test data available for this month.</p>
        )}
      </div>
    </div>
  );
}