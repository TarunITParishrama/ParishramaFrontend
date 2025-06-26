import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";

const API_URL = process.env.REACT_APP_URL;

const AttendanceForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filters, setFilters] = useState({
    campus: "",
    section: "",
    subject: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceTime, setAttendanceTime] = useState("10:00");
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [forgivenCount, setForgivenCount] = useState(0);
  const [forgivenNames, setForgivenNames] = useState([]);

  // Fetch all initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");

        const [campusesRes, subjectsRes, studentsRes] = await Promise.all([
          axios.get(`${API_URL}/api/getcampuses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/getsubjects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/getstudents`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setCampuses(campusesRes.data.data || []);
        setSubjects(subjectsRes.data.data || []);
        setAllStudents(studentsRes.data.data || []);

        // Extract unique sections
        const sectionsSet = new Set();
        (studentsRes.data.data || []).forEach((student) => {
          if (student.section) {
            sectionsSet.add(student.section);
          }
        });
        setSections(Array.from(sectionsSet).sort());

        // Initialize attendance records
        const initialRecords = {};
        (studentsRes.data.data || []).forEach((student) => {
          initialRecords[student.regNumber] = {
            absent: false,
            forgiven: false,
          };
        });
        setAttendanceRecords(initialRecords);
      } catch (error) {
        toast.error("Failed to fetch initial data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter students based on selected campus, section and search term
  useEffect(() => {
    let filtered = allStudents;

    // Filter by campus
    if (filters.campus) {
      filtered = filtered.filter(
        (student) =>
          student.campus === filters.campus ||
          (typeof student.campus === "object" &&
            student.campus._id?.toString() === filters.campus)
      );
    }

    // Filter by section
    if (filters.section) {
      filtered = filtered.filter(
        (student) => student.section === filters.section
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.studentName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          student.regNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  }, [filters.campus, filters.section, searchTerm, allStudents]);

  // Calculate attendance counts based on filtered students
  useEffect(() => {
    let present = 0;
    let absent = 0;
    let forgiven = 0;
    const names = [];

    filteredStudents.forEach((student) => {
      const record = attendanceRecords[student.regNumber] || {};

      if (record.absent) {
        absent++;
      } else if (record.forgiven) {
        forgiven++;
        names.push(student.studentName);
      } else {
        present++;
      }
    });

    setPresentCount(present);
    setAbsentCount(absent);
    setForgivenCount(forgiven);
    setForgivenNames(names);
  }, [filteredStudents, attendanceRecords]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle attendance checkbox changes
  const handleAttendanceChange = (regNumber, field) => {
    setAttendanceRecords((prev) => {
      const newRecords = { ...prev };

      // Toggle the clicked field
      newRecords[regNumber] = {
        ...newRecords[regNumber],
        [field]: !newRecords[regNumber][field],
      };

      // Ensure only one of absent or forgiven is true
      if (field === "absent" && newRecords[regNumber].absent) {
        newRecords[regNumber].forgiven = false;
      } else if (field === "forgiven" && newRecords[regNumber].forgiven) {
        newRecords[regNumber].absent = false;
      }

      return newRecords;
    });
  };

  // Get initials avatar for students without images
  const getInitialsAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=64`;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // Prepare attendance data for filtered students
      const attendanceData = filteredStudents.map((student) => ({
        regNumber: student.regNumber,
        studentName: student.studentName,
        section: student.section,
        campus:
          typeof student.campus === "object"
            ? student.campus._id
            : student.campus,
        subject: filters.subject,
        period: attendanceTime,
        date: attendanceDate.toISOString().split("T")[0],
        present:
          !attendanceRecords[student.regNumber]?.absent &&
          !attendanceRecords[student.regNumber]?.forgiven,
        absent: attendanceRecords[student.regNumber]?.absent || false,
        forgiven: attendanceRecords[student.regNumber]?.forgiven || false,
      }));

      // Submit to backend
      await axios.post(
        `${API_URL}/api/createbulkattendance`,
        { attendanceData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Attendance recorded successfully!");
      setFilteredStudents([]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to record attendance"
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle clear form
  const handleClear = () => {
    setFilters({
      campus: "",
      section: "",
      subject: "",
    });
    setSearchTerm("");
    setAttendanceTime("00:00");
    setAttendanceDate(new Date());
    setFilteredStudents([]);
  };

  return (
    // <div className='overflow-auto max-h-screen p-4'>
    <div className="overflow-visible p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
          Mark Attendance
        </h2>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campus
            </label>
            <select
              name="campus"
              value={filters.campus}
              onChange={handleFilterChange}
              className="
              relative z-50
              w-full p-2 border rounded 
              focus:ring-2 focus:ring-orange-500 focus:border-orange-500
            "
              disabled={loading}
            >
              <option value="">All Campuses</option>
              {campuses.map((campus) => (
                <option key={campus._id} value={campus._id.toString()}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section
            </label>
            <select
              name="section"
              value={filters.section}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={loading}
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              name="subject"
              value={filters.subject}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disabled={loading}
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id.toString()}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <DatePicker
              selected={attendanceDate}
              onChange={(date) => setAttendanceDate(date)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              dateFormat="dd-MM-yyyy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <TimePicker
              onChange={setAttendanceTime}
              value={attendanceTime}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              disableClock={true}
              clearIcon={null}
            />
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Students
          </label>
          <input
            type="text"
            placeholder="Search by name or reg number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            disabled={loading}
          />
        </div>

        {/* Students List */}
        {loading ? (
          <div className="mb-6 text-center py-8 bg-gray-50 rounded-lg">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="mb-6">
            <div className="overflow-x-auto max-w-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reg Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permitted
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.regNumber} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-300">
                          {student.studentImageURL ? (
                            <img
                              src={student.studentImageURL}
                              alt={student.studentName}
                              className="h-10 w-10 object-cover rounded-full"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getInitialsAvatar(
                                  student.studentName
                                );
                              }}
                            />
                          ) : (
                            <img
                              src={getInitialsAvatar(student.studentName)}
                              alt={student.studentName}
                              className="h-10 w-10 object-cover rounded-full"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.regNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={
                            attendanceRecords[student.regNumber]?.absent ||
                            false
                          }
                          onChange={() =>
                            handleAttendanceChange(student.regNumber, "absent")
                          }
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={
                            attendanceRecords[student.regNumber]?.forgiven ||
                            false
                          }
                          onChange={() =>
                            handleAttendanceChange(
                              student.regNumber,
                              "forgiven"
                            )
                          }
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {allStudents.length
                ? "No students match your filters"
                : "No students available"}
            </p>
          </div>
        )}

        {/* Attendance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-800">Present Students</h3>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-medium text-red-800">Absent Students</h3>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="font-medium text-yellow-800">Permitted Students</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {forgivenCount}
            </p>
            {forgivenNames.length > 0 && (
              <p className="text-sm text-yellow-700 mt-1">
                {forgivenNames.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Submit and Clear Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            disabled={loading}
          >
            Clear
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={
              loading || !filters.subject || filteredStudents.length === 0
            }
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 hover:from-red-700 hover:via-orange-600 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceForm;
