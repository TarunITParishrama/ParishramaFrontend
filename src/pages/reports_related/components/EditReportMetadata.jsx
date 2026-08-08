import React, { useEffect, useState } from "react";

export default function EditReportMetadata({
  open,
  report,
  saving,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState({
    testName: "",
    date: "",
    stream: "",
    questionType: "",
    marksType: "",
    totalQuestions: 0,
  });

  useEffect(() => {
    if (report) {
      setFormData({
        testName: report.testName || "",
        date: report.date
          ? new Date(report.date).toISOString().split("T")[0]
          : "",
        stream: report.stream || "",
        questionType: report.questionType || "",
        marksType: report.marksType || "",
        totalQuestions: report.totalQuestions || 0,
      });
    }
  }, [report]);

  if (!open || !report) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    onSave({
      ...report,
      ...formData,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">

        {/* Header */}

        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-bold">
            Edit Report Information
          </h2>
        </div>

        {/* Body */}

        <div className="p-6 space-y-5">

          <div>
            <label className="block mb-2 font-medium">
              Test Name
            </label>

            <input
              type="text"
              value={formData.testName}
              onChange={(e) =>
                handleChange("testName", e.target.value)
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">

            <div>
              <label className="block mb-2 font-medium">
                Date
              </label>

              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  handleChange("date", e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Stream
              </label>

              <select
                value={formData.stream}
                onChange={(e) =>
                  handleChange("stream", e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="LongTerm">LongTerm</option>
                <option value="PUC">PUC</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-5">

            <div>
              <label className="block mb-2 font-medium">
                Question Type
              </label>

              <select
                value={formData.questionType}
                onChange={(e) =>
                  handleChange("questionType", e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="MCQ">MCQ</option>
                <option value="Theory">Theory</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Marks Type
              </label>

              <select
                value={formData.marksType}
                onChange={(e) =>
                  handleChange("marksType", e.target.value)
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="+1 CorrectAnswer, 0 WrongAnswer, 0 Unmarked">
                  +1 CorrectAnswer, 0 WrongAnswer, 0 Unmarked
                </option>

                <option value="+4 CorrectAnswer, -1 WrongAnswer, 0 Unmarked">
                  +4 CorrectAnswer, -1 WrongAnswer, 0 Unmarked
                </option>

                <option value="+16 CorrectAnswer, -4 WrongAnswer, 0 Unmarked">
                  +16 CorrectAnswer, -4 WrongAnswer, 0 Unmarked
                </option>
              </select>
            </div>

          </div>

          <div>
            <label className="block mb-2 font-medium">
              Total Questions
            </label>

            <input
              type="number"
              value={formData.totalQuestions}
              onChange={(e) =>
                handleChange(
                  "totalQuestions",
                  Number(e.target.value)
                )
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

        </div>

        {/* Footer */}

        <div className="border-t p-5 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            disabled={saving}
            onClick={handleSubmit}
            className={`px-5 py-2 rounded-lg text-white ${
              saving
                ? "bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

        </div>

      </div>
    </div>
  );
}