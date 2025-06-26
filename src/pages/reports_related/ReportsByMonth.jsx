import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import crown from "../../assets/crown.png";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";

export default function ReportsByMonth() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { testName, dateFrom, dateTo, stream } = state || {};
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [groupedReports, setGroupedReports] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observer = useRef();

  // const styles = {
  //   dangerZone: {
  //     backgroundColor: '#fff5f5',
  //     borderLeft: '4px solid #f56565'
  //   },
  //   dangerText: {
  //     color: '#e53e3e',
  //     fontWeight: '600'
  //   }
  // };

  useEffect(() => {
    if (!testName || !dateFrom || !dateTo || !stream) {
      navigate("/tests");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Get date range for the month
        // const dateObj = new Date(date);
        // const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
        // const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);

        // Fetch reports
        const reportsResponse = await axios.get(
          `${process.env.REACT_APP_URL}/api/getreportbank`,
          {
            params: {
              testName,
              stream,
              dateFrom,
              dateTo,
              page: 1,
              limit: 100,
            },
          }
        );

        const { data, totalPages: tp } = reportsResponse.data;
        setPage(1);
        setTotalPages(tp);

        if (
          !reportsResponse.data?.data ||
          reportsResponse.data.data.length === 0
        ) {
          throw new Error(`No reports found for ${testName}, ${stream}`);
        }

        const groupedByDate = {};
        const sortedReports = [...data].sort((a, b) =>
          a.regNumber.localeCompare(b.regNumber)
        );

        sortedReports.forEach((report) => {
          if (!report.date) return;

          const reportDate = new Date(report.date).toISOString().split("T")[0];

          if (!groupedByDate[reportDate]) {
            groupedByDate[reportDate] = {
              reports: [],
              regNumbers: new Set(),
              marksType: report.marksType,
            };
          }

          if (!groupedByDate[reportDate].regNumbers.has(report.regNumber)) {
            groupedByDate[reportDate].regNumbers.add(report.regNumber);
            groupedByDate[reportDate].reports.push(report);
          }
        });

        setGroupedReports(groupedByDate);

        // Fetch solutions
        const solutionsResponse = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank`,
          { params: { testName, stream } }
        );

        if (
          !solutionsResponse.data.data ||
          solutionsResponse.data.data.length === 0
        ) {
          throw new Error("No solutions found for this test");
        }

        // Sort solutions numerically by question number
        const sortedSolutions = solutionsResponse.data.data.sort(
          (a, b) => parseInt(a.questionNumber) - parseInt(b.questionNumber)
        );
        setSolutions(sortedSolutions);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch data");
        setGroupedReports({});
        setSolutions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testName, dateFrom, dateTo, stream, navigate]);

  const loadMoreReports = async () => {
    if (page >= totalPages || isFetchingMore) return;

    try {
      setIsFetchingMore(true);
      const nextPage = page + 1;

      const moreResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/getreportbank`,
        {
          params: {
            testName,
            stream,
            dateFrom,
            dateTo,
            page: nextPage,
            limit: 100,
          },
        }
      );

      const newReports = moreResponse.data.data;
      const updatedGrouped = { ...groupedReports };

      newReports.forEach((report) => {
        const reportDate = new Date(report.date).toISOString().split("T")[0];

        if (!updatedGrouped[reportDate]) {
          updatedGrouped[reportDate] = {
            reports: [],
            regNumbers: new Set(),
            marksType: report.marksType,
          };
        }

        if (!updatedGrouped[reportDate].regNumbers.has(report.regNumber)) {
          updatedGrouped[reportDate].regNumbers.add(report.regNumber);
          updatedGrouped[reportDate].reports.push(report);
        }
      });

      setGroupedReports(updatedGrouped);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more reports:", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const lastItemRef = useCallback(
    (node) => {
      if (isFetchingMore) return;
      if (observer.current) observer.current.disconnect();

      let timeout;
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && page < totalPages) {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            loadMoreReports();
          }, 100);
        }
      });

      if (node) observer.current.observe(node);
    },
    [isFetchingMore, page, totalPages]
  );

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="ml-2 bg-yellow-600 text-white px-2 py-1 rounded-full text-xs inline-flex items-center">
          TOP 1
          <img src={crown} className="w-3 h-3 ml-1 -mt-px" alt="crown" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="ml-2 bg-gray-500 text-white px-2 py-1 rounded-full text-xs">
          TOP 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="ml-2 bg-yellow-700 text-white px-2 py-1 rounded-full text-xs">
          TOP 3
        </span>
      );
    }
    return null;
  };

  const calculateResults = (reports, solutions, marksType) => {
    const results = [];
    const isCompetitive = marksType.includes("+4");
    const correctMark = isCompetitive ? 4 : 1;
    const wrongMark = isCompetitive ? -1 : 0;

    // Create solution map with all question numbers
    const solutionMap = {};
    solutions.forEach((solution) => {
      solutionMap[solution.questionNumber] = {
        correctOptions: solution.correctOptions || [],
        isGrace: solution.isGrace || false,
        subject: solution.subject, // Assuming solutions have subject information
      };
    });

    // Get all unique question numbers from solutions
    const allQuestionNumbers = [
      ...new Set(solutions.map((s) => s.questionNumber)),
    ].sort((a, b) => a - b);
    const totalQuestions = allQuestionNumbers.length;

    reports.forEach((report) => {
      let corrAns = 0;
      let wroAns = 0;
      let totalMarks = 0;
      let unattemptedCount = 0;

      // Subject-wise tracking
      const subjectStats = {
        Biology: { correct: 0, wrong: 0, marks: 0 },
        Botany: { correct: 0, wrong: 0, marks: 0 },
        Zoology: { correct: 0, wrong: 0, marks: 0 },
        Chemistry: { correct: 0, wrong: 0, marks: 0 },
        Physics: { correct: 0, wrong: 0, marks: 0 },
      };

      const questionAnswers =
        report.questionAnswers instanceof Map
          ? Object.fromEntries(report.questionAnswers)
          : report.questionAnswers || {};

      // Process each question in order
      allQuestionNumbers.forEach((qNum) => {
        const markedOption = questionAnswers[qNum]?.trim();
        const solution = solutionMap[qNum];

        if (!markedOption || markedOption === "") {
          unattemptedCount++;
          return;
        }

        if (solution) {
          const isCorrect =
            solution.isGrace || solution.correctOptions.includes(markedOption);
          const subject = solution.subject;

          if (isCorrect) {
            corrAns++;
            totalMarks += correctMark;
            if (subject && subjectStats[subject]) {
              subjectStats[subject].correct++;
              subjectStats[subject].marks += correctMark;
            }
            console.log(`[DEBUG] ❌ Incorrectly marked:`);
            console.log(`  Q${qNum}`);
            console.log(`  Marked Option: "${markedOption}"`);
            console.log(
              `  Correct Options: ${JSON.stringify(solution.correctOptions)}`
            );
            console.log(`  Is Grace: ${solution.isGrace}`);
            console.log(`  Full Report Reg#: ${report.regNumber}`);
          } else {
            wroAns++;
            totalMarks += wrongMark;
            if (subject && subjectStats[subject]) {
              subjectStats[subject].wrong++;
              subjectStats[subject].marks += wrongMark;
            }
            console.log(
              `[DEBUG] ✅ Correctly marked Q${qNum} as "${markedOption}"`
            );
          }
        } else {
          unattemptedCount++;
          console.log(`[DEBUG] ⚠️ No solution found for Q${qNum}`);
        }
      });

      // Calculate Biology marks (Botany + Zoology or direct Biology)
      const biologyMarks =
        subjectStats.Biology.marks > 0
          ? subjectStats.Biology.marks
          : subjectStats.Botany.marks + subjectStats.Zoology.marks;

      const chemistryMarks = subjectStats.Chemistry.marks;

      // Total wrong answers across all subjects
      const totalWrongAnswers = Object.values(subjectStats).reduce(
        (sum, sub) => sum + sub.wrong,
        0
      );

      // Biology wrong answers
      const biologyWrong =
        subjectStats.Biology.wrong > 0
          ? subjectStats.Biology.wrong
          : subjectStats.Botany.wrong + subjectStats.Zoology.wrong;

      // Chemistry wrong answers
      const chemistryWrong = subjectStats.Chemistry.wrong;

      const accuracy =
        corrAns + wroAns > 0 ? (corrAns / (corrAns + wroAns)) * 100 : 0;

      results.push({
        regNumber: report.regNumber,
        correctAnswers: corrAns,
        wrongAnswers: wroAns,
        unattempted:
          unattemptedCount +
          (totalQuestions - Object.keys(questionAnswers).length),
        totalMarks,
        accuracy: parseFloat(accuracy.toFixed(2)),
        percentage:
          totalQuestions > 0
            ? parseFloat(
                ((totalMarks / (totalQuestions * correctMark)) * 100).toFixed(2)
              )
            : 0,
        percentile: 0, // Will be calculated later
        rank: 0, // Will be calculated later
        date: report.date,
        // Additional fields for tie-breaking
        biologyMarks,
        chemistryMarks,
        totalWrongAnswers,
        biologyWrong,
        chemistryWrong,
        // Assuming regNumber can be used as application number for tie-breaker
        applicationNumber: parseInt(report.regNumber) || 0,
      });
    });

    // Calculate ranks with tie-breaking
    if (results.length > 0) {
      // Sort by all tie-breaking criteria
      const sortedByMarks = [...results].sort((a, b) => {
        // Primary sort by total marks (descending)
        if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;

        // 1. Higher marks in Biology
        if (b.biologyMarks !== a.biologyMarks)
          return b.biologyMarks - a.biologyMarks;

        // 2. Higher marks in Chemistry
        if (b.chemistryMarks !== a.chemistryMarks)
          return b.chemistryMarks - a.chemistryMarks;

        // 3. Fewer total wrong answers
        if (a.totalWrongAnswers !== b.totalWrongAnswers)
          return a.totalWrongAnswers - b.totalWrongAnswers;

        // 4. Fewer wrong answers in Biology
        if (a.biologyWrong !== b.biologyWrong)
          return a.biologyWrong - b.biologyWrong;

        // 5. Fewer wrong answers in Chemistry
        if (a.chemistryWrong !== b.chemistryWrong)
          return a.chemistryWrong - b.chemistryWrong;

        // 6. Earlier application (lower application number)
        return a.applicationNumber - b.applicationNumber;
      });

      // Assign ranks - always increment by 1 for each student
      for (let i = 0; i < sortedByMarks.length; i++) {
        sortedByMarks[i].rank = i + 1;
      }

      // Update ranks in original results
      const rankMap = {};
      sortedByMarks.forEach((res) => {
        rankMap[res.regNumber] = res.rank;
      });

      // Calculate percentiles based on the new formula
      const totalStudents = results.length;
      results.forEach((res) => {
        res.rank = rankMap[res.regNumber] || 0;
        res.percentile = parseFloat(
          ((totalStudents - res.rank) / totalStudents) * 100
        ).toFixed(2);
      });
    }
    return results;
  };

  const handleSubmit = async (date, marksType) => {
    try {
      setSubmitLoading(true);
      setSubmitSuccess(false);
      setError("");

      const dateReports = groupedReports[date]?.reports || [];
      if (dateReports.length === 0) {
        throw new Error(`No reports found for ${date}`);
      }

      // 1. Get the pattern and subject details
      const token = localStorage.getItem("token");
      const patternResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/getpatterns`,
        {
          params: { type: stream.includes("PUC") ? "PUC" : "LongTerm" },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!patternResponse.data?.data) {
        throw new Error("No patterns data received from server");
      }

      const baseTestName = testName.replace(/\s*-\s*\d+/g, "").trim();
      const pattern = patternResponse.data.data.find(
        (p) => p.testName && p.testName.trim() === baseTestName
      );

      if (!pattern) {
        throw new Error(`No pattern found for test ${testName}`);
      }

      // 2. Get subject details and define question distribution
      const subjectIds = pattern.subjects.map((sub) =>
        typeof sub.subject === "string" ? sub.subject : sub.subject._id
      );

      const subjectsResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsubjects`,
        {
          params: { ids: subjectIds.join(",") },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Create subject map with ID as key and name as value
      const subjectMap = {};
      subjectsResponse.data.data.forEach((subject) => {
        subjectMap[subject._id] = subject.subjectName;
      });

      // Create subject-wise question ranges
      const subjectQuestionMap = {};
      let currentQuestion = 1;

      pattern.subjects.forEach((subject) => {
        const subjectId =
          typeof subject.subject === "string"
            ? subject.subject
            : subject.subject._id;
        const subjectName = subjectMap[subjectId];
        const questionCount = subject.totalQuestions;

        subjectQuestionMap[subjectName] = {
          startQ: currentQuestion,
          endQ: currentQuestion + questionCount - 1,
          totalMarks: subject.totalMarks,
        };

        currentQuestion += questionCount;
      });

      // 3. Calculate overall results
      const dateResults = calculateResults(dateReports, solutions, marksType);

      // 4. Calculate subject-wise results for each student
      const resultsWithSubjects = dateReports.map((report, index) => {
        const studentResult = dateResults[index];
        const questionAnswers =
          report.questionAnswers instanceof Map
            ? Object.fromEntries(report.questionAnswers)
            : report.questionAnswers || {};

        const subjectResults = {};
        let totalScored = 0;
        let totalPossible = 0;

        // Process each subject from the pattern
        Object.entries(subjectQuestionMap).forEach(
          ([subjectName, subjectData]) => {
            let subjectScored = 0;

            // Process each question in this subject's range
            for (
              let qNum = subjectData.startQ;
              qNum <= subjectData.endQ;
              qNum++
            ) {
              const qNumStr = qNum.toString();
              const markedOption = questionAnswers[qNumStr]?.trim();
              const solution = solutions.find(
                (s) => s.questionNumber.toString() === qNumStr
              );

              if (!solution) continue;

              const isCorrect =
                solution.isGrace ||
                solution.correctOptions.includes(markedOption);

              if (marksType.includes("+4")) {
                subjectScored += isCorrect ? 4 : markedOption ? -1 : 0;
              } else {
                subjectScored += isCorrect ? 1 : 0;
              }
            }

            subjectResults[subjectName] = {
              scored: subjectScored,
              marks: subjectData.totalMarks,
              percentage:
                subjectData.totalMarks > 0
                  ? parseFloat(
                      ((subjectScored / subjectData.totalMarks) * 100).toFixed(
                        2
                      )
                    )
                  : 0,
            };

            totalScored += subjectScored;
            totalPossible += subjectData.totalMarks;
          }
        );

        return {
          regNumber: report.regNumber || "",
          testName: report.testName || testName,
          date: report.date || new Date().toISOString(),
          stream: report.stream || stream,
          patternId: pattern._id,
          subjects: subjectResults,
          totalMarks: studentResult.totalMarks,
          percentile: studentResult.percentile,
          percentage: studentResult.percentage,
          rank: studentResult.rank,
          marksType: report.marksType || marksType,
        };
      });

      // 5. Check for existing results
      const checkResponse = await axios.post(
        `${process.env.REACT_APP_URL}/api/checkexistingtestresults`,
        { results: resultsWithSubjects },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { existingCount } = checkResponse.data.data;

      // 6. Show confirmation if updates will occur
      if (existingCount > 0) {
        const confirm = window.confirm(
          `This will update ${existingCount} existing test results and create ${
            resultsWithSubjects.length - existingCount
          } new ones. Continue?`
        );
        if (!confirm) {
          setSubmitLoading(false);
          return;
        }
      }

      // 7. Submit results
      const createResponse = await axios.post(
        `${process.env.REACT_APP_URL}/api/createtestresults`,
        { results: resultsWithSubjects },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmitSuccess(true);
      toast.success(
        `Successfully processed ${resultsWithSubjects.length} test results (${createResponse.data.data.created} created, ${createResponse.data.data.updated} updated)`,
        { position: "top-right", autoClose: 5000 }
      );
    } catch (err) {
      console.error("Submission error:", err);
      setError(err.response?.data?.message || err.message);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit results",
        { position: "top-right", autoClose: 5000 }
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const downloadCSV = (date, reports, marksType) => {
    const dateResults = calculateResults(reports, solutions, marksType);
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Prepare data for CSV
    const csvData = [
      ["Test Name", testName],
      ["Date", formattedDate],
      ["Stream", stream],
      ["Marking Scheme", marksType],
      [], // Empty row
      [
        "Reg No",
        "Wrong Answers",
        "Unattempted",
        "Correct Answers",
        "Total Marks",
        "Accuracy",
        "Percentage",
        "Percentile",
      ],
    ];

    dateResults.forEach((result) => {
      csvData.push([
        result.regNumber,
        result.wrongAnswers,
        result.unattempted,
        result.correctAnswers,
        result.totalMarks,
        result.accuracy.toFixed(2),
        result.percentage.toFixed(2),
        result.percentile.toFixed(2),
      ]);
    });

    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(csvData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    // Generate file name
    const fileName = `${testName.replace(/\s+/g, "_")}_${formattedDate.replace(
      /\s+/g,
      "_"
    )}_results.xlsx`;

    // Download the file
    XLSX.writeFile(wb, fileName);
  };

  const renderDateTables = () => {
    return Object.entries(groupedReports).map(
      ([date, { reports, marksType }], index) => {
        const dateResults = calculateResults(reports, solutions, marksType);
        const formattedDate = new Date(date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return (
          <div
            key={date}
            ref={
              index === Object.keys(groupedReports).length - 1
                ? lastItemRef
                : null
            }
            className="mb-8"
          >
            {" "}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">{formattedDate}</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Marking Scheme: {marksType}
              </span>
            </div>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reg No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attempted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                      Correct
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">
                      Wrong
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentile
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dateResults.map((result, index) => {
                    const attempted =
                      result.correctAnswers + result.wrongAnswers;
                    const totalQuestions = solutions.length;
                    const isDangerZone = result.percentile < 50;

                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.regNumber} {renderRankBadge(result.rank)}
                          {/* {isDangerZone &&(
                        <span className="ml-2 bg-red-800 text-white text-xs font-semibold px-2.5 py-0.5 rounded">
                          Needs Attention
                        </span>
                      )} */}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attempted}/{totalQuestions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm bg-white text-green-600 font-bold">
                          {result.correctAnswers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm bg-white text-red-600 font-bold">
                          {result.wrongAnswers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          {result.totalMarks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {result.accuracy.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">
                          {result.percentage.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">
                          {result.percentile}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => downloadCSV(date, reports, marksType)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Results (Excel)
              </button>

              <div className="flex items-center">
                {submitSuccess && (
                  <div className="mr-4 flex items-center text-green-600">
                    <svg
                      className="h-5 w-5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Results submitted successfully!
                  </div>
                )}
                <button
                  onClick={() => handleSubmit(date, marksType)}
                  disabled={submitLoading || dateResults.length === 0}
                  className={`px-6 py-2 rounded-md text-white font-medium ${
                    submitLoading
                      ? "bg-gray-400"
                      : "bg-yellow-400 hover:bg-red-500"
                  } transition`}
                >
                  {submitLoading ? (
                    <span className="flex items-center">
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
                      Submitting...
                    </span>
                  ) : (
                    `Submit Results for ${formattedDate}`
                  )}
                </button>
              </div>
            </div>
            {error && <div className="text-red-500 mt-2">{error}</div>}
          </div>
        );
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => navigate("/home/reports")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white p-6">
          <div>
            <h1 className="text-2xl font-bold">{testName}</h1>
          </div>
          <button
            onClick={() => navigate("/home/reports")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            Back to Reports
          </button>
        </div>

        {Object.keys(groupedReports).length > 0 ? (
          renderDateTables()
        ) : (
          <p>No test data available for this month.</p>
        )}
        {isFetchingMore && (
          <div className="text-center py-4 text-blue-600 font-semibold animate-pulse">
            Loading more reports...
          </div>
        )}
      </div>
    </div>
  );
}
