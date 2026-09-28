import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import jsPDF from "jspdf";

const PAGE_SIZE = 50;

export default function ViewSolutions() {
  const [filters, setFilters] = useState({
    stream: "LongTerm",
    questionType: "",
    testName: "",
    date: "",
  });

  const [testNames, setTestNames] = useState([]);
  const [solutions, setSolutions] = useState([]);

  // Initial page loading
  const [loading, setLoading] = useState(false);

  // Infinite-scroll loading
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const observer = useRef(null);

  // ---------------------------------------------------------------------------
  // FETCH TEST NAMES WHEN STREAM CHANGES
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutiontestnames`,
          {
            params: {
              stream: filters.stream,
            },
          }
        );

        setTestNames(response.data.data || []);
      } catch (err) {
        toast.error("Failed to load test names. Please try again.");

        console.error("Test names fetch error:", err);

        setTestNames([]);
      }
    };

    fetchTestNames();
  }, [filters.stream]);

  // ---------------------------------------------------------------------------
  // FILTER CHANGE
  // ---------------------------------------------------------------------------

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ---------------------------------------------------------------------------
  // BUILD QUERY PARAMS
  // ---------------------------------------------------------------------------

  const buildQueryParams = (requestedPage = 1) => {
    const queryParams = new URLSearchParams();

    if (filters.stream) {
      queryParams.set("stream", filters.stream);
    }

    if (filters.questionType) {
      queryParams.set("questionType", filters.questionType);
    }

    if (filters.testName) {
      queryParams.set("testName", filters.testName);
    }

    if (filters.date) {
      queryParams.set("date", filters.date);
    }

    queryParams.set("page", requestedPage);
    queryParams.set("limit", PAGE_SIZE);

    return queryParams;
  };

  // ---------------------------------------------------------------------------
  // NORMALIZE / SORT API DATA
  // ---------------------------------------------------------------------------

  const normalizeSolutions = (data = []) => {
    return [...data]
      .filter((item) => item && item.solutionRef)
      .sort((a, b) => {
        return (
          Number(a.questionNumber || 0) -
          Number(b.questionNumber || 0)
        );
      });
  };

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  const handleSearch = async () => {
    try {
      setLoading(true);

      // Reset previous results immediately
      setSolutions([]);
      setPage(1);
      setTotalQuestions(0);
      setTotalPages(1);
      setHasMore(false);

      const queryParams = buildQueryParams(1);

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsolutionbank?${queryParams}`
      );

      const responseData = response.data || {};

      let sorted = normalizeSolutions(responseData.data || []);

      /*
       * The backend already filters by testName when supplied.
       * Therefore, don't filter again here when testName is empty.
       *
       * This prevents:
       * testName === ""
       * from accidentally removing all returned records.
       */
      if (filters.testName) {
        sorted = sorted.filter(
          (item) =>
            item.solutionRef?.testName === filters.testName
        );
      }

      const currentPage = Number(responseData.page || 1);
      const backendTotalPages = Number(
        responseData.totalPages || 1
      );
      const backendTotal = Number(
        responseData.total || sorted.length || 0
      );

      setSolutions(sorted);

      setPage(currentPage);
      setTotalPages(backendTotalPages);
      setTotalQuestions(backendTotal);

      setHasMore(currentPage < backendTotalPages);
    } catch (error) {
      console.error("Error loading solutions:", error);

      if (error.response?.status === 404) {
        toast.info("No solutions found for the selected filters.");
      } else {
        toast.error("Failed to load solutions. Please try again.");
      }

      setSolutions([]);
      setPage(1);
      setTotalQuestions(0);
      setTotalPages(1);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOAD MORE
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      isLoadingMore ||
      page >= totalPages
    ) {
      return;
    }

    const nextPage = page + 1;

    try {
      setIsLoadingMore(true);

      const queryParams = buildQueryParams(nextPage);

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsolutionbank?${queryParams}`
      );

      const responseData = response.data || {};

      let newData = normalizeSolutions(responseData.data || []);

      if (filters.testName) {
        newData = newData.filter(
          (item) =>
            item.solutionRef?.testName === filters.testName
        );
      }

      /*
       * Prevent duplicate questions from being inserted if the
       * same page is accidentally requested more than once.
       */
      setSolutions((prev) => {
        const existingQuestionNumbers = new Set(
          prev.map((item) => Number(item.questionNumber))
        );

        const uniqueNewData = newData.filter(
          (item) =>
            !existingQuestionNumbers.has(
              Number(item.questionNumber)
            )
        );

        return [...prev, ...uniqueNewData].sort(
          (a, b) =>
            Number(a.questionNumber || 0) -
            Number(b.questionNumber || 0)
        );
      });

      const backendPage = Number(
        responseData.page || nextPage
      );

      const backendTotalPages = Number(
        responseData.totalPages || totalPages
      );

      /*
       * Preserve the total received from page 1.
       * If the backend sends it again, use it.
       */
      if (responseData.total !== undefined) {
        setTotalQuestions(Number(responseData.total));
      }

      setPage(backendPage);
      setTotalPages(backendTotalPages);

      setHasMore(backendPage < backendTotalPages);
    } catch (error) {
      console.error("Error loading more solutions:", error);

      toast.error("Failed to load more solutions.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasMore,
    loading,
    isLoadingMore,
    page,
    totalPages,
    filters,
  ]);

  // ---------------------------------------------------------------------------
  // INFINITE SCROLL OBSERVER
  // ---------------------------------------------------------------------------

  const lastSolutionElementRef = useCallback(
    (node) => {
      if (loading || isLoadingMore) {
        return;
      }

      if (observer.current) {
        observer.current.disconnect();
      }

      observer.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            hasMore &&
            !isLoadingMore
          ) {
            loadMore();
          }
        },
        {
          root: null,
          rootMargin: "300px",
          threshold: 0.1,
        }
      );

      if (node) {
        observer.current.observe(node);
      }
    },
    [
      loading,
      isLoadingMore,
      hasMore,
      loadMore,
    ]
  );

  // ---------------------------------------------------------------------------
  // FORMAT DATE
  // ---------------------------------------------------------------------------

  const formatDate = (dateString) => {
    if (!dateString) {
      return "-";
    }

    return new Date(dateString).toLocaleDateString("en-GB");
  };

  // ---------------------------------------------------------------------------
  // DOWNLOAD PDF
  // ---------------------------------------------------------------------------

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

    const test = solutions[0]?.solutionRef;

    if (!test) {
      toast.error("Test information is unavailable.");
      return;
    }

    /*
     * Use the backend total here instead of solutions.length.
     *
     * Example:
     * 180 total questions
     * first API call loads only 50
     *
     * PDF header will still correctly say:
     * Total Questions: 180
     *
     * Only questions currently loaded in the browser will be
     * rendered into this PDF.
     */
    const totalQuestionCount = totalQuestions || solutions.length;

    let y = 18;

    // -------------------------------------------------------------------------
    // FIRST PAGE HEADER
    // -------------------------------------------------------------------------

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);

      doc.text(
        "PARISHRAMA ACADEMY",
        pageWidth / 2,
        y,
        {
          align: "center",
        }
      );

      y += 8;

      doc.line(
        margin,
        y,
        pageWidth - margin,
        y
      );

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      doc.text(
        `Test Name : ${test.testName}`,
        margin,
        y
      );

      y += 7;

      doc.text(
        `Date : ${formatDate(test.date)}`,
        margin,
        y
      );

      y += 7;

      doc.text(
        `Stream : ${test.stream}`,
        margin,
        y
      );

      y += 7;

      doc.text(
        `Question Type : ${test.questionType}`,
        margin,
        y
      );

      y += 7;

      doc.text(
        `Total Questions : ${totalQuestionCount}`,
        margin,
        y
      );

      y += 6;

      doc.line(
        margin,
        y,
        pageWidth - margin,
        y
      );

      y += 10;
    };

    drawHeader();

    // -------------------------------------------------------------------------
    // PAGE SPACE CHECK
    // -------------------------------------------------------------------------

    const checkPageSpace = (requiredHeight) => {
      if (y + requiredHeight > pageHeight - 20) {
        doc.addPage();

        y = 20;
      }
    };

    // -------------------------------------------------------------------------
    // QUESTIONS
    // -------------------------------------------------------------------------

    solutions.forEach((solution) => {
      const questionLines = doc.splitTextToSize(
        solution.questionText ||
          "No Question Available",
        usableWidth
      );

      const solutionLines = doc.splitTextToSize(
        solution.correctSolution || "-",
        usableWidth
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

      doc.text(
        `Question ${solution.questionNumber}`,
        margin,
        y
      );

      if (solution.isGrace) {
        doc.setTextColor(0, 140, 0);

        doc.text(
          "(Grace)",
          margin + 38,
          y
        );

        doc.setTextColor(0, 0, 0);
      }

      y += 8;

      // Question Heading
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");

      doc.text(
        "Question",
        margin,
        y
      );

      y += 6;

      // Question Text
      doc.setFont("helvetica", "normal");

      doc.text(
        questionLines,
        margin,
        y
      );

      y += questionLines.length * 6 + 6;

      // Correct Option
      if (test.questionType === "MCQ") {
        doc.setFont("helvetica", "bold");

        doc.text(
          "Correct Option(s)",
          margin,
          y
        );

        y += 6;

        doc.setFont("helvetica", "normal");

        doc.text(
          solution.correctOptions?.length
            ? solution.correctOptions.join(", ")
            : "None",
          margin,
          y
        );

        y += 10;
      }

      // Solution Heading
      doc.setFont("helvetica", "bold");

      doc.text(
        "Solution",
        margin,
        y
      );

      y += 6;

      // Solution Text
      doc.setFont("helvetica", "normal");

      doc.text(
        solutionLines,
        margin,
        y
      );

      y += solutionLines.length * 6 + 6;

      // Separator
      doc.setDrawColor(180);

      doc.line(
        margin,
        y,
        pageWidth - margin,
        y
      );

      y += 10;
    });

    // -------------------------------------------------------------------------
    // END
    // -------------------------------------------------------------------------

    checkPageSpace(15);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);

    doc.text(
      "*** End of Test ***",
      pageWidth / 2,
      y,
      {
        align: "center",
      }
    );

    // -------------------------------------------------------------------------
    // FOOTER
    // -------------------------------------------------------------------------

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
        }
      );
    }

    // -------------------------------------------------------------------------
    // SAVE
    // -------------------------------------------------------------------------

    const fileName = `${test.testName}_${formatDate(
      test.date
    ).replace(/\//g, "-")}.pdf`;

    doc.save(fileName);
  };

  // ---------------------------------------------------------------------------
  // REACT SELECT STYLES
  // ---------------------------------------------------------------------------

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      top: "4px",
      minHeight: "45px",
      borderColor: state.isFocused
        ? "#3B82F6"
        : "#d1d5db",
      boxShadow: state.isFocused
        ? "0 0 0 1px #3B82F6"
        : null,
      "&:hover": {
        borderColor: "#3B82F6",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      padding: "0 0.75rem",
    }),
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">
          View Solutions
        </h1>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        {/* SEARCH FORM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* STREAM */}
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
                <option value="LongTerm">
                  Long Term
                </option>

                <option value="PUC">
                  PUC
                </option>
              </select>
            </div>

            {/* QUESTION TYPE */}
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
                <option value="">
                  All Types
                </option>

                <option value="MCQ">
                  MCQ
                </option>

                <option value="Theory">
                  Theory
                </option>
              </select>
            </div>

            {/* TEST NAME */}
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
                  const value = selectedOption
                    ? selectedOption.value
                    : "";

                  setFilters((prev) => ({
                    ...prev,
                    testName: value,
                  }));
                }}
                placeholder="Search or select test..."
                className="react-select-container"
                classNamePrefix="react-select"
                value={
                  filters.testName
                    ? {
                        value: filters.testName,
                        label: filters.testName,
                      }
                    : null
                }
              />
            </div>

            {/* DATE */}
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

          {/* SEARCH BUTTON */}
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
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>

                  Searching...
                </span>
              ) : (
                "Search Solutions"
              )}
            </button>
          </div>
        </form>

        {/* RESULTS */}
        {solutions.length > 0 ? (
          <div className="space-y-6">
            {/* RESULTS HEADER */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Solutions Found: {totalQuestions}
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Showing {solutions.length} of{" "}
                  {totalQuestions} questions
                </p>
              </div>

              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow"
              >
                Download Test PDF
              </button>
            </div>

            {/* QUESTIONS */}
            <div className="space-y-4">
              {solutions.map((solution, index) => {
                const isLast =
                  index === solutions.length - 1;

                return (
                  <div
                    key={`${solution.solutionRef?._id || "solution"}-${
                      solution.questionNumber
                    }-${index}`}
                    ref={
                      isLast
                        ? lastSolutionElementRef
                        : null
                    }
                    className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative overflow-hidden ${
                      solution.isGrace
                        ? "bg-gray-100/60"
                        : "bg-white"
                    }`}
                  >
                    {/* GRACE STAMP OVERLAY */}
                    {solution.isGrace && (
                      <>
                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] z-0" />

                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                          <div className="transform rotate-[-10deg]">
                            <span className="text-5xl font-bold text-green-600/60 tracking-widest border-4 border-green-600/50 rounded-lg px-6 py-2">
                              Grace
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* CONTENT */}
                    <div className="relative z-20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className={`font-medium text-lg ${
                              solution.isGrace
                                ? "text-gray-700"
                                : "text-gray-900"
                            }`}
                          >
                            Question{" "}
                            {solution.questionNumber}
                          </h3>

                          <p
                            className={`text-sm ${
                              solution.isGrace
                                ? "text-gray-600"
                                : "text-gray-500"
                            }`}
                          >
                            Stream:{" "}
                            {solution.solutionRef?.stream}
                          </p>
                        </div>

                        <span
                          className={`text-sm ${
                            solution.isGrace
                              ? "text-gray-600"
                              : "text-gray-500"
                          }`}
                        >
                          {
                            solution.solutionRef
                              ?.testName
                          }{" "}
                          -{" "}
                          {new Date(
                            solution.solutionRef?.date
                          ).toLocaleDateString()}
                        </span>
                      </div>

                      {/* QUESTION */}
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

                      {/* QUESTION IMAGES */}
                      {solution.questionImages
                        ?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Question Image
                          </p>

                          <div className="flex flex-wrap gap-4">
                            {solution.questionImages.map(
                              (image, idx) => (
                                <img
                                  key={idx}
                                  src={image}
                                  alt={`Question ${solution.questionNumber}`}
                                  className="max-w-xs rounded-lg border shadow-sm cursor-pointer hover:scale-105 transition"
                                />
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* MCQ OPTIONS */}
                      {solution.solutionRef
                        ?.questionType === "MCQ" && (
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
                            {[
                              "A",
                              "B",
                              "C",
                              "D",
                            ].map((opt) => {
                              const isCorrect =
                                solution.correctOptions?.includes(
                                  opt
                                ) ||
                                solution.correctOption ===
                                  opt;

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

                          {solution.correctOptions
                            ?.length > 1 && (
                            <p className="mt-1 text-xs text-gray-500">
                              Multiple correct options:{" "}
                              {solution.correctOptions.join(
                                ", "
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {/* CORRECT SOLUTION */}
                      <div className="mt-3">
                        <p
                          className={`text-sm font-medium ${
                            solution.isGrace
                              ? "text-gray-700"
                              : "text-gray-700"
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

              {/* LOADING MORE */}
              {isLoadingMore && (
                <div className="text-center py-4 text-blue-600 font-semibold animate-pulse">
                  Loading more solutions...
                </div>
              )}

              {/* ALL LOADED */}
              {!hasMore &&
                totalQuestions > 0 &&
                solutions.length >= totalQuestions && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    All {totalQuestions} questions loaded.
                  </div>
                )}
            </div>
          </div>
        ) : (
          !loading && (
            <p className="text-center text-gray-500 py-8">
              No solutions found. Apply filters to
              search.
            </p>
          )
        )}
      </div>
    </div>
  );
}