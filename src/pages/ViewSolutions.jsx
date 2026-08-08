import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import jsPDF from "jspdf";

export default function ViewSolutions() {
  const [filters, setFilters] = useState({
    stream: "LongTerm",
    questionType: "",
    testName: "",
    date: "",
  });
  const [testNames, setTestNames] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  // Fetch test names when stream changes
  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        toast.info("Loading test names...", { autoClose: 2000 });
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank?stream=${filters.stream}`,
        );
        const uniqueTestNames = [
          ...new Set(
            response.data.data.map((item) => item.solutionRef.testName),
          ),
        ];
        setTestNames(uniqueTestNames);
        toast.dismiss();
      } catch (err) {
        toast.error("Failed to load test names. Please try again.");
        console.error("Test names fetch error:", err);
      }
    };
    fetchTestNames();
  }, [filters.stream]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        stream: filters.stream,
        questionType: filters.questionType,
        testName: filters.testName,
        date: filters.date,
        page: 1,
        limit: 50,
      });

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsolutionbank?${queryParams}`,
      );

      const sorted = response.data.data
        .filter((item) => item.solutionRef.testName === filters.testName)
        .sort((a, b) => a.questionNumber - b.questionNumber);

      setSolutions(sorted);
      setPage(1);
      setTotalPages(response.data.totalPages);
      setHasMore(response.data.page < response.data.totalPages);
    } catch (error) {
      console.error("Error loading solutions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const loadMore = async () => {
    if (!hasMore || isLoading) return;

    const nextPage = page + 1;

    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        stream: filters.stream,
        questionType: filters.questionType,
        testName: filters.testName,
        date: filters.date,
        page: nextPage,
        limit: 50,
      });

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsolutionbank?${queryParams}`,
      );

      const newData = response.data.data
        .filter((item) => item.solutionRef.testName === filters.testName)
        .sort((a, b) => a.questionNumber - b.questionNumber);

      setSolutions((prev) =>
        [...prev, ...newData].sort(
          (a, b) => a.questionNumber - b.questionNumber,
        ),
      );
      setPage(nextPage);
      setHasMore(nextPage < response.data.totalPages);
    } catch (error) {
      console.error("Error loading more solutions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const lastSolutionElementRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore],
  );
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const downloadPDF = () => {
    if (!solutions.length) {
      toast.info("No solutions available to download.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 15;
    const usableWidth = pageWidth - margin * 2;

    const test = solutions[0].solutionRef;

    const totalQuestions = solutions.length;

    let y = 18;

    // ---------- FIRST PAGE HEADER ----------
    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);

      doc.text("PARISHRAMA ACADEMY", pageWidth / 2, y, {
        align: "center",
      });

      y += 8;

      doc.line(margin, y, pageWidth - margin, y);

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      doc.text(`Test Name : ${test.testName}`, margin, y);
      y += 7;

      doc.text(
        `Date : ${new Date(test.date).toLocaleDateString("en-GB")}`,
        margin,
        y,
      );
      y += 7;

      doc.text(`Stream : ${test.stream}`, margin, y);
      y += 7;

      doc.text(`Question Type : ${test.questionType}`, margin, y);
      y += 7;

      doc.text(`Total Questions : ${totalQuestions}`, margin, y);

      y += 6;

      doc.line(margin, y, pageWidth - margin, y);

      y += 10;
    };

    drawHeader();

    // ---------- PAGE CHECK ----------
    const checkPageSpace = (requiredHeight) => {
      if (y + requiredHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    // ---------- QUESTIONS ----------
    solutions.forEach((solution) => {
      const questionLines = doc.splitTextToSize(
        solution.questionText || "No Question Available",
        usableWidth,
      );

      const solutionLines = doc.splitTextToSize(
        solution.correctSolution || "-",
        usableWidth,
      );

      const estimatedHeight =
        20 +
        questionLines.length * 6 +
        solutionLines.length * 6 +
        (test.questionType === "MCQ" ? 18 : 0) +
        15;

      checkPageSpace(estimatedHeight);

      // Question Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);

      doc.text(`Question ${solution.questionNumber}`, margin, y);

      if (solution.isGrace) {
        doc.setTextColor(0, 140, 0);
        doc.text("(Grace)", margin + 38, y);
        doc.setTextColor(0, 0, 0);
      }

      y += 8;

      // Question Heading
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Question", margin, y);

      y += 6;

      // Question Text
      doc.setFont("helvetica", "normal");
      doc.text(questionLines, margin, y);

      y += questionLines.length * 6 + 6;

      // Correct Option
      if (test.questionType === "MCQ") {
        doc.setFont("helvetica", "bold");
        doc.text("Correct Option(s)", margin, y);

        y += 6;

        doc.setFont("helvetica", "normal");

        doc.text(
          solution.correctOptions?.length
            ? solution.correctOptions.join(", ")
            : "None",
          margin,
          y,
        );

        y += 10;
      }

      // Solution Heading
      doc.setFont("helvetica", "bold");
      doc.text("Solution", margin, y);

      y += 6;

      // Solution Text
      doc.setFont("helvetica", "normal");
      doc.text(solutionLines, margin, y);

      y += solutionLines.length * 6 + 6;

      // Separator
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);

      y += 10;
    });

    // ---------- END ----------
    checkPageSpace(15);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);

    doc.text("*** End of Test ***", pageWidth / 2, y, {
      align: "center",
    });

    // ---------- FOOTER ----------
    const pages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(
        `Page ${i} of ${pages} | ${test.testName}`,
        pageWidth / 2,
        pageHeight - 8,
        {
          align: "center",
        },
      );
    }

    const fileName = `${test.testName}_${new Date(test.date)
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-")}.pdf`;

    doc.save(fileName);
  };
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      top: "4px",
      minHeight: "45px",
      borderColor: state.isFocused ? "#3B82F6" : "#d1d5db", // Tailwind blue-500 or gray-300
      boxShadow: state.isFocused ? "0 0 0 1px #3B82F6" : null,
      "&:hover": {
        borderColor: "#3B82F6",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 0.75rem",
    }),
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">View Solutions</h1>
      </div>

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stream Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stream
              </label>
              <select
                name="stream"
                value={filters.stream}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="LongTerm">Long Term</option>
                <option value="PUC">PUC</option>
              </select>
            </div>

            {/* Question Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Question Type
              </label>
              <select
                name="questionType"
                value={filters.questionType}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="Theory">Theory</option>
              </select>
            </div>

            {/* Test Name Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Test Name
              </label>
              <Select
                styles={customSelectStyles}
                isClearable
                isSearchable
                options={testNames.map((name) => ({
                  value: name,
                  label: name,
                }))}
                onChange={(selectedOption) => {
                  const value = selectedOption ? selectedOption.value : "";
                  setFilters((prev) => ({ ...prev, testName: value }));
                }}
                placeholder="Search or select test..."
                className="react-select-container"
                classNamePrefix="react-select"
                value={
                  filters.testName
                    ? { value: filters.testName, label: filters.testName }
                    : null
                }
              />
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? "opacity-50" : ""
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                "Search Solutions"
              )}
            </button>
          </div>
        </form>

        {solutions.length > 0 ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Solutions Found: {solutions.length}
              </h2>

              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow"
              >
                Download Test PDF
              </button>
            </div>
            <div className="space-y-4">
              {solutions.map((solution, index) => {
                const isLast = index === solutions.length - 1;
                return (
                  <div
                    key={index}
                    ref={isLast ? lastSolutionElementRef : null}
                    className={`border border-gray-200 rounded-lg p-4hover:shadow-md transition-shadow relative 
                  overflow-hidden ${
                    solution.isGrace ? "bg-gray-100/60" : "bg-white"
                  }`}
                  >
                    {/* Grace Stamp Overlay */}
                    {solution.isGrace && (
                      <>
                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] z-0"></div>
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                          <div className="transform rotate-[-10deg]">
                            <span className="text-5xl font-bold text-green-600/60 tracking-widest border-4 border-green-600/50 rounded-lg px-6 py-2">
                              Grace
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="relative z-20">
                      {" "}
                      {/* Content wrapper to stay above stamp */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className={`font-medium text-lg ${
                              solution.isGrace
                                ? "text-gray-700"
                                : "text-gray-900"
                            }`}
                          >
                            Question {solution.questionNumber}
                          </h3>
                          <p
                            className={`text-sm ${
                              solution.isGrace
                                ? "text-gray-600"
                                : "text-gray-500"
                            }`}
                          >
                            Stream: {solution.solutionRef.stream}
                          </p>
                        </div>
                        <span
                          className={`text-sm ${
                            solution.isGrace ? "text-gray-600" : "text-gray-500"
                          }`}
                        >
                          {solution.solutionRef.testName} -{" "}
                          {new Date(
                            solution.solutionRef.date,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700">
                          Question
                        </p>

                        <div className="mt-1 p-3 bg-blue-50 border border-blue-100 rounded-lg whitespace-pre-wrap text-gray-800">
                          {solution.questionText || (
                            <span className="italic text-gray-400">
                              No question text available.
                            </span>
                          )}
                        </div>
                      </div>
                      {solution.questionImages?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Question Image
                          </p>

                          <div className="flex flex-wrap gap-4">
                            {solution.questionImages.map((image, idx) => (
                              <img
                                key={idx}
                                src={image}
                                alt={`Question ${solution.questionNumber}`}
                                className="max-w-xs rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {solution.solutionRef.questionType === "MCQ" && (
                        <div className="mt-5">
                          <p
                            className={`text-sm font-medium ${
                              solution.isGrace
                                ? "text-gray-700"
                                : "text-gray-700"
                            }`}
                          >
                            Correct Option(s):
                          </p>
                          <div className="flex space-x-4 mt-1">
                            {["A", "B", "C", "D"].map((opt) => {
                              const isCorrect =
                                solution.correctOptions?.includes(opt) ||
                                solution.correctOption === opt;

                              return (
                                <span
                                  key={opt}
                                  className={`px-3 py-1 rounded-lg text-lg font-medium ${
                                    isCorrect
                                      ? solution.isGrace
                                        ? "bg-green-200/80 text-green-900 border-2 border-green-400/80"
                                        : "bg-green-100 text-green-400 border border-green-200"
                                      : "text-gray-700 bg-gray-100"
                                  }`}
                                >
                                  {opt}
                                  {isCorrect && (
                                    <span
                                      className={`ml-1 ${
                                        solution.isGrace
                                          ? "text-green-800"
                                          : "text-green-400"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                          {solution.correctOptions?.length > 1 && (
                            <p className="mt-1 text-xs text-gray-500">
                              Multiple correct options:{" "}
                              {solution.correctOptions.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mt-3">
                        <p
                          className={`text-sm font-medium ${
                            solution.isGrace ? "text-gray-700" : "text-gray-700"
                          }`}
                        >
                          Correct Solution:
                        </p>
                        <div
                          className={`mt-1 p-3 rounded-lg ${
                            solution.isGrace
                              ? "bg-white/80 border border-green-200/50"
                              : "bg-gray-50"
                          }`}
                        >
                          <p
                            className={`whitespace-pre-wrap ${
                              solution.isGrace
                                ? "text-gray-800"
                                : "text-gray-700"
                            }`}
                          >
                            {solution.correctSolution}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="text-center py-4 text-blue-600 font-semibold animate-pulse">
                  Loading more solutions...
                </div>
              )}
            </div>
          </div>
        ) : (
          !loading && (
            <p className="text-center text-gray-500 py-8">
              No solutions found. Apply filters to search.
            </p>
          )
        )}
      </div>
    </div>
  );
}
