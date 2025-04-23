
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import crown from "../../assets/crown.png";
import * as XLSX from "xlsx";
import { toast } from 'react-toastify';

export default function ReportsByMonth() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { testName, date, stream } = state || {};
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [groupedReports, setGroupedReports] = useState({});

  useEffect(() => {
    if (!testName || !date || !stream) {
      navigate("/tests");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Get date range for the month
        const dateObj = new Date(date);
        const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
        const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
        
        // Fetch reports
        const reportsResponse = await axios.get(`${process.env.REACT_APP_URL}/api/getreportbank`, {
          params: {
            testName,
            stream,
            dateFrom: monthStart.toISOString(),
            dateTo: monthEnd.toISOString()
          }
        });
        
        if (!reportsResponse.data?.data || reportsResponse.data.data.length === 0) {
          throw new Error(`No reports found for ${testName}, ${stream}, ${dateObj.toLocaleDateString()}`);
        }
        
        const groupedByDate = {};
        const sortedReports = [...reportsResponse.data.data].sort((a, b) => {
          return a.regNumber.localeCompare(b.regNumber);
        });
        
        sortedReports.forEach(report => {
          if (!report.date) return;
          
          const reportDate = new Date(report.date).toISOString().split('T')[0];
          
          if (!groupedByDate[reportDate]) {
            groupedByDate[reportDate] = {
              reports: [],
              regNumbers: new Set(),
              marksType: report.marksType
            };
          }
          
          if (!groupedByDate[reportDate].regNumbers.has(report.regNumber)) {
            groupedByDate[reportDate].regNumbers.add(report.regNumber);
            groupedByDate[reportDate].reports.push(report);
          }
        });
        
        setGroupedReports(groupedByDate);
        
        // Fetch solutions
        const solutionsResponse = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank`,
          { params: { testName, stream } }
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
  }, [testName, date, stream, navigate]);

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="ml-2 bg-yellow-600 text-white px-2 py-1 rounded-full text-xs inline-flex items-center">
          TOP 1
          <img src={crown} className="w-3 h-3 ml-1 -mt-px" alt="crown" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="ml-2 bg-gray-500 text-white px-2 py-1 rounded-full text-xs">
          TOP 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="ml-2 bg-yellow-700 text-white px-2 py-1 rounded-full text-xs">
          TOP 3
        </span>
      );
    }
    return null;
  };
  
  const calculateResults = (reports, solutions, marksType) => {
    const results = [];
    const totalQuestions = solutions.length;
    const isCompetitive = marksType.includes("+4");
    const correctMark = isCompetitive ? 4 : 1;
    const wrongMark = isCompetitive ? -1 : 0;
    
    // Create a map for quick solution lookup by question number
    const solutionMap = {};
    solutions.forEach(solution => {
      solutionMap[solution.questionNumber] = {
        correctOptions: solution.correctOptions || [],
        isGrace: solution.isGrace || false
      };
    });
  
    reports.forEach(report => {
      let corrAns = 0;
      let wroAns = 0;
      let totalMarks = 0;
      let unattemptedCount = 0;
      
      const questionAnswers = report.questionAnswers instanceof Map 
        ? Object.fromEntries(report.questionAnswers) 
        : report.questionAnswers || {};
      
      // Check each question
      for (let qNum in questionAnswers) {
        const markedOption = questionAnswers[qNum]?.trim();
        const solution = solutionMap[qNum];
        
        if (!markedOption || markedOption === '') {
          unattemptedCount++;
          continue;
        }
  
        if (solution) {
          if (solution.isGrace) {
            // Grace mark - any marked option is correct
            corrAns++;
            totalMarks += correctMark;
          } else if (solution.correctOptions.includes(markedOption)) {
            // Correct option marked
            corrAns++;
            totalMarks += correctMark;
          } else {
            // Wrong option marked
            wroAns++;
            totalMarks += wrongMark;
          }
        } else {
          // No solution found for this question - treat as unattempted
          unattemptedCount++;
        }
      }
      
      // Handle questions not answered at all (unattempted)
      const answeredQuestions = Object.keys(questionAnswers).filter(q => questionAnswers[q]?.trim() !== '');
      unattemptedCount += totalQuestions - answeredQuestions.length;
      
      const accuracy = corrAns + wroAns > 0 
        ? (corrAns / (corrAns + wroAns)) * 100 
        : 0;
      
      const maxPossibleMarks = totalQuestions * correctMark;
      const percentage = maxPossibleMarks > 0 
        ? (totalMarks / maxPossibleMarks) * 100 
        : 0;
      
      results.push({
        regNumber: report.regNumber,
        correctAnswers: corrAns,
        wrongAnswers: wroAns,
        unattempted: unattemptedCount,
        totalMarks,
        accuracy,
        percentage,
        percentile: 0,
        date: report.date,
        rank: 0
      });
    });
  
    // Calculate ranks and percentiles
    if (results.length > 0) {
      const sortedByMarks = [...results].sort((a, b) => b.totalMarks - a.totalMarks);
      let currentRank = 1;
      
      for (let i = 0; i < sortedByMarks.length; i++) {
        if (i > 0 && sortedByMarks[i].totalMarks < sortedByMarks[i-1].totalMarks) {
          currentRank = i + 1;
        }
        sortedByMarks[i].rank = currentRank;
      }
      
      const totalStudents = sortedByMarks.length;
      sortedByMarks.forEach(result => {
        result.percentile = ((totalStudents - result.rank) / totalStudents) * 100;
      });
      
      const percentileMap = {};
      const rankMap = {};
      sortedByMarks.forEach(res => {
        percentileMap[res.regNumber] = res.percentile;
        rankMap[res.regNumber] = res.rank;
      });
      
      results.forEach(res => {
        res.percentile = percentileMap[res.regNumber] || 0;
        res.rank = rankMap[res.regNumber] || 0;
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
      const token = localStorage.getItem('token');
      // First check for existing reports
      const checkResponse = await axios.post(`${process.env.REACT_APP_URL}/api/checkexistingreports`,
        {
        reports: dateReports.map(report => ({
          regNumber: report.regNumber,
          testName: report.testName || testName,
          stream: report.stream || stream,
          date: report.date
        }))
      },
    {
      headers:{
        Authorization: `Bearer ${token}`
      }
    }
    );
  
      const { existingCount } = checkResponse.data;
  
      // Show confirmation only if updates will occur
      if (existingCount > 0) {
        const confirm = window.confirm(
          `This will update ${existingCount} existing reports and create ${dateReports.length - existingCount} new ones. Continue?`
        );
        if (!confirm) {
          setSubmitLoading(false);
          return;
        }
      }
  
      // Prepare payload
      const reportsPayload = dateReports.map((report, index) => {
        const studentResult = dateResults[index];
        
        const questionAnswers = report.questionAnswers instanceof Map 
          ? Object.fromEntries(report.questionAnswers) 
          : report.questionAnswers || {};
  
        const safeNumber = (value) => typeof value === 'number' ? value.toString() : value;
  
        return {
          regNumber: report.regNumber || '',
          stream: report.stream || stream,
          testName: report.testName || testName,
          date: report.date || new Date().toISOString(),
          marksType: report.marksType || marksType,
          totalQuestions: safeNumber(solutions.length),
          correctAnswers: safeNumber(studentResult.correctAnswers),
          wrongAnswers: safeNumber(studentResult.wrongAnswers),
          unattempted: safeNumber(studentResult.unattempted),
          accuracy: safeNumber(studentResult.accuracy.toFixed(2)),
          percentage: safeNumber(studentResult.percentage.toFixed(2)),
          percentile: safeNumber(studentResult.percentile.toFixed(2)),
          totalMarks: safeNumber(studentResult.totalMarks),
          responses: solutions.map(solution => ({
            questionNumber: safeNumber(solution.questionNumber),
            markedOption: questionAnswers[solution.questionNumber] || null,
            correctOptions: solution.correctOptions,
            isGrace: solution.isGrace || false,
            isCorrect: solution.isGrace || solution.correctOptions.includes(questionAnswers[solution.questionNumber] || '')
          }))
        };
      });
  
      // Submit bulk operation
      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/bulkstudentreports`,
        { reports: reportsPayload }
      );
  
      setSubmitSuccess(true);
      toast.success(
        `Successfully processed ${reportsPayload.length} reports (${response.data.data.created} created, ${response.data.data.updated} updated)`,
        { position: "top-right", autoClose: 5000 }
      );
      
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || err.message);
      toast.error(
        err.response?.data?.message || err.message || "Failed to submit reports",
        { position: "top-right", autoClose: 5000 }
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const downloadCSV = (date, reports, marksType) => {
    const dateResults = calculateResults(reports, solutions, marksType);
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Prepare data for CSV
    const csvData = [
      ["Test Name", testName],
      ["Date", formattedDate],
      ["Stream", stream],
      ["Marking Scheme", marksType],
      [], // Empty row
      ["Reg No", "Wrong Answers", "Unattempted", "Correct Answers", "Total Marks", "Accuracy", "Percentage", "Percentile"]
    ];

    dateResults.forEach(result => {
      csvData.push([
        result.regNumber,
        result.wrongAnswers,
        result.unattempted,
        result.correctAnswers,
        result.totalMarks,
        result.accuracy.toFixed(2),
        result.percentage.toFixed(2),
        result.percentile.toFixed(2)
      ]);
    });

    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(csvData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    
    // Generate file name
    const fileName = `${testName.replace(/\s+/g, '_')}_${formattedDate.replace(/\s+/g, '_')}_results.xlsx`;
    
    // Download the file
    XLSX.writeFile(wb, fileName);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wrong</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentile</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dateResults.map((result, index) => {
                const attempted = result.correctAnswers + result.wrongAnswers;
                const totalQuestions = solutions.length;
                
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.regNumber} {renderRankBadge(result.rank)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {attempted}/{totalQuestions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm bg-green-600 text-white font-semibold">
                      {result.correctAnswers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm bg-red-600 text-white font-semibold">
                      {result.wrongAnswers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      {result.totalMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {result.accuracy.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">
                      {result.percentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">
                      {result.percentile.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => downloadCSV(date, reports, marksType)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Results (Excel)
            </button>

            <div className="flex items-center">
              {submitSuccess && (
                <div className="mr-4 flex items-center text-green-600">
                  <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Results submitted successfully!
                </div>
              )}
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
            </div>
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
            onClick={() => navigate('/home/reports')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Back to Reports
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
          </div>
          <button
            onClick={() => navigate("/home/reports")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Back to Reports
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