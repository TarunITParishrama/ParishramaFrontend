import React, { useEffect, useState } from "react";
import { FiAlertTriangle, FiTrash2, FiX } from "react-icons/fi";

export default function DeleteReportModal({
  open,
  report,
  totalStudents = 0,
  deleting = false,
  onClose,
  onDelete,
}) {
  const [confirmationText, setConfirmationText] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmationText("");
    }
  }, [open]);

  if (!open || !report) return null;

  const formattedDate = new Date(report.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const canDelete =
    confirmationText.trim() === report.testName;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">

      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">

        {/* Header */}

        <div className="flex justify-between items-center border-b px-6 py-4">

          <div className="flex items-center gap-3">

            <FiAlertTriangle
              size={28}
              className="text-red-600"
            />

            <div>

              <h2 className="text-xl font-bold text-gray-800">
                Delete Report
              </h2>

              <p className="text-sm text-gray-500">
                This action cannot be undone.
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            disabled={deleting}
            className="text-gray-500 hover:text-black"
          >
            <FiX size={22} />
          </button>

        </div>

        {/* Body */}

        <div className="p-6">

          <div className="grid grid-cols-2 gap-4 mb-6">

            <Info title="Test Name" value={report.testName} />

            <Info title="Date" value={formattedDate} />

            <Info title="Stream" value={report.stream} />

            <Info
              title="Question Type"
              value={report.questionType}
            />

            <Info
              title="Marks Type"
              value={report.marksType}
            />

            <Info
              title="Questions"
              value={report.totalQuestions}
            />

            <Info
              title="Students"
              value={totalStudents}
            />

          </div>

          <div className="rounded-lg border border-red-300 bg-red-50 p-4 mb-5">

            <p className="text-red-700 font-medium">

              Type

              {" "}

              <span className="font-bold">
                {report.testName}
              </span>

              {" "}

              below to confirm deletion.

            </p>

          </div>

          <input
            type="text"
            placeholder="Enter Test Name"
            value={confirmationText}
            onChange={(e) =>
              setConfirmationText(e.target.value)
            }
            disabled={deleting}
            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 outline-none"
          />

        </div>

        {/* Footer */}

        <div className="border-t px-6 py-4 flex justify-end gap-3">

          <button
            onClick={onClose}
            disabled={deleting}
            className="px-5 py-2 rounded-lg border hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            disabled={!canDelete || deleting}
            onClick={onDelete}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-white transition ${
              !canDelete || deleting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <FiTrash2 />

            {deleting
              ? "Deleting..."
              : "Delete Permanently"}

          </button>

        </div>

      </div>

    </div>
  );
}

function Info({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg border p-4">

      <div className="text-sm text-gray-500 mb-1">
        {title}
      </div>

      <div className="font-semibold text-gray-800">
        {value}
      </div>

    </div>
  );
}