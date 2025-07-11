import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";

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
  const [imageUploads, setImageUploads] = useState({});
  const [modifiedQuestions, setModifiedQuestions] = useState(new Set());
  const [editingTestInfo, setEditingTestInfo] = useState(false);
  const [testMetadata, setTestMetadata] = useState({
    testName: "",
    date: "",
    stream: "LongTerm",
    questionType: "",
  });

  // Fetch test names when stream changes
  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank?stream=${filters.stream}`
        );
        const uniqueTestNames = [
          ...new Set(
            response.data.data.map((item) => item.solutionRef.testName)
          ),
        ];
        setTestNames(uniqueTestNames);
      } catch (err) {
        toast.error("Failed to load test names");
        console.error("Test names fetch error:", err);
      }
    };
    fetchTestNames();
  }, [filters.stream]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleTestMetadataChange = (e) => {
    const { name, value } = e.target;
    setTestMetadata((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSolutions([]);
    setImageUploads({});
    setEditingTestInfo(false);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getsolutionbank?${params.toString()}`
      );
      const groupedSolutions = groupSolutionsByTest(response.data.data);

      if (groupedSolutions.length === 0) {
        toast.info("No solutions found matching your criteria");
      } else {
        toast.success(`Found solutions for ${groupedSolutions.length} tests`);
        // Set test metadata when solutions are found
        setTestMetadata({
          testName: groupedSolutions[0].solutionRef.testName,
          date: groupedSolutions[0].solutionRef.date.split("T")[0],
          stream: groupedSolutions[0].solutionRef.stream,
          questionType: groupedSolutions[0].solutionRef.questionType,
        });
      }

      setSolutions(groupedSolutions);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to fetch solutions";
      toast.error(errorMsg);
      console.error("Solutions fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const groupSolutionsByTest = (solutionBank) => {
    const groups = {};
    solutionBank.forEach((item) => {
      const key = item.solutionRef._id;
      if (!groups[key]) {
        groups[key] = {
          solutionRef: item.solutionRef,
          solutionBank: [],
        };
      }

      const correctOptions = Array.isArray(item.correctOptions)
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
        (a, b) => a.questionNumber - b.questionNumber
      ),
    }));
  };

  const handleOptionToggle = (questionIndex, option) => {
    setSolutions((prevSolutions) => {
      return prevSolutions.map((test) => ({
        ...test,
        solutionBank: test.solutionBank.map((question, idx) => {
          if (idx !== questionIndex) return question;

          const newOptions = question.correctOptions.includes(option)
            ? question.correctOptions.filter((opt) => opt !== option)
            : [...question.correctOptions, option];

          return {
            ...question,
            correctOptions: newOptions,
          };
        }),
      }));
    });
    setModifiedQuestions((prev) => new Set(prev).add(questionIndex));
  };

  const handleSolutionChange = (questionIndex, value) => {
    setSolutions((prevSolutions) => {
      return prevSolutions.map((test) => ({
        ...test,
        solutionBank: test.solutionBank.map((question, idx) => {
          if (idx !== questionIndex) return question;
          return {
            ...question,
            correctSolution: value,
          };
        }),
      }));
    });
    setModifiedQuestions((prev) => new Set(prev).add(questionIndex));
  };

  const handleGraceToggle = (questionIndex) => {
    setSolutions((prevSolutions) => {
      return prevSolutions.map((test) => ({
        ...test,
        solutionBank: test.solutionBank.map((question, idx) => {
          if (idx !== questionIndex) return question;
          return {
            ...question,
            isGrace: !question.isGrace,
          };
        }),
      }));
    });
    setModifiedQuestions((prev) => new Set(prev).add(questionIndex));
  };

  const handleImageUpload = (index, e) => {
    if (e.target.files && e.target.files[0]) {
      setImageUploads((prev) => ({
        ...prev,
        [index]: e.target.files[0],
      }));
      setModifiedQuestions((prev) => new Set(prev).add(index));
    }
  };

  const handleAddNewQuestion = () => {
    if (solutions.length === 0) return;

    const newQuestionNumber =
      solutions[0].solutionBank.length > 0
        ? Math.max(...solutions[0].solutionBank.map((q) => q.questionNumber)) +
          1
        : 1;

    setSolutions((prevSolutions) => {
      return prevSolutions.map((test) => ({
        ...test,
        solutionBank: [
          ...test.solutionBank,
          {
            questionNumber: newQuestionNumber,
            correctOptions: [],
            correctSolution: "",
            isGrace: false,
            solutionRef: test.solutionRef._id,
            date: test.solutionRef.date,
          },
        ],
      }));
    });
  };

  const handleRemoveQuestion = (questionNumber) => {
    if (solutions.length === 0) return;

    setSolutions((prevSolutions) => {
      return prevSolutions.map((test) => ({
        ...test,
        solutionBank: test.solutionBank.filter(
          (q) => q.questionNumber !== questionNumber
        ),
      }));
    });
  };

  const updateTestMetadata = async () => {
    if (solutions.length === 0) return;
    setLoading(true);

    try {
      const solutionId = solutions[0].solutionRef._id;
      const response = await axios.put(
        `${process.env.REACT_APP_URL}/api/updatesolution/${solutionId}`,
        {
          testName: testMetadata.testName,
          date: testMetadata.date,
          stream: testMetadata.stream,
          questionType: testMetadata.questionType,
        }
      );

      // Update local state
      setSolutions((prevSolutions) => {
        return prevSolutions.map((test) => ({
          ...test,
          solutionRef: {
            ...test.solutionRef,
            testName: testMetadata.testName,
            date: testMetadata.date,
            stream: testMetadata.stream,
            questionType: testMetadata.questionType,
          },
        }));
      });

      setFilters((prev) => ({
        ...prev,
        testName: testMetadata.testName,
        date: testMetadata.date,
        stream: testMetadata.stream,
        questionType: testMetadata.questionType,
      }));

      toast.success("Test information updated successfully!");
      setEditingTestInfo(false);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update test information"
      );
      console.error("Update test metadata error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSolutions = async () => {
    if (solutions.length === 0) return;
    setLoading(true);

    try {
      console.log("Starting solution update...");

      // Upload images first if any (only for modified questions)
      const formData = new FormData();
      Array.from(modifiedQuestions).forEach((index) => {
        if (imageUploads[index]) {
          formData.append("images", imageUploads[index]);
        }
      });

      let imageUrls = {};
      if (formData.has("images")) {
        console.log("Uploading images for modified questions...");
        try {
          const uploadResponse = await axios.post(
            `${process.env.REACT_APP_URL}/api/upload-images`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          imageUrls = uploadResponse.data.imageUrls;
          console.log("Images uploaded successfully:", imageUrls);
        } catch (uploadErr) {
          console.error("Image upload failed:", uploadErr);
          throw new Error("Failed to upload images. Please try again.");
        }
      }

      // Prepare updates only for modified questions
      console.log("Preparing updates for modified questions...");
      const solutionBankUpdates = Array.from(modifiedQuestions).map((index) => {
        const sol = solutions[0].solutionBank[index];
        const update = {
          questionNumber: sol.questionNumber,
          correctSolution: imageUrls[index]
            ? `${sol.correctSolution}\n\n![image](${imageUrls[index]})`
            : sol.correctSolution,
          isGrace: sol.isGrace || false,
        };

        if (solutions[0].solutionRef.questionType === "MCQ" && !sol.isGrace) {
          update.correctOptions = sol.correctOptions;
        }

        console.log(`Question ${sol.questionNumber} update:`, update);
        return update;
      });

      // Validate solution ID
      if (!solutions[0].solutionRef._id) {
        console.error("Missing solution ID");
        throw new Error("Invalid test data. Please search again.");
      }

      console.log("Sending update request for modified questions:", {
        solutionId: solutions[0].solutionRef._id,
        solutionBank: solutionBankUpdates,
      });

      const response = await axios.put(
        `${process.env.REACT_APP_URL}/api/updatesolutionsinbulk`,
        {
          solutionId: solutions[0].solutionRef._id,
          solutionBank: solutionBankUpdates,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Update successful, response:", response.data);
      onSuccess(response.data);
      setImageUploads({});
      setModifiedQuestions(new Set());
      toast.success(
        `Successfully updated ${
          response.data.modifiedCount || solutionBankUpdates.length
        } solutions!`,
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    } catch (err) {
      console.error("Update error details:", err);
      console.error("Error response:", err.response);

      let errorMessage = "Failed to update solutions";

      if (err.response) {
        if (err.response.data?.message?.includes("Cast to ObjectId failed")) {
          errorMessage = "Invalid test ID. Please search for the test again.";
        } else if (err.response.status === 400) {
          errorMessage =
            err.response.data.message ||
            "Invalid data format. Please check your inputs.";
        } else if (err.response.status === 404) {
          errorMessage =
            "Test not found. It may have been deleted. Please search again.";
        } else if (err.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold">Edit Solutions</h1>
      </div>

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
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
              {loading ? "Searching..." : "Search Solutions"}
            </button>
          </div>
        </form>

        {solutions.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {solutions[0].solutionRef.testName} -{" "}
                  {new Date(solutions[0].solutionRef.date).toLocaleDateString()}
                </h2>
                <div className="text-sm text-gray-500">
                  {solutions[0].solutionBank.length} questions |{" "}
                  {solutions[0].solutionRef.questionType} |{" "}
                  {solutions[0].solutionRef.stream}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingTestInfo(!editingTestInfo)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                {editingTestInfo ? "Cancel Edit" : "Edit Test Info"}
              </button>
            </div>

            {editingTestInfo && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-3">Edit Test Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Test Name
                    </label>
                    <input
                      type="text"
                      name="testName"
                      value={testMetadata.testName}
                      onChange={handleTestMetadataChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={testMetadata.date}
                      onChange={handleTestMetadataChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Stream
                    </label>
                    <select
                      name="stream"
                      value={testMetadata.stream}
                      onChange={handleTestMetadataChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="LongTerm">Long Term</option>
                      <option value="PUC">PUC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Question Type
                    </label>
                    <select
                      name="questionType"
                      value={testMetadata.questionType}
                      onChange={handleTestMetadataChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="Theory">Theory</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mt-4 space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingTestInfo(false)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={updateTestMetadata}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Questions</h3>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={handleAddNewQuestion}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Add Question
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {solutions[0].solutionBank.map((solution, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 mb-4 relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium">
                      Question {solution.questionNumber}
                    </h3>

                    <div className="flex items-center space-x-2">
                      {/* Remove question button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveQuestion(solution.questionNumber)
                        }
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>

                      {/* Grace (E) checkbox */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`grace-${index}`}
                          checked={solution.isGrace}
                          onChange={() => handleGraceToggle(index)}
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

                  {solutions[0].solutionRef.questionType === "MCQ" && (
                    <div className="mb-3">
                      <label
                        className={`block text-sm font-medium ${
                          solution.isGrace ? "text-gray-400" : "text-gray-700"
                        } mb-2`}
                      >
                        Correct Option(s)
                      </label>
                      <div className="flex space-x-4">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div key={opt} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`q${index}-opt${opt}`}
                              checked={solution.correctOptions.includes(opt)}
                              onChange={() => handleOptionToggle(index, opt)}
                              disabled={solution.isGrace}
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
                        ))}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Current:{" "}
                        {solution.correctOptions.join(", ") || "None selected"}
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label
                      className={`block text-sm font-medium ${
                        solution.isGrace ? "text-gray-400" : "text-gray-700"
                      } mb-1`}
                    >
                      Correct Solution
                    </label>
                    <textarea
                      value={solution.correctSolution}
                      onChange={(e) =>
                        handleSolutionChange(index, e.target.value)
                      }
                      disabled={solution.isGrace}
                      className={`block w-full px-3 py-2 border ${
                        solution.isGrace
                          ? "bg-gray-100 border-gray-200"
                          : "border-gray-300"
                      } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        solution.isGrace ? "text-gray-400" : "text-gray-700"
                      } mb-1`}
                    >
                      Upload New Image (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(index, e)}
                      disabled={solution.isGrace}
                      className={`block w-full text-sm ${
                        solution.isGrace ? "text-gray-400" : "text-gray-500"
                      } file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold ${
                        solution.isGrace
                          ? "file:bg-gray-100 file:text-gray-400"
                          : "file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      }`}
                    />
                    {imageUploads[index] && (
                      <div className="mt-1 text-sm text-green-600">
                        {imageUploads[index].name} selected
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSolutions([]);
                    setImageUploads({});
                    setModifiedQuestions(new Set());
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Clear Results
                </button>
                <button
                  type="button"
                  onClick={handleUpdateSolutions}
                  disabled={loading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    loading ? "opacity-50" : ""
                  }`}
                >
                  {loading ? "Updating..." : "Update Solutions"}
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
