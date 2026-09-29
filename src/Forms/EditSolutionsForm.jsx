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

const PAGE_SIZE = 50;

const EditSolutionsForm = ({ onSuccess }) => {
  const [filters, setFilters] = useState({
    stream: "LongTerm",
    questionType: "",
    testName: "",
    date: "",
  });

  const [testNames, setTestNames] = useState([]);
  const [solutions, setSolutions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [page, setPage] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // All matching Solution document IDs.
  // Used when updating duplicate SolutionBank documents.
  const [solutionIds, setSolutionIds] = useState([]);

  const [imageUploads, setImageUploads] = useState({});
  const [modifiedQuestions, setModifiedQuestions] = useState(new Set());

  const [editingTestInfo, setEditingTestInfo] = useState(false);

  const [testMetadata, setTestMetadata] = useState({
    testName: "",
    date: "",
    stream: "LongTerm",
    questionType: "",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [duplicateData, setDuplicateData] = useState({
    testName: "",
    date: "",
    stream: "LongTerm",
    questionType: "",
  });

  const observer = useRef(null);

  // ============================================================
  // Fetch Test Names
  // ============================================================

  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutiontestnames`,
          {
            params: {
              stream: filters.stream,
            },
          },
        );

        setTestNames(response.data.data || []);
      } catch (err) {
        toast.error("Failed to load test names");

        console.error(
          "Test names fetch error:",
          err,
        );

        setTestNames([]);
      }
    };

    fetchTestNames();
  }, [filters.stream]);

  // ============================================================
  // Filter Handlers
  // ============================================================

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTestMetadataChange = (e) => {
    const { name, value } = e.target;

    setTestMetadata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================================
  // Group SolutionBank Entries
  // ============================================================

  const groupSolutionsByTest = (solutionBank = []) => {
    const groups = {};

    solutionBank.forEach((item) => {
      if (!item.solutionRef) {
        return;
      }

      const key = item.solutionRef._id;

      if (!groups[key]) {
        groups[key] = {
          solutionRef: item.solutionRef,
          solutionBank: [],
        };
      }

      const correctOptions = Array.isArray(
        item.correctOptions,
      )
        ? item.correctOptions
        : item.correctOption
          ? [item.correctOption]
          : [];

      groups[key].solutionBank.push({
        ...item,
        correctOptions,
        isGrace: item.isGrace || false,
      });
    });

    return Object.values(groups).map((group) => ({
      ...group,
      solutionBank: group.solutionBank.sort(
        (a, b) =>
          a.questionNumber - b.questionNumber,
      ),
    }));
  };

  // ============================================================
  // Reset Pagination
  // ============================================================

  const resetPagination = () => {
    setPage(1);
    setTotalPages(1);
    setTotalQuestions(0);
    setHasMore(false);
    setSolutionIds([]);
  };

  // ============================================================
  // Search Solutions
  // ============================================================

  const handleSearch = async (e) => {
    e.preventDefault();

    setLoading(true);

    setSolutions([]);
    setImageUploads({});
    setModifiedQuestions(new Set());
    setEditingTestInfo(false);

    resetPagination();

    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(
        ([key, value]) => {
          if (value) {
            params.append(key, value);
          }
        },
      );

      params.append("page", "1");
      params.append(
        "limit",
        String(PAGE_SIZE),
      );

      console.log(
        "Fetching solutions:",
        params.toString(),
      );

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsolutionbank?${params.toString()}`,
      );

      const data = response.data.data || [];

      const groupedSolutions =
        groupSolutionsByTest(data);

      if (groupedSolutions.length === 0) {
        toast.info(
          "No solutions found matching your criteria",
        );

        setSolutions([]);
        resetPagination();

        return;
      }

      // --------------------------------------------------------
      // Store Solution IDs returned by backend
      // --------------------------------------------------------

      const returnedSolutionIds =
        response.data.solutionIds ||
        (
          groupedSolutions
            .map(
              (item) =>
                item.solutionRef?._id,
            )
            .filter(Boolean)
        );

      setSolutionIds(returnedSolutionIds);

      // --------------------------------------------------------
      // Metadata
      // --------------------------------------------------------

      setTestMetadata({
        testName:
          groupedSolutions[0].solutionRef
            .testName,

        date:
          groupedSolutions[0].solutionRef.date
            ?.split("T")[0] || "",

        stream:
          groupedSolutions[0].solutionRef
            .stream,

        questionType:
          groupedSolutions[0].solutionRef
            .questionType,
      });

      // --------------------------------------------------------
      // Pagination
      // --------------------------------------------------------

      const currentPage =
        response.data.page || 1;

      const currentTotalPages =
        response.data.totalPages || 1;

      const currentTotal =
        response.data.total ??
        data.length;

      setPage(currentPage);

      setTotalPages(currentTotalPages);

      setTotalQuestions(currentTotal);

      setHasMore(
        currentPage < currentTotalPages,
      );

      setSolutions(groupedSolutions);

      toast.success(
        `Found ${currentTotal} questions`,
      );
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to fetch solutions";

      toast.error(errorMsg);

      console.error(
        "Solutions fetch error:",
        err,
      );

      setSolutions([]);
      resetPagination();
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Load More Questions
  // ============================================================

  const loadMoreQuestions =
    useCallback(async () => {
      if (
        !hasMore ||
        isLoadingMore ||
        solutions.length === 0
      ) {
        return;
      }

      const nextPage = page + 1;

      if (nextPage > totalPages) {
        setHasMore(false);
        return;
      }

      setIsLoadingMore(true);

      try {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(
          ([key, value]) => {
            if (value) {
              params.append(key, value);
            }
          },
        );

        params.append(
          "page",
          String(nextPage),
        );

        params.append(
          "limit",
          String(PAGE_SIZE),
        );

        console.log(
          `Loading page ${nextPage}:`,
          params.toString(),
        );

        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank?${params.toString()}`,
        );

        const newData =
          response.data.data || [];

        if (newData.length === 0) {
          setHasMore(false);
          return;
        }

        // ------------------------------------------------------
        // Merge new questions into existing SolutionBank
        // ------------------------------------------------------

        setSolutions((prevSolutions) => {
          if (
            prevSolutions.length === 0
          ) {
            return groupSolutionsByTest(
              newData,
            );
          }

          const existingSolution =
            prevSolutions[0];

          const existingQuestions =
            existingSolution.solutionBank ||
            [];

          const existingQuestionNumbers =
            new Set(
              existingQuestions.map(
                (question) =>
                  question.questionNumber,
              ),
            );

          const normalizedNewQuestions =
            newData
              .filter(
                (item) =>
                  !existingQuestionNumbers.has(
                    item.questionNumber,
                  ),
              )
              .map((item) => ({
                ...item,

                correctOptions:
                  Array.isArray(
                    item.correctOptions,
                  )
                    ? item.correctOptions
                    : item.correctOption
                      ? [item.correctOption]
                      : [],

                isGrace:
                  item.isGrace || false,
              }));

          return [
            {
              ...existingSolution,

              solutionBank: [
                ...existingQuestions,
                ...normalizedNewQuestions,
              ].sort(
                (a, b) =>
                  a.questionNumber -
                  b.questionNumber,
              ),
            },
          ];
        });

        // ------------------------------------------------------
        // Update pagination
        // ------------------------------------------------------

        const returnedPage =
          response.data.page ||
          nextPage;

        const returnedTotalPages =
          response.data.totalPages ||
          totalPages;

        const returnedTotal =
          response.data.total ??
          totalQuestions;

        setPage(returnedPage);

        setTotalPages(
          returnedTotalPages,
        );

        setTotalQuestions(
          returnedTotal,
        );

        setHasMore(
          returnedPage <
            returnedTotalPages,
        );
      } catch (err) {
        console.error(
          "Error loading more questions:",
          err,
        );

        toast.error(
          "Failed to load more questions.",
        );
      } finally {
        setIsLoadingMore(false);
      }
    }, [
      filters,
      hasMore,
      isLoadingMore,
      page,
      totalPages,
      totalQuestions,
      solutions.length,
    ]);

  // ============================================================
  // Infinite Scroll Observer
  // ============================================================

  const lastQuestionElementRef =
    useCallback(
      (node) => {
        if (isLoadingMore) {
          return;
        }

        if (observer.current) {
          observer.current.disconnect();
        }

        observer.current =
          new IntersectionObserver(
            (entries) => {
              if (
                entries[0].isIntersecting &&
                hasMore
              ) {
                loadMoreQuestions();
              }
            },
            {
              rootMargin: "300px",
            },
          );

        if (node) {
          observer.current.observe(node);
        }
      },
      [
        isLoadingMore,
        hasMore,
        loadMoreQuestions,
      ],
    );

  // ============================================================
  // Option Toggle
  // ============================================================

  const handleOptionToggle = (
    questionIndex,
    option,
  ) => {
    setSolutions((prevSolutions) =>
      prevSolutions.map((test) => ({
        ...test,

        solutionBank:
          test.solutionBank.map(
            (question, idx) => {
              if (
                idx !== questionIndex
              ) {
                return question;
              }

              const currentOptions =
                Array.isArray(
                  question.correctOptions,
                )
                  ? question.correctOptions
                  : [];

              const newOptions =
                currentOptions.includes(
                  option,
                )
                  ? currentOptions.filter(
                      (opt) =>
                        opt !== option,
                    )
                  : [
                      ...currentOptions,
                      option,
                    ];

              return {
                ...question,
                correctOptions:
                  newOptions,
              };
            },
          ),
      })),
    );

    setModifiedQuestions(
      (prev) =>
        new Set(
          prev,
        ).add(questionIndex),
    );
  };

  // ============================================================
  // Generic Solution Change
  // ============================================================

  const handleSolutionChange = (
    questionIndex,
    field,
    value,
  ) => {
    setSolutions((prevSolutions) =>
      prevSolutions.map((test) => ({
        ...test,

        solutionBank:
          test.solutionBank.map(
            (question, idx) => {
              if (
                idx !== questionIndex
              ) {
                return question;
              }

              return {
                ...question,
                [field]: value,
              };
            },
          ),
      })),
    );

    setModifiedQuestions(
      (prev) =>
        new Set(
          prev,
        ).add(questionIndex),
    );
  };

  // ============================================================
  // Grace Toggle
  // ============================================================

  const handleGraceToggle = (
    questionIndex,
  ) => {
    setSolutions((prevSolutions) =>
      prevSolutions.map((test) => ({
        ...test,

        solutionBank:
          test.solutionBank.map(
            (question, idx) => {
              if (
                idx !== questionIndex
              ) {
                return question;
              }

              return {
                ...question,
                isGrace:
                  !question.isGrace,
              };
            },
          ),
      })),
    );

    setModifiedQuestions(
      (prev) =>
        new Set(
          prev,
        ).add(questionIndex),
    );
  };

  // ============================================================
  // Add New Question
  // ============================================================

  const handleAddNewQuestion = () => {
    if (solutions.length === 0) {
      return;
    }

    const existingQuestions =
      solutions[0].solutionBank || [];

    const newQuestionNumber =
      existingQuestions.length > 0
        ? Math.max(
            ...existingQuestions.map(
              (q) => q.questionNumber,
            ),
          ) + 1
        : 1;

    setSolutions((prevSolutions) =>
      prevSolutions.map((test) => ({
        ...test,

        solutionBank: [
          ...test.solutionBank,

          {
            questionNumber:
              newQuestionNumber,

            questionText: "",

            questionImages: [],

            correctOptions: [],

            correctSolution: "",

            isGrace: false,

            solutionRef:
              test.solutionRef._id,

            date:
              test.solutionRef.date,
          },
        ],
      })),
    );

    setTotalQuestions(
      (prev) => prev + 1,
    );
  };

  // ============================================================
  // Remove Question Locally
  // ============================================================

  const handleRemoveQuestion = (
    questionNumber,
  ) => {
    if (solutions.length === 0) {
      return;
    }

    setSolutions((prevSolutions) =>
      prevSolutions.map((test) => ({
        ...test,

        solutionBank:
          test.solutionBank.filter(
            (q) =>
              q.questionNumber !==
              questionNumber,
          ),
      })),
    );
  };

  // ============================================================
  // Update Test Metadata
  // ============================================================

  const updateTestMetadata =
    async () => {
      if (solutions.length === 0) {
        return;
      }

      setLoading(true);

      try {
        const solutionId =
          solutions[0].solutionRef._id;

        const response =
          await axios.put(
            `${process.env.REACT_APP_URL}/api/updatesolution/${solutionId}`,
            {
              testName:
                testMetadata.testName,

              date:
                testMetadata.date,

              stream:
                testMetadata.stream,

              questionType:
                testMetadata.questionType,
            },
          );

        setSolutions(
          (prevSolutions) =>
            prevSolutions.map(
              (test) => ({
                ...test,

                solutionRef: {
                  ...test.solutionRef,

                  testName:
                    testMetadata.testName,

                  date:
                    testMetadata.date,

                  stream:
                    testMetadata.stream,

                  questionType:
                    testMetadata.questionType,
                },
              }),
            ),
        );

        setFilters((prev) => ({
          ...prev,

          testName:
            testMetadata.testName,

          date:
            testMetadata.date,

          stream:
            testMetadata.stream,

          questionType:
            testMetadata.questionType,
        }));

        toast.success(
          "Test information updated successfully!",
        );

        setEditingTestInfo(false);
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            "Failed to update test information",
        );

        console.error(
          "Update test metadata error:",
          err,
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // Update Solutions
  // ============================================================

  const handleUpdateSolutions =
    async () => {
      if (solutions.length === 0) {
        return;
      }

      if (modifiedQuestions.size === 0) {
        toast.info(
          "No questions have been modified.",
        );
        return;
      }

      setLoading(true);

      try {
        console.log(
          "Starting solution update...",
        );

        // ------------------------------------------------------
        // Upload images
        // ------------------------------------------------------

        const formData = new FormData();

        Array.from(
          modifiedQuestions,
        ).forEach((index) => {
          if (imageUploads[index]) {
            formData.append(
              "images",
              imageUploads[index],
            );
          }
        });

        let imageUrls = {};

        if (
          formData.has("images")
        ) {
          console.log(
            "Uploading images for modified questions...",
          );

          try {
            const uploadResponse =
              await axios.post(
                `${process.env.REACT_APP_URL}/api/upload-images`,
                formData,
                {
                  headers: {
                    "Content-Type":
                      "multipart/form-data",
                  },
                },
              );

            imageUrls =
              uploadResponse.data
                .imageUrls;

            console.log(
              "Images uploaded successfully:",
              imageUrls,
            );
          } catch (uploadErr) {
            console.error(
              "Image upload failed:",
              uploadErr,
            );

            throw new Error(
              "Failed to upload images. Please try again.",
            );
          }
        }

        // ------------------------------------------------------
        // Prepare modified questions
        // ------------------------------------------------------

        const solutionBankUpdates =
          Array.from(
            modifiedQuestions,
          )
            .map((index) => {
              const sol =
                solutions[0]
                  .solutionBank[index];

              if (!sol) {
                return null;
              }

              const update = {
                questionNumber:
                  sol.questionNumber,

                questionText:
                  sol.questionText || "",

                questionImages:
                  imageUrls[index]
                    ? [imageUrls[index]]
                    : sol.questionImages ||
                      [],

                correctSolution:
                  sol.correctSolution ||
                  "",

                isGrace:
                  sol.isGrace || false,
              };

              if (
                solutions[0]
                  .solutionRef
                  .questionType ===
                  "MCQ" &&
                !sol.isGrace
              ) {
                update.correctOptions =
                  Array.isArray(
                    sol.correctOptions,
                  )
                    ? sol.correctOptions
                    : [];
              }

              console.log(
                `Question ${sol.questionNumber} update:`,
                update,
              );

              return update;
            })
            .filter(Boolean);

        if (
          solutionBankUpdates.length ===
          0
        ) {
          throw new Error(
            "No valid modified questions found.",
          );
        }

        // ------------------------------------------------------
        // Validate Solution IDs
        // ------------------------------------------------------

        const validSolutionIds =
          solutionIds.length > 0
            ? solutionIds
            : solutions
                .map(
                  (test) =>
                    test.solutionRef?._id,
                )
                .filter(Boolean);

        if (
          validSolutionIds.length === 0
        ) {
          throw new Error(
            "No solution IDs found. Please search again.",
          );
        }

        console.log(
          "Updating all Solution IDs:",
          validSolutionIds,
        );

        console.log(
          "SolutionBank updates:",
          solutionBankUpdates,
        );

        // ------------------------------------------------------
        // Bulk Update
        // ------------------------------------------------------

        const response =
          await axios.put(
            `${process.env.REACT_APP_URL}/api/updatesolutionsinbulk`,
            {
              solutionIds:
                validSolutionIds,

              solutionBank:
                solutionBankUpdates,
            },
            {
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          );

        console.log(
          "Update successful:",
          response.data,
        );

        // ------------------------------------------------------
        // Reset modified state
        // ------------------------------------------------------

        setImageUploads({});
        setModifiedQuestions(
          new Set(),
        );

        toast.success(
          `Successfully updated ${
            response.data.modifiedSolutions ||
            response.data.modifiedCount ||
            solutionBankUpdates.length
          } question entries!`,
          {
            position:
              "top-right",
            autoClose: 3000,
          },
        );

        if (onSuccess) {
          onSuccess(response.data);
        }
      } catch (err) {
        console.error(
          "Update error details:",
          err,
        );

        console.error(
          "Error response:",
          err.response,
        );

        let errorMessage =
          "Failed to update solutions";

        if (err.response) {
          if (
            err.response.data?.message?.includes(
              "Cast to ObjectId failed",
            )
          ) {
            errorMessage =
              "Invalid test ID. Please search for the test again.";
          } else if (
            err.response.status ===
            400
          ) {
            errorMessage =
              err.response.data
                ?.message ||
              "Invalid data format. Please check your inputs.";
          } else if (
            err.response.status ===
            404
          ) {
            errorMessage =
              "Test not found. It may have been deleted. Please search again.";
          } else if (
            err.response.status ===
            500
          ) {
            errorMessage =
              "Server error. Please try again later.";
          }
        } else if (err.message) {
          errorMessage = err.message;
        }

        toast.error(
          errorMessage,
          {
            position:
              "top-right",
            autoClose: 5000,
          },
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // Delete Solution
  // ============================================================

  const handleDeleteSolution =
    async () => {
      if (solutions.length === 0) {
        return;
      }

      try {
        setDeleting(true);

        await axios.delete(
          `${process.env.REACT_APP_URL}/api/deletesolution/${solutions[0].solutionRef._id}`,
        );

        toast.success(
          "Solution deleted successfully.",
        );

        setShowDeleteModal(false);
        setDeleteConfirmation("");

        setSolutions([]);
        setImageUploads({});
        setModifiedQuestions(
          new Set(),
        );
        setEditingTestInfo(false);

        resetPagination();

        setFilters((prev) => ({
          ...prev,
          questionType: "",
          testName: "",
          date: "",
        }));

        // Refresh test names
        try {
          const response =
            await axios.get(
              `${process.env.REACT_APP_URL}/api/getsolutiontestnames`,
              {
                params: {
                  stream:
                    filters.stream,
                },
              },
            );

          setTestNames(
            response.data.data || [],
          );
        } catch (err) {
          console.error(
            "Failed to refresh test names:",
            err,
          );
        }

        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
            "Failed to delete solution.",
        );
      } finally {
        setDeleting(false);
      }
    };

  // ============================================================
  // Duplicate Modal
  // ============================================================

  const openDuplicateModal =
    () => {
      if (solutions.length === 0) {
        return;
      }

      setDuplicateData({
        testName: "",
        date:
          solutions[0].solutionRef.date
            ?.split("T")[0] || "",

        stream:
          solutions[0].solutionRef
            .stream,

        questionType:
          solutions[0].solutionRef
            .questionType,
      });

      setShowDuplicateModal(true);
    };

  const handleDuplicateInputChange =
    (e) => {
      const {
        name,
        value,
      } = e.target;

      setDuplicateData(
        (prev) => ({
          ...prev,
          [name]: value,
        }),
      );
    };

  // ============================================================
  // Duplicate Solution
  // ============================================================

  const handleDuplicateSolution =
    async () => {
      if (solutions.length === 0) {
        return;
      }

      if (
        !duplicateData.testName.trim()
      ) {
        toast.error(
          "Please enter a Test Name.",
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await axios.post(
            `${process.env.REACT_APP_URL}/api/createduplicatesolution`,
            {
              sourceSolutionId:
                solutions[0]
                  .solutionRef
                  ._id,

              stream:
                duplicateData.stream,

              questionType:
                duplicateData.questionType,

              testName:
                duplicateData.testName.trim(),

              date:
                duplicateData.date,
            },
          );

        toast.success(
          response.data.message,
        );

        setShowDuplicateModal(
          false,
        );

        // ------------------------------------------------------
        // Refresh Test Name dropdown
        // ------------------------------------------------------

        try {
          const listResponse =
            await axios.get(
              `${process.env.REACT_APP_URL}/api/getsolutiontestnames`,
              {
                params: {
                  stream:
                    duplicateData.stream,
                },
              },
            );

          setTestNames(
            listResponse.data.data ||
              [],
          );
        } catch (err) {
          console.error(
            "Failed to refresh test names:",
            err,
          );
        }

        // ------------------------------------------------------
        // Search newly created duplicate
        // ------------------------------------------------------

        const params =
          new URLSearchParams({
            stream:
              duplicateData.stream,

            questionType:
              duplicateData.questionType,

            testName:
              duplicateData.testName.trim(),

            date:
              duplicateData.date,

            page: "1",

            limit:
              String(PAGE_SIZE),
          });

        const searchResponse =
          await axios.get(
            `${process.env.REACT_APP_URL}/api/getsolutionbank?${params.toString()}`,
          );

        const groupedSolutions =
          groupSolutionsByTest(
            searchResponse.data
              .data || [],
          );

        setSolutions(
          groupedSolutions,
        );

        const returnedSolutionIds =
          searchResponse.data
            .solutionIds ||
          groupedSolutions
            .map(
              (item) =>
                item.solutionRef?._id,
            )
            .filter(Boolean);

        setSolutionIds(
          returnedSolutionIds,
        );

        if (
          groupedSolutions.length >
          0
        ) {
          setFilters({
            stream:
              duplicateData.stream,

            questionType:
              duplicateData.questionType,

            testName:
              duplicateData.testName.trim(),

            date:
              duplicateData.date,
          });

          setTestMetadata({
            testName:
              groupedSolutions[0]
                .solutionRef
                .testName,

            date:
              groupedSolutions[0]
                .solutionRef
                .date
                ?.split("T")[0] ||
              "",

            stream:
              groupedSolutions[0]
                .solutionRef
                .stream,

            questionType:
              groupedSolutions[0]
                .solutionRef
                .questionType,
          });

          const currentPage =
            searchResponse.data
              .page || 1;

          const currentTotalPages =
            searchResponse.data
              .totalPages || 1;

          const currentTotal =
            searchResponse.data
              .total ??
            searchResponse.data
              .data?.length ??
            0;

          setPage(
            currentPage,
          );

          setTotalPages(
            currentTotalPages,
          );

          setTotalQuestions(
            currentTotal,
          );

          setHasMore(
            currentPage <
              currentTotalPages,
          );

          setEditingTestInfo(
            false,
          );

          setModifiedQuestions(
            new Set(),
          );

          setImageUploads({});
        }
      } catch (err) {
        console.error(err);

        toast.error(
          err.response?.data?.message ||
            "Failed to duplicate solution.",
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // Select Styles
  // ============================================================

  const customSelectStyles = {
    control: (
      base,
      state,
    ) => ({
      ...base,

      top: "4px",

      minHeight: "45px",

      borderColor:
        state.isFocused
          ? "#3B82F6"
          : "#d1d5db",

      boxShadow:
        state.isFocused
          ? "0 0 0 1px #3B82F6"
          : null,

      "&:hover": {
        borderColor:
          "#3B82F6",
      },
    }),

    valueContainer: (
      base,
    ) => ({
      ...base,

      padding:
        "0 0.75rem",
    }),
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}

      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">
          Edit Solutions
        </h1>
      </div>

      {/* Main */}

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        {/* Search Form */}

        <form
          onSubmit={handleSearch}
          className="space-y-4 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stream */}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stream
              </label>

              <select
                name="stream"
                value={filters.stream}
                onChange={
                  handleFilterChange
                }
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

            {/* Question Type */}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Question Type
              </label>

              <select
                name="questionType"
                value={
                  filters.questionType
                }
                onChange={
                  handleFilterChange
                }
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

            {/* Test Name */}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Test Name
              </label>

              <Select
                styles={
                  customSelectStyles
                }
                isClearable
                isSearchable
                options={testNames.map(
                  (name) => ({
                    value: name,
                    label: name,
                  }),
                )}
                onChange={(
                  selectedOption,
                ) => {
                  const value =
                    selectedOption
                      ? selectedOption.value
                      : "";

                  setFilters(
                    (prev) => ({
                      ...prev,
                      testName:
                        value,
                    }),
                  );
                }}
                placeholder="Search or select test..."
                className="react-select-container"
                classNamePrefix="react-select"
                value={
                  filters.testName
                    ? {
                        value:
                          filters.testName,

                        label:
                          filters.testName,
                      }
                    : null
                }
              />
            </div>

            {/* Date */}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>

              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={
                  handleFilterChange
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading
                  ? "opacity-50"
                  : ""
              }`}
            >
              {loading
                ? "Searching..."
                : "Search Solutions"}
            </button>
          </div>
        </form>

        {/* Results */}

        {solutions.length > 0 &&
          solutions[0]?.solutionRef && (
            <div className="border-t pt-6">
              {/* Header */}

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {
                      solutions[0]
                        .solutionRef
                        .testName
                    }{" "}
                    -{" "}
                    {new Date(
                      solutions[0]
                        .solutionRef
                        .date,
                    ).toLocaleDateString()}
                  </h2>

                  <div className="text-sm text-gray-500">
                    {totalQuestions}{" "}
                    questions |{" "}
                    {
                      solutions[0]
                        .solutionRef
                        .questionType
                    }{" "}
                    |{" "}
                    {
                      solutions[0]
                        .solutionRef
                        .stream
                    }
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingTestInfo(
                        !editingTestInfo,
                      )
                    }
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                  >
                    {editingTestInfo
                      ? "Cancel Edit"
                      : "Edit Test Info"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      openDuplicateModal
                    }
                    className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Duplicate
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmation(
                        "",
                      );

                      setShowDeleteModal(
                        true,
                      );
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Delete Test
                  </button>
                </div>
              </div>

              {/* Edit Test Info */}

              {editingTestInfo && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h3 className="font-medium mb-3">
                    Edit Test Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Test Name */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Test Name
                      </label>

                      <input
                        type="text"
                        name="testName"
                        value={
                          testMetadata.testName
                        }
                        onChange={
                          handleTestMetadataChange
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Date */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date
                      </label>

                      <input
                        type="date"
                        name="date"
                        value={
                          testMetadata.date
                        }
                        onChange={
                          handleTestMetadataChange
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Stream */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stream
                      </label>

                      <select
                        name="stream"
                        value={
                          testMetadata.stream
                        }
                        onChange={
                          handleTestMetadataChange
                        }
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

                    {/* Question Type */}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Question Type
                      </label>

                      <select
                        name="questionType"
                        value={
                          testMetadata.questionType
                        }
                        onChange={
                          handleTestMetadataChange
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="MCQ">
                          MCQ
                        </option>

                        <option value="Theory">
                          Theory
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4 space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTestInfo(
                          false,
                        )
                      }
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        updateTestMetadata
                      }
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      {loading
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Questions Header */}

              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">
                  Questions
                </h3>

                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={
                      handleAddNewQuestion
                    }
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Add Question
                  </button>
                </div>
              </div>

              {/* Questions */}

              <div className="space-y-4">
                {solutions[0].solutionBank.map(
                  (
                    solution,
                    index,
                  ) => (
                    <div
                      key={
                        solution._id ||
                        `${solution.questionNumber}-${index}`
                      }
                      className="border border-gray-200 rounded-lg p-4 mb-4 relative"
                    >
                      {/* Question Header */}

                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium">
                          Question{" "}
                          {
                            solution.questionNumber
                          }
                        </h3>

                        <div className="flex items-center space-x-2">
                          {/* Remove */}

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveQuestion(
                                solution.questionNumber,
                              )
                            }
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>

                          {/* Grace */}

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`grace-${index}`}
                              checked={
                                solution.isGrace
                              }
                              onChange={() =>
                                handleGraceToggle(
                                  index,
                                )
                              }
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />

                            <label
                              htmlFor={`grace-${index}`}
                              className="ml-2 text-sm font-medium text-gray-700"
                            >
                              Grace
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Question Text */}

                      {/* <div className="mb-4">
                        <label
                          className={`block text-sm font-medium ${
                            solution.isGrace
                              ? "text-gray-400"
                              : "text-gray-700"
                          } mb-1`}
                        >
                          Question Text
                        </label>

                        <textarea
                          rows={4}
                          maxLength={1000}
                          value={
                            solution.questionText ||
                            ""
                          }
                          disabled={
                            solution.isGrace
                          }
                          onChange={(e) =>
                            handleSolutionChange(
                              index,
                              "questionText",
                              e.target.value,
                            )
                          }
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                            solution.isGrace
                              ? "bg-gray-100 border-gray-200"
                              : "border-gray-300"
                          }`}
                        />

                        <div className="text-right text-xs text-gray-500 mt-1">
                          {(
                            solution.questionText ||
                            ""
                          ).length}
                          /1000
                        </div>
                      </div> */}

                      {/* Existing Image */}

                      {/* {solution.questionImages
                        ?.length > 0 && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">
                            Existing Question
                            Image
                          </label>

                          <img
                            src={
                              solution
                                .questionImages[0]
                            }
                            alt=""
                            className="w-56 rounded shadow border"
                          />
                        </div>
                      )} */}

                      {/* MCQ Options */}

                      {solutions[0]
                        .solutionRef
                        .questionType ===
                        "MCQ" && (
                        <div className="mb-3">
                          <label
                            className={`block text-sm font-medium ${
                              solution.isGrace
                                ? "text-gray-400"
                                : "text-gray-700"
                            } mb-2`}
                          >
                            Correct Option(s)
                          </label>

                          <div className="flex space-x-4">
                            {[
                              "A",
                              "B",
                              "C",
                              "D",
                            ].map(
                              (opt) => (
                                <div
                                  key={opt}
                                  className="flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    id={`q${index}-opt${opt}`}
                                    checked={
                                      solution.correctOptions?.includes(
                                        opt,
                                      ) ||
                                      false
                                    }
                                    onChange={() =>
                                      handleOptionToggle(
                                        index,
                                        opt,
                                      )
                                    }
                                    disabled={
                                      solution.isGrace
                                    }
                                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                      solution.isGrace
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  />

                                  <label
                                    htmlFor={`q${index}-opt${opt}`}
                                    className={`ml-2 text-sm ${
                                      solution.isGrace
                                        ? "text-gray-400"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {opt}
                                  </label>
                                </div>
                              ),
                            )}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            Current:{" "}
                            {solution.correctOptions?.join(
                              ", ",
                            ) ||
                              "None selected"}
                          </div>
                        </div>
                      )}

                      {/* Correct Solution */}

                      <div className="mb-3">
                        <label
                          className={`block text-sm font-medium ${
                            solution.isGrace
                              ? "text-gray-400"
                              : "text-gray-700"
                          } mb-1`}
                        >
                          Correct Solution
                        </label>

                        <textarea
                          value={
                            solution.correctSolution ||
                            ""
                          }
                          onChange={(e) =>
                            handleSolutionChange(
                              index,
                              "correctSolution",
                              e.target.value,
                            )
                          }
                          disabled={
                            solution.isGrace
                          }
                          className={`block w-full px-3 py-2 border ${
                            solution.isGrace
                              ? "bg-gray-100 border-gray-200"
                              : "border-gray-300"
                          } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          rows={3}
                        />
                      </div>
                    </div>
                  ),
                )}

                {/* Infinite Scroll Trigger */}

                {hasMore && (
                  <div
                    ref={
                      lastQuestionElementRef
                    }
                    className="py-6 text-center text-gray-500"
                  >
                    {isLoadingMore
                      ? "Loading more questions..."
                      : "Scroll to load more questions..."}
                  </div>
                )}

                {/* All Loaded */}

                {!hasMore &&
                  totalQuestions > 0 &&
                  solutions[0]
                    .solutionBank
                    .length >=
                    totalQuestions && (
                    <div className="py-6 text-center text-gray-500">
                      All{" "}
                      {totalQuestions}{" "}
                      questions loaded.
                    </div>
                  )}
              </div>

              {/* Bottom Buttons */}

              <div className="mt-6 border-t pt-4">
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSolutions([]);
                      setImageUploads(
                        {},
                      );
                      setModifiedQuestions(
                        new Set(),
                      );

                      resetPagination();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Clear Results
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleUpdateSolutions
                    }
                    disabled={loading}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      loading
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    {loading
                      ? "Updating..."
                      : "Update Solutions"}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Delete Modal */}

        {showDeleteModal &&
          solutions.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
                <h2 className="text-xl font-bold text-red-600 mb-4">
                  Delete Test Solution
                </h2>

                <div className="space-y-2 text-sm">
                  <p>
                    <strong>
                      Test Name:
                    </strong>{" "}
                    {
                      solutions[0]
                        .solutionRef
                        .testName
                    }
                  </p>

                  <p>
                    <strong>
                      Date:
                    </strong>{" "}
                    {new Date(
                      solutions[0]
                        .solutionRef
                        .date,
                    ).toLocaleDateString()}
                  </p>

                  <p>
                    <strong>
                      Stream:
                    </strong>{" "}
                    {
                      solutions[0]
                        .solutionRef
                        .stream
                    }
                  </p>

                  <p>
                    <strong>
                      Question Type:
                    </strong>{" "}
                    {
                      solutions[0]
                        .solutionRef
                        .questionType
                    }
                  </p>

                  <p>
                    <strong>
                      Total Questions:
                    </strong>{" "}
                    {totalQuestions}
                  </p>
                </div>

                <div className="mt-5 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-red-700 text-sm font-medium">
                    This action is
                    permanent.
                  </p>

                  <p className="text-sm mt-2">
                    Type the test name
                    below to enable
                    deletion.
                  </p>
                </div>

                <input
                  type="text"
                  className="mt-4 w-full border rounded-md p-2"
                  placeholder={
                    solutions[0]
                      .solutionRef
                      .testName
                  }
                  value={
                    deleteConfirmation
                  }
                  onChange={(e) =>
                    setDeleteConfirmation(
                      e.target.value,
                    )
                  }
                />

                <div className="flex justify-end mt-6 space-x-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(
                        false,
                      );

                      setDeleteConfirmation(
                        "",
                      );
                    }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleDeleteSolution
                    }
                    disabled={
                      deleting ||
                      deleteConfirmation !==
                        solutions[0]
                          .solutionRef
                          .testName
                    }
                    className={`px-4 py-2 rounded text-white ${
                      deleteConfirmation ===
                      solutions[0]
                        .solutionRef
                        .testName
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {deleting
                      ? "Deleting..."
                      : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Duplicate Modal */}

        {showDuplicateModal &&
          solutions.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
                <h2 className="text-xl font-bold text-indigo-600 mb-4">
                  Duplicate Test
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Test Name */}

                  <div>
                    <label className="block text-sm font-medium">
                      Test Name
                    </label>

                    <input
                      type="text"
                      name="testName"
                      value={
                        duplicateData.testName
                      }
                      onChange={
                        handleDuplicateInputChange
                      }
                      className="mt-1 w-full border rounded-md p-2"
                    />
                  </div>

                  {/* Date */}

                  <div>
                    <label className="block text-sm font-medium">
                      Date
                    </label>

                    <input
                      type="date"
                      name="date"
                      value={
                        duplicateData.date
                      }
                      onChange={
                        handleDuplicateInputChange
                      }
                      className="mt-1 w-full border rounded-md p-2"
                    />
                  </div>

                  {/* Stream */}

                  <div>
                    <label className="block text-sm font-medium">
                      Stream
                    </label>

                    <select
                      name="stream"
                      value={
                        duplicateData.stream
                      }
                      onChange={
                        handleDuplicateInputChange
                      }
                      className="mt-1 w-full border rounded-md p-2"
                    >
                      <option value="LongTerm">
                        Long Term
                      </option>

                      <option value="PUC">
                        PUC
                      </option>
                    </select>
                  </div>

                  {/* Question Type */}

                  <div>
                    <label className="block text-sm font-medium">
                      Question Type
                    </label>

                    <select
                      name="questionType"
                      value={
                        duplicateData.questionType
                      }
                      onChange={
                        handleDuplicateInputChange
                      }
                      className="mt-1 w-full border rounded-md p-2"
                    >
                      <option value="MCQ">
                        MCQ
                      </option>

                      <option value="Theory">
                        Theory
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 bg-gray-50 rounded p-3">
                  <p>
                    <strong>
                      Source Test:
                    </strong>{" "}
                    {
                      solutions[0]
                        .solutionRef
                        .testName
                    }
                  </p>

                  <p>
                    <strong>
                      Total Questions:
                    </strong>{" "}
                    {totalQuestions}
                  </p>
                </div>

                <div className="flex justify-end mt-6 space-x-2">
                  <button
                    onClick={() =>
                      setShowDuplicateModal(
                        false,
                      )
                    }
                    className="px-4 py-2 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={
                      handleDuplicateSolution
                    }
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Create Duplicate
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default EditSolutionsForm;