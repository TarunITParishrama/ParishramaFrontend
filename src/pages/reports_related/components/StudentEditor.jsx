import React, { useEffect, useState } from "react";

export default function StudentEditor({ student, report, saving, onSave }) {
  const [editedStudent, setEditedStudent] = useState(null);

  useEffect(() => {
    if (student) {
      setEditedStudent(JSON.parse(JSON.stringify(student)));
    } else {
      setEditedStudent(null);
    }
  }, [student]);

  if (!editedStudent) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-600">
          Select a student to edit.
        </h2>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
      {/* Header */}

      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Student Report Editor
        </h2>

        <p className="text-gray-500 mt-1">
          Modify student responses and save changes.
        </p>
      </div>

      {/* Student Information */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="text-sm text-gray-500">Registration Number</div>

          <div className="text-lg font-semibold mt-1">
            {editedStudent.regNumber}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="text-sm text-gray-500">Student Name</div>

          <div className="text-lg font-semibold mt-1">
            {editedStudent.studentName || "-"}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="text-sm text-gray-500">Test</div>

          <div className="text-lg font-semibold mt-1">{report?.testName}</div>
        </div>
      </div>

      {/* Performance */}

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
          <SummaryCard
            title="Correct"
            value={editedStudent.studentReport?.correctAnswers ?? 0}
          />

          <SummaryCard
            title="Wrong"
            value={editedStudent.studentReport?.wrongAnswers ?? 0}
          />

          <SummaryCard
            title="Unattempted"
            value={editedStudent.studentReport?.unattempted ?? 0}
          />

          <SummaryCard
            title="Marks"
            value={editedStudent.studentReport?.totalMarks ?? 0}
          />

          <SummaryCard
            title="Accuracy"
            value={`${editedStudent.studentReport?.accuracy ?? 0}%`}
          />

          <SummaryCard
            title="Percentage"
            value={`${editedStudent.studentReport?.percentage ?? 0}%`}
          />

          <SummaryCard
            title="Rank"
            value={editedStudent.studentReport?.rank ?? "-"}
          />

          <SummaryCard
            title="Percentile"
            value={editedStudent.studentReport?.percentile ?? "-"}
          />
        </div>
      </div>
      {/* Student Responses */}

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Student Responses</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(editedStudent.questionAnswer || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([questionNumber, answer]) => (
              <div
                key={questionNumber}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="font-semibold text-gray-700 mb-3">
                  Question {questionNumber}
                </div>

                <select
                  value={answer}
                  onChange={(e) => {
                    setEditedStudent((prev) => ({
                      ...prev,
                      questionAnswer: {
                        ...prev.questionAnswer,
                        [questionNumber]: e.target.value,
                      },
                    }));
                  }}
                  className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select</option>

                  <option value="A">A</option>

                  <option value="B">B</option>

                  <option value="C">C</option>

                  <option value="D">D</option>

                  <option value="E">E</option>

                  <option value="-">Unattempted</option>
                </select>
              </div>
            ))}
        </div>
      </div>
      {/* Edited Response Count */}

      <div className="mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Response Summary</h3>

          <p className="text-blue-700">
            Total Responses :{" "}
            <strong>
              {Object.keys(editedStudent.questionAnswer || {}).length}
            </strong>
          </p>
        </div>
      </div>

      {/* Action Buttons */}

      <div className="flex flex-col md:flex-row justify-end gap-4 border-t pt-6">
        <button
          type="button"
          onClick={() => {
            setEditedStudent(JSON.parse(JSON.stringify(student)));
          }}
          className="px-6 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition"
        >
          Reset Changes
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(editedStudent)}
          className={`px-6 py-2 rounded-lg text-white transition ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-1">{title}</div>

      <div className="text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}
