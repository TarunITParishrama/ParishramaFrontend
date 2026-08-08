import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import ReportFilters from "./components/ReportFilters";
import ReportSummaryCard from "./components/ReportSummaryCard";
import StudentSearch from "./components/StudentSearch";
import StudentEditor from "./components/StudentEditor";
import EditReportMetadata from "./components/EditReportMetadata";
import DeleteReportModal from "./components/DeleteReportModal";
import GraceMarks from "./components/GraceMarks";

export default function EditReports() {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [selectedStream, setSelectedStream] = useState("LongTerm");

  const [tests, setTests] = useState([]);

  const [selectedTest, setSelectedTest] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);

  const [reportData, setReportData] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [editingMetadata, setEditingMetadata] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [selectedStream]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            stream: selectedStream,
            all: true,
          },
        },
      );

      setTests(response.data.data || []);
    } catch (err) {
      console.error(err);

      setTests([]);

      setError(err.response?.data?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedReport = async () => {
    if (!selectedTest || !selectedDate) return;

    try {
      setLoading(true);
      setError("");

      const reportBankResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/getreportbank`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            testName: selectedTest.testName,
            stream: selectedStream,
            date: selectedDate,
          },
        },
      );

      const studentReportsResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/getstudentreports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            testName: selectedTest.testName,
            stream: selectedStream,
            date: selectedDate,
          },
        },
      );

      const merged = reportBankResponse.data.data.map((report) => {
        const student = studentReportsResponse.data.data.find(
          (r) => r.regNumber === report.regNumber,
        );

        return {
          ...report,
          studentReport: student || null,
        };
      });

      setReportData(merged);
      setSelectedStudent(null);
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudent = async (updatedStudent) => {
    console.log("Updated Student:", updatedStudent);

    toast.info("Save functionality will be implemented next.");
  };

  const handleUpdateMetadata = async (updatedReport) => {
    try {
      setSaving(true);
      setError("");

      const response = await axios.put(
        `${process.env.REACT_APP_URL}/api/updatereport/${updatedReport._id}`,
        {
          testName: updatedReport.testName,
          date: updatedReport.date,
          stream: updatedReport.stream,
          questionType: updatedReport.questionType,
          marksType: updatedReport.marksType,
          totalQuestions: updatedReport.totalQuestions,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success(response.data.message || "Report updated successfully.");

      // Reload report headers
      const reportsResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            stream: selectedStream,
            all: true,
          },
        },
      );

      const updatedReports = reportsResponse.data.data || [];

      setTests(updatedReports);

      // Keep the updated report selected
      const refreshedReport = updatedReports.find(
        (r) => r._id === updatedReport._id,
      );

      if (refreshedReport) {
        setSelectedTest(refreshedReport);
        setSelectedDate(refreshedReport.date);
      }

      setEditingMetadata(false);

      toast.success("Report updated successfully.");
    } catch (err) {
      console.error(err);

      toast.error(err.response?.data?.message || "Failed to update report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <ReportFilters
        loading={loading}
        tests={tests}
        selectedStream={selectedStream}
        setSelectedStream={setSelectedStream}
        selectedTest={selectedTest}
        setSelectedTest={setSelectedTest}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onLoadReport={loadSelectedReport}
      />
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {reportData.length > 0 && (
        <ReportSummaryCard
          report={selectedTest}
          reportData={reportData}
          onEdit={() => setEditingMetadata(true)}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}
      <EditReportMetadata
        open={editingMetadata}
        report={selectedTest}
        saving={saving}
        onClose={() => setEditingMetadata(false)}
        onSave={handleUpdateMetadata}
      />

      {reportData.length > 0 && (
        <>
          <StudentSearch
            reportData={reportData}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />

          <StudentEditor
            student={selectedStudent}
            report={selectedTest}
            saving={saving}
            onSave={handleSaveStudent}
          />
        </>
      )}
    </div>
  );
}
