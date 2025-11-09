import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import TimePicker from "react-time-picker";
import Select from "react-select";
import { useMemo, useState } from "react";

import useAttendanceLogic from "./logic/UseAttendanceLogic";

import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-time-picker/dist/TimePicker.css";

const API_URL = process.env.REACT_APP_URL;

const schema = yup.object().shape({
  campus: yup.string().required("Campus is required"),
  section: yup.string(),
  subject: yup.string().required("Subject is required"),
  date: yup.date().required("Date is required"),
  time: yup.string().required("Time is required"),
});

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    height: "38px",
    minHeight: "38px",
    borderRadius: "0.375rem",
    borderColor: state.isFocused ? "#FB923C" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #FB923C" : null,
    "&:hover": {
      borderColor: "#FB923C",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "0 0.75rem",
  }),
  input: (provided) => ({
    ...provided,
    margin: 0,
    padding: 0,
  }),
};

const AttendanceForm = () => {
  const navigate = useNavigate();
  const [nameSortOrder, setNameSortOrder] = useState("asc"); // 'asc' | 'desc'
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitSuccess, setLastSubmitSuccess] = useState(false);

  const {
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
  } = useAttendanceLogic();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      campus: filters.campus,
      section: filters.section,
      subject: filters.subject,
      date: attendanceDate,
      time: attendanceTime,
    },
  });

  // const sortedStudents = useMemo(() => {
  //   const copy = [...filteredStudents];
  //   copy.sort((a, b) => {
  //     const an = (a.studentName || "").toLocaleLowerCase();
  //     const bn = (b.studentName || "").toLocaleLowerCase();
  //     if (an < bn) return nameSortOrder === "asc" ? -1 : 1;
  //     if (an > bn) return nameSortOrder === "asc" ? 1 : -1;
  //     return 0;
  //   });
  //   return copy;
  // }, [filteredStudents, nameSortOrder]);

  const onSubmit = async (formData) => {
    // prevent duplicate submits
    if (submitting) return;

    if (filteredStudents.length === 0) {
      toast.error("No students to submit attendance for.");
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("token");

      const attendanceData = filteredStudents.map((student) => ({
        regNumber: student.regNumber,
        studentName: student.studentName,
        section: student.section,
        campus: formData.campus,
        subject: formData.subject,
        period: formData.time,
        date: formData.date.toISOString().split("T")[0],
        present:
          !attendanceRecords[student.regNumber]?.absent &&
          !attendanceRecords[student.regNumber]?.forgiven,
        absent: attendanceRecords[student.regNumber]?.absent || false,
        forgiven: attendanceRecords[student.regNumber]?.forgiven || false,
      }));

      await axios.post(
        `${API_URL}/api/createbulkattendance`,
        { attendanceData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Success feedback
      toast.success("Attendance recorded successfully!");
      setLastSubmitSuccess(true);

      // Clear selections and form values
      handleClear(); // clears attendanceRecords, counts, etc.
      reset({
        campus: "",
        section: "",
        subject: "",
        date: null,
        time: "",
      });
      setValue("campus", "");
      setValue("section", "");
      setValue("subject", "");
      setValue("date", null);
      setValue("time", "");

      // Auto-hide inline banner after 4s
      setTimeout(() => setLastSubmitSuccess(false), 4000);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to record attendance"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getInitialsAvatar = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=64`;

  return (
    <div className="overflow-auto max-h-screen p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
          Mark Attendance
        </h2>

        {/* Filters */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campus
              </label>
              <Controller
                name="campus"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    isSearchable
                    isClearable
                    isDisabled={loading || submitting}
                    options={campuses.map((campus) => ({
                      value: campus._id,
                      label: campus.name,
                    }))}
                    onChange={(selected) => {
                      const value = selected ? selected.value : "";
                      field.onChange(value);
                      handleFilterChange({ target: { name: "campus", value } });
                      setValue("campus", value);
                    }}
                    placeholder="Search Campus"
                    styles={customStyles}
                    className="w-full"
                  />
                )}
              />
              {errors.campus && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.campus.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section
              </label>
              <select
                {...register("section")}
                onChange={(e) => {
                  handleFilterChange(e);
                  setValue("section", e.target.value);
                }}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={!filters.campus || loading || submitting}
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
                {...register("subject")}
                onChange={(e) => {
                  handleFilterChange(e);
                  setValue("subject", e.target.value);
                }}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={loading || submitting}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectName}
                  </option>
                ))}
              </select>
              {errors.subject && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    selected={field.value}
                    onChange={(date) => {
                      field.onChange(date);
                      setAttendanceDate(date);
                    }}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    dateFormat="dd-MM-yyyy"
                    disabled={loading || submitting}
                  />
                )}
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.date.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <Controller
                control={control}
                name="time"
                render={({ field }) => (
                  <TimePicker
                    onChange={(val) => {
                      field.onChange(val);
                      setAttendanceTime(val);
                    }}
                    value={field.value}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disableClock={true}
                    clearIcon={null}
                    disabled={loading || submitting}
                  />
                )}
              />
              {errors.time && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.time.message}
                </p>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Students
            </label>
            <input
              type="text"
              placeholder="Search by name or reg number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={loading || submitting}
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
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">
                    Sorting by Student Name:{" "}
                    {nameSortOrder === "asc" ? "A → Z" : "Z → A"}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNameSortOrder((prev) =>
                        prev === "asc" ? "desc" : "asc"
                      )
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50"
                    disabled={loading || submitting}
                  >
                    {nameSortOrder === "asc" ? "Sort Z → A" : "Sort A → Z"}
                  </button>
                </div>

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
                    {[...filteredStudents]
                      .sort((a, b) => {
                        const an = (a.studentName || "").toLocaleLowerCase();
                        const bn = (b.studentName || "").toLocaleLowerCase();
                        if (an < bn) return nameSortOrder === "asc" ? -1 : 1;
                        if (an > bn) return nameSortOrder === "asc" ? 1 : -1;
                        return 0;
                      })
                      .map((student) => (
                        <tr
                          key={student.regNumber}
                          className="hover:bg-gray-50"
                        >
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
                                handleAttendanceChange(
                                  student.regNumber,
                                  "absent"
                                )
                              }
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              disabled={loading || submitting}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <input
                              type="checkbox"
                              checked={
                                attendanceRecords[student.regNumber]
                                  ?.forgiven || false
                              }
                              onChange={() =>
                                handleAttendanceChange(
                                  student.regNumber,
                                  "forgiven"
                                )
                              }
                              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              disabled={loading || submitting}
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
                {filters.campus
                  ? "No students match your filters"
                  : "Please select a campus to begin"}
              </p>
            </div>
          )}

          {/* Attendance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800">Present Students</h3>
              <p className="text-2xl font-bold text-green-600">
                {presentCount}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800">Absent Students</h3>
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-800">
                Permitted Students
              </h3>
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
          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            {/* Inline success banner */}
            {lastSubmitSuccess && (
              <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-800">
                Attendance saved successfully.
              </div>
            )}

            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={loading || submitting}
            >
              Clear
            </button>

            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 hover:from-red-700 hover:via-orange-600 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || submitting || filteredStudents.length === 0}
            >
              {submitting ? "Submitting..." : "Submit Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceForm;
