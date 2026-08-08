import React from "react";
import { FiEdit2, FiTrash2, FiUsers, FiCalendar } from "react-icons/fi";
import { FaBookOpen } from "react-icons/fa";

export default function ReportSummaryCard({
  report,
  reportData,
  onEdit,
  onDelete,
}) {
  if (!report) return null;

  const totalStudents = reportData?.length || 0;

  const formattedDate = new Date(report.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {report.testName}
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Report Information
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <FiEdit2 size={16} />
            Edit Test
          </button>

          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            <FiTrash2 size={16} />
            Delete Test
          </button>
        </div>
      </div>

      {/* Summary Grid */}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">

        <InfoCard
          title="Stream"
          value={report.stream}
        />

        <InfoCard
          title="Question Type"
          value={report.questionType}
        />

        <InfoCard
          title="Marks Type"
          value={report.marksType}
        />

        <InfoCard
          title="Questions"
          value={report.totalQuestions}
          icon={<FaBookOpen />}
        />

        <InfoCard
          title="Students"
          value={totalStudents}
          icon={<FiUsers />}
        />

        <InfoCard
          title="Date"
          value={formattedDate}
          icon={<FiCalendar />}
        />

        <InfoCard
          title="Report ID"
          value={report._id.slice(-6).toUpperCase()}
        />

      </div>
    </div>
  );
}

function InfoCard({ title, value, icon }) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
        {icon}
        <span>{title}</span>
      </div>

      <div className="text-lg font-semibold text-gray-800 break-words">
        {value || "-"}
      </div>
    </div>
  );
}