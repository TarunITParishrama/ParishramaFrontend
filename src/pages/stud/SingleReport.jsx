import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FaFileAlt, FaBook, FaCalendarTimes, FaChartBar, FaChartPie, FaCalendarAlt } from 'react-icons/fa';
import { MdNotes, MdScore } from 'react-icons/md';
import { RiFileInfoFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Register ChartJS components
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
  const [unattendedTests, setUnattendedTests] = useState([]);
  const [theoryTests, setTheoryTests] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [theoryPatterns, setTheoryPatterns] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        const storedStudentData = localStorage.getItem('studentData');
        if (!storedStudentData) {
          toast.error('Student data not found. Please login again.');
          navigate('/');
          return;
        }

        const parsedStudentData = JSON.parse(storedStudentData);
        setStudentData(parsedStudentData);

        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Session expired. Please login again.');
          navigate('/');
          return;
        }

        // Fetch detailed reports (MCQ tests)
        const reportsRes = await axios.get(
          `${process.env.REACT_APP_URL}/api/students/${parsedStudentData.regNumber}/reports`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (reportsRes.data.status === "success") {
          setDetailedReports(reportsRes.data.data);
          
          // Fetch patterns for unattended MCQ tests
          const patternsRes = await axios.get(
            `${process.env.REACT_APP_URL}/api/getpatterns/type/${parsedStudentData.student.stream}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (patternsRes.data.status === "success") {
            setPatterns(patternsRes.data.data);
            
            // Identify unattended MCQ tests
            const unattended = patternsRes.data.data.filter(pattern => 
              !reportsRes.data.data.some(report => report.testName === pattern.testName)
            );
            setUnattendedTests(unattended);
          }
        }

        // Fetch theory tests data
        const theoryRes = await axios.get(
          `${process.env.REACT_APP_URL}/api/getstudenttheory/${parsedStudentData.regNumber}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Fetch theory patterns for unattended theory tests
        const theoryPatternsRes = await axios.get(
          `${process.env.REACT_APP_URL}/api/gettheorytests/${parsedStudentData.student.stream}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (theoryRes.data.status === "success" && theoryPatternsRes.data.status === "success") {
          // Process student's theory test results
          const processedTheoryTests = theoryRes.data.data.map(test => {
            const studentResult = test.studentResults.find(
              result => result.regNumber === parsedStudentData.regNumber
            );
            
            return {
              ...test,
              testType: 'theory',
              subjects: studentResult.subjectMarks.map(subject => ({
                subjectName: subject.name,
                obtainedMarks: subject.marks,
                totalMarks: test.subjectDetails.find(s => s.name === subject.name)?.maxMarks || 0
              })),
              totalMarks: studentResult.totalMarks,
              percentage: studentResult.percentage,
              fullMarks: test.subjectDetails.reduce((sum, sub) => sum + sub.maxMarks, 0)
            };
          });

          setTheoryTests(processedTheoryTests);
          setTheoryPatterns(theoryPatternsRes.data.data);

          // Identify unattended theory tests
          const unattendedTheory = theoryPatternsRes.data.data.filter(theoryTest => 
            !theoryRes.data.data.some(test => test.testName === theoryTest.testName)
          );
          
          // Combine unattended tests
          setUnattendedTests(prev => [
            ...prev,
            ...unattendedTheory.map(test => ({
              ...test,
              testType: 'theory',
              subjects: test.subjectDetails.map(sub => ({
                subject: { subjectName: sub.name },
                totalMarks: sub.maxMarks
              })),
              totalMarks: test.subjectDetails.reduce((sum, sub) => sum + sub.maxMarks, 0)
            }))
          ]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          navigate('/');
        } else {
          toast.error('Failed to load reports. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [navigate]);

  const handleReportClick = (report) => {
    setSelectedReport(report);
  };

  const closeReportDetails = () => {
    setSelectedReport(null);
  };

  const getSubjectChartData = () => {
    if (!selectedReport) return { barData: null, pieData: null };

    const subjectLabels = selectedReport.subjects?.map(sub => sub.subjectName) || [];
    const obtainedMarks = selectedReport.subjects?.map(sub => sub.obtainedMarks || sub.totalMarks) || [];
    const fullMarks = selectedReport.subjects?.map(sub => sub.totalMarks || sub.fullMarks) || [];

    const barData = {
      labels: subjectLabels,
      datasets: [
        {
          label: 'Obtained Marks',
          data: obtainedMarks,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Total Marks',
          data: fullMarks,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
      ]
    };

    const pieData = {
      labels: subjectLabels,
      datasets: [
        {
          data: obtainedMarks,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1,
        }
      ]
    };

    return { barData, pieData };
  };

  const { barData, pieData } = getSubjectChartData();

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter and sort reports by date
  const filterAndSortReports = (reports) => {
    return reports
      .filter(report => {
        if (!startDate || !endDate) return true;
        const reportDate = new Date(report.date);
        return reportDate >= startDate && reportDate <= endDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Filter and sort theory tests by date
  const filterAndSortTheoryTests = (tests) => {
    return tests
      .filter(test => {
        if (!startDate || !endDate) return true;
        const testDate = new Date(test.date);
        return testDate >= startDate && testDate <= endDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Filter and sort unattended tests by date
  const filterAndSortUnattendedTests = (tests) => {
    return tests
      .filter(test => {
        if (!startDate || !endDate) return true;
        const testDate = new Date(test.date);
        return testDate >= startDate && testDate <= endDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
  };

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
          onClick={() => navigate('/home')} 
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back To Dashboard
        </button>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {studentData?.studentName || studentData?.student?.studentName || 'Student'}'s Reports
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm md:text-base">
          <div>
            <span className="font-semibold">Registration No:</span> {studentData?.regNumber || 'N/A'}
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
          <div className="flex items-center">
            <FaCalendarAlt className="text-gray-500 mr-2" />
            <span className="font-medium text-gray-700 mr-2">Filter by Date:</span>
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
        <Tabs selectedIndex={activeTab} onSelect={(index) => setActiveTab(index)}>
          <TabList className="flex border-b">
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaFileAlt className="mr-2" /> Competitive Tests
            </Tab>
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaBook className="mr-2" /> Theory Tests
            </Tab>
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaCalendarTimes className="mr-2" /> Unattended Tests
            </Tab>
          </TabList>

          {/* Competitive Tests Tab */}
          <TabPanel>
            <div className="p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Competitive Test Reports</h2>
              
              {detailedReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No competitive test reports available yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterAndSortReports(detailedReports.flatMap(reportGroup => 
                    reportGroup.reports.map(report => ({
                      ...report,
                      date: reportGroup.date || report.date // Use group date if available
                    }))
                  )).map((report, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleReportClick(report)}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-gray-500">
                          {formatDate(report.date)}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Competitive
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800 mb-2">{report.testName}</h4>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <MdScore className="text-yellow-500 mr-1" />
                          <span className="font-medium">
                            {report.overallTotalMarks} / {report.fullMarks}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {report.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>

          {/* Theory Tests Tab */}
          <TabPanel>
            <div className="p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Theory Test Reports</h2>
              
              {theoryTests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No theory test reports available
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterAndSortTheoryTests(theoryTests).map((test, index) => (
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
                      <h4 className="font-medium text-gray-800 mb-2">{test.testName}</h4>
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

          {/* Unattended Tests Tab */}
          <TabPanel>
            <div className="p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Unattended Tests</h2>
              
              {unattendedTests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Great job! You've attended all available tests.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterAndSortUnattendedTests(unattendedTests).map((test, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-4 bg-gradient-to-br ${
                        test.testType === 'theory' ? 'from-purple-50 to-white' : 'from-blue-50 to-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-gray-500">
                          {formatDate(test.date)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          test.testType === 'theory' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {test.testType === 'theory' ? 'Theory' : 'Competitive'}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800 mb-2">{test.testName}</h4>
                      <div className="text-sm text-gray-600">
                        Total Marks: {test.totalMarks}
                      </div>
                      <div className="mt-3 text-sm">
                        <span className="font-medium">Subjects:</span> {test.subjects?.map(s => 
                          s.subject?.subjectName || s.subjectName || s.name
                        ).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </div>

      {/* Detailed Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedReport.testName}</h2>
                  <p className="text-gray-600">{formatDate(selectedReport.date)}</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedReport.testType === 'theory' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedReport.testType === 'theory' ? 'Theory' : 'Competitive'}
                  </span>
                </div>
                <button 
                  onClick={closeReportDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Performance Summary */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 transform rotate-1 shadow-md">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-800">Performance Summary</h3>
                    <p className="text-sm text-gray-600">Here's how you performed in this test</p>
                  </div>
                  <RiFileInfoFill className="text-yellow-500 text-2xl" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedReport.overallTotalMarks || selectedReport.totalMarks}
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
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                    <FaChartBar className="mr-2 text-blue-500" /> Subject-wise Marks
                  </h3>
                  {barData && (
                    <Bar 
                      data={barData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Marks'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                    <FaChartPie className="mr-2 text-blue-500" /> Marks Distribution
                  </h3>
                  {pieData && (
                    <div className="h-full flex items-center justify-center">
                      <Pie 
                        data={pieData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'right',
                            },
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Subject Performance */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <MdNotes className="mr-2 text-blue-500" /> Subject-wise Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-4 border text-left">Subject</th>
                        {selectedReport.testType !== 'theory' && (
                          <>
                            <th className="py-2 px-4 border text-center">Attempted</th>
                            <th className="py-2 px-4 border text-center">Correct</th>
                            <th className="py-2 px-4 border text-center">Wrong</th>
                            <th className="py-2 px-4 border text-center">Unattempted</th>
                          </>
                        )}
                        <th className="py-2 px-4 border text-center">Marks Obtained</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.subjects?.map((subject, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border">{subject.subjectName || subject.name}</td>
                          {selectedReport.testType !== 'theory' && (
                            <>
                              <td className="py-2 px-4 border text-center">{subject.totalQuestionsAttempted || 'N/A'}</td>
                              <td className="py-2 px-4 border text-center">{subject.correctAnswers || 'N/A'}</td>
                              <td className="py-2 px-4 border text-center">{subject.wrongAnswers || 'N/A'}</td>
                              <td className="py-2 px-4 border text-center">{subject.totalQuestionsUnattempted || 'N/A'}</td>
                            </>
                          )}
                          <td className="py-2 px-4 border text-center">
                            {subject.totalMarks || 
                             (selectedReport.subjectDetails?.find(s => s.name === (subject.subjectName || subject.name))?.maxMarks || 
                             'N/A')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Metrics for Competitive Tests */}
              {selectedReport.testType !== 'theory' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">Accuracy</h4>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-blue-600 mr-2">
                        {selectedReport.accuracy ? `${selectedReport.accuracy}%` : 'N/A'}
                      </div>
                      {selectedReport.accuracy && (
                        <div className="text-sm text-blue-500">
                          {selectedReport.accuracy >= 75 ? 'Excellent!' : 
                           selectedReport.accuracy >= 50 ? 'Good' : 'Needs improvement'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-medium text-purple-800 mb-1">Percentile</h4>
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-purple-600 mr-2">
                        {selectedReport.percentile ? `${selectedReport.percentile}%` : 'N/A'}
                      </div>
                      {selectedReport.percentile && (
                        <div className="text-sm text-purple-500">
                          {selectedReport.percentile >= 90 ? 'In Top 10%' : 
                           selectedReport.percentile >= 75 ? 'In Top 25%' : 
                           selectedReport.percentile >= 50 ? 'Above average' : 'Below average'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleReport;