import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NewReport from "../stud/NewReport";
import DatePicker from "react-datepicker";
import { FaCalendarAlt } from "react-icons/fa";
import "react-datepicker/dist/react-datepicker.css";
import MCQTests from "../reports_related/MCQTests";
import TheoryTests from "../reports_related/TheoryTests";
import DownloadAllTestsButton from "../../download/DownloadAllTestsButton";

export default function Tests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [streamFilter, setStreamFilter] = useState("LongTerm");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTest, setSelectedTest] = useState(null);
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState({});
  const [campuses, setCampuses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [activeTab, setActiveTab] = useState("MCQ");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const [testsRes, studentsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_URL}/api/getallreports`, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          fetch(`${process.env.REACT_APP_URL}/api/getstudents`, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
        ]);

        const testsData = await testsRes.json();
        const studentsData = await studentsRes.json();

        // Process students data
        const studentMap = {};
        const campusSet = new Set();
        const sectionSet = new Set();
        
        if (studentsData.status === "success") {
          studentsData.data.forEach(student => {
            studentMap[student.regNumber] = {
              studentName: student.studentName,
              campus: student.campus?.name || "N/A",
              section: student.section,
              studentImageURL: student.studentImageURL || null
            };
            
            if (student.campus?.name) campusSet.add(student.campus.name);
            if (student.section) sectionSet.add(student.section);
          });
          
          setStudents(studentMap);
          setCampuses(["All", ...Array.from(campusSet).sort()]);
          setSections(["All", ...Array.from(sectionSet).sort()]);
        }

        // Process tests data
        if (testsData.status === "success" && Array.isArray(testsData.data)) {
          const uniqueTests = Array.from(new Set(
            testsData.data.map(item => item.testName)
          ).map(testName => {
            const test = testsData.data.find(item => item.testName === testName);
            return test ? { 
              testName, 
              date: test.date, 
              stream: test.stream,
              type: test.type || "MCQ"
            } : null;
          })).filter(Boolean);
          
          setTests(uniqueTests.sort((a, b) => new Date(b.date) - new Date(a.date)));
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [streamFilter]);

  const createDetailedReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_URL}/api/createdetailedreports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stream: streamFilter })
      });

      const result = await response.json();
      if (response.ok) {
        alert("Detailed reports created successfully!");
        window.location.reload();
      } else {
        alert(`Error: ${result.message || 'Failed to create detailed reports'}`);
      }
    } catch (err) {
      console.error("Error creating detailed reports:", err);
      alert("Error creating detailed reports");
    } finally {
      setLoading(false);
    }
  };

  const filteredTestNames = useMemo(() => {
    return tests
      .filter(test => 
        test.type === (activeTab === "MCQ" ? "MCQ" : "Theory") && 
        test.stream === streamFilter
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [tests, activeTab, streamFilter]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Tests</h1>
      </div>

      <div className="max-w-7xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'MCQ' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('MCQ')}
          >
            MCQ Tests
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'Theory' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('Theory')}
          >
            Theory Tests
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2">
            <input
              type="text"
              placeholder="Search by Test Name"
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {activeTab === "MCQ" && (
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="stream"
                  checked={streamFilter === "LongTerm"}
                  onChange={() => {
                    setStreamFilter("LongTerm");
                    setSelectedTest(null);
                  }}
                />
                <span className="ml-2">LongTerm</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="stream"
                  checked={streamFilter === "PUC"}
                  onChange={() => {
                    setStreamFilter("PUC");
                    setSelectedTest(null);
                  }}
                />
                <span className="ml-2">PUC</span>
              </label>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedTest ? selectedTest.testName : ""}
              onChange={(e) => {
                const test = filteredTestNames.find(t => t.testName === e.target.value);
                setSelectedTest(test || null);
              }}
            >
              <option value="">All Tests</option>
              {filteredTestNames.map((test, index) => (
                <option key={index} value={test.testName}>
                  {test.testName} ({new Date(test.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
            >
              {campuses.map((campus, index) => (
                <option key={index} value={campus}>{campus}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {sections.map((section, index) => (
                <option key={index} value={section}>{section}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <div className="relative">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Select date range"
                className="w-full p-2 border rounded pl-10"
                dateFormat="MMM d, yyyy"
              />
              <FaCalendarAlt className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex justify-end mb-4 gap-2">
          <DownloadAllTestsButton streamFilter={streamFilter} students={students} />
          
          {activeTab === "MCQ" && (
            <button
              onClick={createDetailedReports}
              className="bg-green-600 text-white py-2 px-4 rounded-lg shadow hover:shadow-lg"
            >
              Create Detailed Reports
            </button>
          )}
          <button
            onClick={() => setShowNewReport(true)}
            className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-4 rounded-lg shadow hover:shadow-lg"
          >
            New Test +
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            {activeTab === "MCQ" ? (
              <MCQTests
                streamFilter={streamFilter}
                searchTerm={searchTerm}
                selectedTest={selectedTest}
                selectedCampus={selectedCampus}
                selectedSection={selectedSection}
                dateRange={dateRange}
                students={students}
              />
            ) : (
              <TheoryTests
                streamFilter={streamFilter}
                searchTerm={searchTerm}
                selectedTest={selectedTest}
                selectedCampus={selectedCampus}
                selectedSection={selectedSection}
                dateRange={dateRange}
                students={students}
              />
            )}
          </>
        )}
      </div>

      {showNewReport && <NewReport onClose={() => setShowNewReport(false)} />}
    </div>
  );
}