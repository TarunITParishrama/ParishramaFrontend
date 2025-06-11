import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NewReport from "../stud/NewReport";
//import DatePicker from "react-datepicker";
//import { FaCalendarAlt } from "react-icons/fa";
import "react-datepicker/dist/react-datepicker.css";
import MCQTests from "../reports_related/MCQTests";
import TheoryTests from "../reports_related/TheoryTests";

export default function Tests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [streamFilter, setStreamFilter] = useState("LongTerm");
  const [students, setStudents] = useState({});
  const [campuses, setCampuses] = useState([]);
  const [sections, setSections] = useState([]);
  const [admissionYears, setAdmissionYears] = useState(["All"]);
  const [selectedCampus, setSelectedCampus] = useState("All");
  const [selectedAdmissionYear, setSelectedAdmissionYear] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  //const [dateRange, setDateRange] = useState([null, null]);
  //const [startDate, endDate] = dateRange;
  const [activeTab, setActiveTab] = useState("MCQ");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const studentsRes = await fetch(`${process.env.REACT_APP_URL}/api/getstudents`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        const studentsData = await studentsRes.json();

        // Process students data
        const studentMap = {};
        const campusSet = new Set();
        const sectionSet = new Set();
        const admissionYearSet = new Set();
        
        if (studentsData.status === "success") {
          studentsData.data.forEach(student => {
            studentMap[student.regNumber] = {
              studentName: student.studentName,
              campus: student.campus?.name || "N/A",
              section: student.section,
              studentImageURL: student.studentImageURL || null,
              admissionYear: student.admissionYear
            };
            
            if (student.campus?.name) campusSet.add(student.campus.name);
            if (student.section) sectionSet.add(student.section);
            if (student.admissionYear) admissionYearSet.add(student.admissionYear);
          });
          
          setStudents(studentMap);
          setCampuses(["All", ...Array.from(campusSet).sort()]);
          setSections(["All", ...Array.from(sectionSet).sort()]);
          setAdmissionYears(["All", ...Array.from(admissionYearSet).sort((a, b) => b - a)]);
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [streamFilter]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-4 col-span-1 md:col-span-2">
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="stream"
                checked={streamFilter === "LongTerm"}
                onChange={() => setStreamFilter("LongTerm")}
              />
              <span className="ml-2">LongTerm</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="stream"
                checked={streamFilter === "PUC"}
                onChange={() => setStreamFilter("PUC")}
              />
              <span className="ml-2">PUC</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedAdmissionYear}
              onChange={(e) => setSelectedAdmissionYear(e.target.value)}
            >
              {admissionYears.map((year, index) => (
                <option key={index} value={year}>{year}</option>
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
        </div>

        <div className="flex justify-end mb-4 gap-2">
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
                selectedAdmissionYear={selectedAdmissionYear}
                selectedCampus={selectedCampus}
                selectedSection={selectedSection}
                students={students}
              />
            ) : (
              <TheoryTests
                streamFilter={streamFilter}
                selectedCampus={selectedCampus}
                selectedSection={selectedSection}
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