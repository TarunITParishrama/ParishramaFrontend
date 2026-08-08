import React, { useMemo } from "react";
import Select from "react-select";

export default function ReportFilters({
  loading,

  tests,

  selectedStream,
  setSelectedStream,

  selectedTest,
  setSelectedTest,

  selectedDate,
  setSelectedDate,

  onLoadReport,
}) {
  // Group reports by Test Name
  const groupedTests = useMemo(() => {
    const grouped = {};

    tests.forEach((report) => {
      if (!grouped[report.testName]) {
        grouped[report.testName] = [];
      }

      grouped[report.testName].push(report);
    });

    Object.values(grouped).forEach((reports) =>
      reports.sort((a, b) => new Date(b.date) - new Date(a.date))
    );

    return grouped;
  }, [tests]);

  // Test dropdown options
  const testOptions = Object.keys(groupedTests)
    .sort()
    .map((testName) => ({
      value: testName,
      label: testName,
    }));

  // Date dropdown options
  const dateOptions = selectedTest
    ? groupedTests[selectedTest.testName].map((report) => ({
        value: report._id,
        report,
        label: new Date(report.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      }))
    : [];

  return (
    <div className="bg-white rounded-lg shadow-md p-5 mb-6">

      <h2 className="text-xl font-semibold mb-5">
        Select Report
      </h2>

      {/* Stream */}

      <div className="flex gap-6 mb-6">

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedStream === "LongTerm"}
            onChange={() => {
              setSelectedStream("LongTerm");
              setSelectedTest(null);
              setSelectedDate(null);
            }}
          />

          Long Term
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={selectedStream === "PUC"}
            onChange={() => {
              setSelectedStream("PUC");
              setSelectedTest(null);
              setSelectedDate(null);
            }}
          />

          PUC
        </label>

      </div>

      {/* Test */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div>

          <label className="block mb-2 font-medium">
            Test Name
          </label>

          <Select
            placeholder="Search Test..."
            options={testOptions}
            value={
              selectedTest
                ? {
                    value: selectedTest.testName,
                    label: selectedTest.testName,
                  }
                : null
            }
            onChange={(option) => {
              const report = groupedTests[option.value][0];

              setSelectedTest(report);

              setSelectedDate(null);
            }}
            isClearable
          />

        </div>

        <div>

          <label className="block mb-2 font-medium">
            Test Date
          </label>

          <Select
            placeholder="Select Date..."
            options={dateOptions}
            value={
              selectedDate
                ? dateOptions.find(
                    (d) => d.report._id === selectedTest?._id
                  )
                : null
            }
            onChange={(option) => {
              setSelectedTest(option.report);

              setSelectedDate(option.report.date);
            }}
            isDisabled={!selectedTest}
            isClearable
          />

        </div>

        <div className="flex items-end">

          <button
            onClick={onLoadReport}
            disabled={
              !selectedTest ||
              !selectedDate ||
              loading
            }
            className={`w-full py-2 rounded-md text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Loading..." : "Load Report"}
          </button>

        </div>

      </div>

    </div>
  );
}