// useAttendanceLogic.js
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = process.env.REACT_APP_URL;

const useAttendanceLogic = () => {
  const [loading, setLoading] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
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

  // Fetch campuses and subjects on load
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const [campusesRes, subjectsRes] = await Promise.all([
          axios.get(`${API_URL}/api/getcampuses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/getsubjects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setCampuses(campusesRes.data.data || []);
        setSubjects(subjectsRes.data.data || []);
      } catch (error) {
        toast.error("Failed to fetch initial data");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch students when campus changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!filters.campus) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${API_URL}/api/getstudentsbycampus/${filters.campus}?page=1&limit=500`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const students = res.data.data || [];
        setAllStudents(students);

        const sectionSet = new Set();
        const records = {};
        students.forEach((s) => {
          if (s.section) sectionSet.add(s.section);
          records[s.regNumber] = { absent: false, forgiven: false };
        });
        setSections([...sectionSet].sort());
        setAttendanceRecords(records);
      } catch (err) {
        toast.error("Failed to fetch students");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [filters.campus]);

  // Filter students by section and search
  useEffect(() => {
    let filtered = allStudents;
    if (filters.section) {
      filtered = filtered.filter((s) => s.section === filters.section);
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.regNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredStudents(filtered);
  }, [filters.section, searchTerm, allStudents]);

  // Attendance counters
  useEffect(() => {
    let present = 0,
      absent = 0,
      forgiven = 0;
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttendanceChange = (regNumber, field) => {
    setAttendanceRecords((prev) => {
      const newRecords = { ...prev };
      newRecords[regNumber] = {
        ...newRecords[regNumber],
        [field]: !newRecords[regNumber][field],
      };
      if (field === "absent" && newRecords[regNumber].absent)
        newRecords[regNumber].forgiven = false;
      if (field === "forgiven" && newRecords[regNumber].forgiven)
        newRecords[regNumber].absent = false;
      return newRecords;
    });
  };

  const handleClear = () => {
    setFilters({ campus: "", section: "", subject: "" });
    setSearchTerm("");
    setAttendanceTime("00:00");
    setAttendanceDate(new Date());
    setAllStudents([]);
    setFilteredStudents([]);
    setAttendanceRecords({});
    setSections([]);
  };

  return {
    loading,
    campuses,
    sections,
    subjects,
    filters,
    searchTerm,
    attendanceTime,
    attendanceDate,
    attendanceRecords,
    filteredStudents,
    presentCount,
    absentCount,
    forgivenCount,
    forgivenNames,
    setSearchTerm,
    setAttendanceTime,
    setAttendanceDate,
    handleFilterChange,
    handleAttendanceChange,
    handleClear,
    setAttendanceRecords,
    setFilteredStudents,
    setLoading,
    setFilters,
    setAllStudents,
  };
};

export default useAttendanceLogic;