import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { FaFileAlt, FaCalendarTimes, FaCalendarCheck, FaChartBar, FaChartPie } from 'react-icons/fa';
import { MdNotes, MdScore } from 'react-icons/md';
import { RiFileInfoFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [patterns, setPatterns] = useState([]);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Get student data from localStorage (set during parent login)
        const storedStudentData = localStorage.getItem('studentData');
        if (!storedStudentData) {
          toast.error('Student data not found. Please login again.');
          navigate('/');
          return;
        }

        const parsedStudentData = JSON.parse(storedStudentData);
        setStudentData(parsedStudentData);

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Session expired. Please login again.');
          navigate('/');
          return;
        }

        // Fetch detailed reports for this student
        const reportsRes = await axios.get(
          `${process.env.REACT_APP_URL}/api/students/${parsedStudentData.regNumber}/reports`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (reportsRes.data.status === "success") {
          setDetailedReports(reportsRes.data.data);
          
          // Fetch patterns for this student's stream
          const patternsRes = await axios.get(
            `${process.env.REACT_APP_URL}/api/getpatterns/type/${parsedStudentData.student.stream}`,
            { headers: { Authorization: `Bearer ${token}` }}
          );
          
          if (patternsRes.data.status === "success") {
            setPatterns(patternsRes.data.data);
            
            // Identify unattended tests (patterns without matching reports)
            const unattended = patternsRes.data.data.filter(pattern => 
              !reportsRes.data.data.some(report => report.testName === pattern.testName)
            );
            setUnattendedTests(unattended);
            
            // For upcoming tests, filter patterns with future dates
            const upcoming = patternsRes.data.data
              .filter(pattern => {
                const testDate = new Date(pattern.date);
                const today = new Date();
                return testDate > today;
              })
              .sort((a, b) => new Date(a.date) - new Date(b.date));
            setUpcomingTests(upcoming);
          }
        }
      } catch (err) {
        console.error("Error fetching student data:", err);
        if (err.response?.status === 401) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('token');
          localStorage.removeItem('studentData');
          navigate('/');
        } else {
          toast.error('Failed to load student reports. Please try again later.');
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

    // Bar chart data for subject-wise marks
    const barData = {
      labels: selectedReport.subjects.map(sub => sub.subjectName),
      datasets: [
        {
          label: 'Obtained Marks',
          data: selectedReport.subjects.map(sub => sub.totalMarks),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Total Marks',
          data: selectedReport.subjects.map(sub => sub.fullMarks),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        }
      ]
    };

    // Pie chart data for subject distribution
    const pieData = {
      labels: selectedReport.subjects.map(sub => sub.subjectName),
      datasets: [
        {
          data: selectedReport.subjects.map(sub => sub.totalMarks),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
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


// Updated getBaseTestName function with better normalization
const getBaseTestName = (testName) => {
  // Handle special cases with abbreviations
  const specialTests = {
    'PDT': 'Parishrama Daily Test',
    'PCT': 'Parishrama Competitive/Cummilative Test',
    'PTT': 'Parishrama Theory Test',
    'PPT': 'Parishrama Part Test',
    'PWT': 'Parishrama Weekly Test',
    'PDCT': 'Parishrama Daily Cummilative Tests',
    'PGT': 'Parishrama Grand Test'
  };

  // Check if the test name matches any special cases
  for (const [abbr, fullName] of Object.entries(specialTests)) {
    if (testName.startsWith(abbr)) {
      return { 
        baseName: abbr, 
        displayName: `${abbr}s - ${fullName}`,
        isSpecial: true
      };
    }
  }

  // Normalize the test name by:
  // 1. Converting to lowercase
  // 2. Removing all non-alphabetic characters (keeping spaces)
  // 3. Trimming whitespace
  const normalized = testName
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, '')
    .trim();

  // Extract the base name by removing any trailing numbers or version indicators
  const baseName = normalized
    .replace(/\s*\d+$/, '')  // Remove trailing numbers
    .replace(/\s*test$/, '') // Remove trailing 'test'
    .trim();

  // Capitalize the first letter of each word for display
  const displayBase = baseName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { 
    baseName: baseName || normalized, // Fallback to normalized if empty
    displayName: `${displayBase} Tests`,
    isSpecial: false
  };
};

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
    {studentData?.studentName || studentData?.student?.studentName || 'Progress'}'s Reports
  </h1>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm md:text-base">
    <div>
      <span className="font-semibold">Registration No:</span> {studentData?.regNumber || studentData?.student?.regNumber || 'N/A'}
    </div>
    <div>
      <span className="font-semibold">Campus:</span> {studentData?.campus?.name || studentData?.student?.campus?.name || 'N/A'}
    </div>
    <div>
      <span className="font-semibold">Section:</span> {studentData?.section || studentData?.student?.section || 'N/A'}
    </div>
  </div>
</div>

      {/* Main Content with Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tabs selectedIndex={activeTab} onSelect={(index) => setActiveTab(index)}>
          <TabList className="flex border-b">
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaFileAlt className="mr-2" /> Tests
            </Tab>
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaCalendarTimes className="mr-2" /> Unattended Tests
            </Tab>
            <Tab className="flex items-center px-4 py-3 font-medium text-sm md:text-base cursor-pointer focus:outline-none">
              <FaCalendarCheck className="mr-2" /> Upcoming Tests
            </Tab>
          </TabList>

{/* Tests Tab */}
<TabPanel>
  <div className="p-4 md:p-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-800">Test Reports</h2>
    
    {detailedReports.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No test reports available yet
      </div>
    ) : (
      <div className="space-y-8">
        {/* Group reports by normalized base test name */}
        {Object.entries(
          detailedReports.reduce((groups, reportGroup) => {
            const { baseName, displayName } = getBaseTestName(reportGroup.testName);
            if (!groups[baseName]) {
              groups[baseName] = {
                displayName,
                reports: []
              };
            }
            groups[baseName].reports.push(...reportGroup.reports);
            return groups;
          }, {})
        )
        .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically
        .map(([baseName, { displayName, reports }]) => (
          <div key={baseName} className="mb-8">
            <h3 className="text-lg font-medium text-gray-700 mb-3 border-b pb-2">
              {displayName}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date (newest first)
                .map((report, idx) => (
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
                        Attempted
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
          </div>
        ))}
      </div>
    )}
  </div>
</TabPanel>

{/* Unattended Tests Tab - Original version */}
<TabPanel>
  <div className="p-4 md:p-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-800">Unattended Tests</h2>
    
    {unattendedTests.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        Great job! You've attended all available tests.
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {unattendedTests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500">
                {test.date ? formatDate(test.date) : 'Date not specified'}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Not Attempted
              </span>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">{test.testName}</h4>
            <div className="text-sm text-gray-600">
              Total Marks: {test.totalMarks}
            </div>
            <div className="mt-3 text-sm">
              <span className="font-medium">Subjects:</span> {test.subjects.map(s => s.subject.subjectName).join(', ')}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</TabPanel>

{/* Upcoming Tests Tab - Original version */}
<TabPanel>
  <div className="p-4 md:p-6">
    <h2 className="text-xl font-semibold mb-4 text-gray-800">Upcoming Tests</h2>
    
    {upcomingTests.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        No upcoming tests scheduled
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingTests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-white">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500">
                {test.date ? formatDate(test.date) : 'Date not specified'}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Upcoming
              </span>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">{test.testName}</h4>
            <div className="text-sm text-gray-600">
              Total Marks: {test.totalMarks}
            </div>
            <div className="mt-3 text-sm">
              <span className="font-medium">Subjects:</span> {test.subjects.map(s => s.subject.subjectName).join(', ')}
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

              {/* Sticky Note Summary */}
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
                    <div className="text-2xl font-bold text-blue-600">{selectedReport.overallTotalMarks}</div>
                    <div className="text-xs text-gray-500">Obtained Marks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedReport.fullMarks}</div>
                    <div className="text-xs text-gray-500">Total Marks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedReport.percentage}%</div>
                    <div className="text-xs text-gray-500">Percentage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedReport.percentile}%</div>
                    <div className="text-xs text-gray-500">Percentile</div>
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
                        <th className="py-2 px-4 border text-center">Attempted</th>
                        <th className="py-2 px-4 border text-center">Correct</th>
                        <th className="py-2 px-4 border text-center">Wrong</th>
                        <th className="py-2 px-4 border text-center">Unattempted</th>
                        <th className="py-2 px-4 border text-center">Marks</th>
                        <th className="py-2 px-4 border text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.subjects.map((subject, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border">{subject.subjectName}</td>
                          <td className="py-2 px-4 border text-center">{subject.totalQuestionsAttempted}</td>
                          <td className="py-2 px-4 border text-center">{subject.correctAnswers}</td>
                          <td className="py-2 px-4 border text-center">{subject.wrongAnswers}</td>
                          <td className="py-2 px-4 border text-center">{subject.totalQuestionsUnattempted}</td>
                          <td className="py-2 px-4 border text-center font-medium">
                            {subject.totalMarks}
                          </td>
                          <td className="py-2 px-4 border text-center">{subject.fullMarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overall Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-1">Accuracy</h4>
                  <div className="flex items-center">
                    <div className="text-3xl font-bold text-blue-600 mr-2">
                      {selectedReport.accuracy}%
                    </div>
                    <div className="text-sm text-blue-500">
                      {selectedReport.accuracy >= 75 ? 'Excellent!' : 
                       selectedReport.accuracy >= 50 ? 'Good' : 'Needs improvement'}
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 className="font-medium text-green-800 mb-1">Rank</h4>
                  <div className="text-3xl font-bold text-green-600">
                    #{selectedReport.rank}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-1">Percentile</h4>
                  <div className="flex items-center">
                    <div className="text-3xl font-bold text-purple-600 mr-2">
                      {selectedReport.percentile}%
                    </div>
                    <div className="text-sm text-purple-500">
                      {selectedReport.percentile >= 90 ? 'In Top 10%' : 
                       selectedReport.percentile >= 75 ? 'In Top 25%' : 
                       selectedReport.percentile >= 50 ? 'Above average' : 'Below average'}
                    </div>
                  </div>
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