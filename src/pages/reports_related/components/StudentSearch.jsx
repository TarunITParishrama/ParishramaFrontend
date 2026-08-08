import React, { useMemo } from "react";
import Select from "react-select";

export default function StudentSearch({
  reportData = [],
  selectedStudent,
  setSelectedStudent,
}) {
  // Build dropdown options
  const studentOptions = useMemo(() => {
    return reportData
      .map((student) => ({
        value: student.regNumber,
        label: student.studentName
          ? `${student.regNumber} - ${student.studentName}`
          : student.regNumber,
        student,
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [reportData]);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Student Search
      </h2>

      <Select
        placeholder="Search Registration Number..."
        options={studentOptions}
        value={
          selectedStudent
            ? {
                value: selectedStudent.regNumber,
                label: selectedStudent.studentName
                  ? `${selectedStudent.regNumber} - ${selectedStudent.studentName}`
                  : selectedStudent.regNumber,
              }
            : null
        }
        onChange={(option) =>
          setSelectedStudent(option ? option.student : null)
        }
        isClearable
        isSearchable
        className="text-sm"
      />

      {selectedStudent && (
        <div className="mt-5 rounded-lg border bg-blue-50 p-4">
          <h3 className="font-semibold text-gray-800 mb-2">
            Selected Student
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

            <div>
              <span className="font-medium text-gray-600">
                Registration No:
              </span>

              <div className="text-gray-900">
                {selectedStudent.regNumber}
              </div>
            </div>

            {selectedStudent.studentName && (
              <div>
                <span className="font-medium text-gray-600">
                  Student Name:
                </span>

                <div className="text-gray-900">
                  {selectedStudent.studentName}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}