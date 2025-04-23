import React, { useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "react-feather";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SolutionForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    stream: "LongTerm",
    questionType: "MCQ",
    testName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    questionCount: 1,
    solutions: []
  });

  const [loading, setLoading] = useState(false);
  const [imageUploads, setImageUploads] = useState({}); // Stores image files for each question

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e) => {
    setFormData(prev => ({ ...prev, date: e.target.value }));
  };

  const handleQuestionCountChange = (e) => {
    const count = parseInt(e.target.value) || 1;
    setFormData(prev => {
      const solutions = Array(count).fill().map((_, i) => {
        const questionNumber = i + 1;
        return prev.solutions[i] ? 
          { ...prev.solutions[i], questionNumber } : 
          { 
            questionNumber, 
            correctOptions: [], // Changed to array for multiple options
            correctSolution: "" 
          };
      }).slice(0, count);
      return { ...prev, questionCount: count, solutions };
    });
  };

  const handleSolutionChange = (index, field, value) => {
    setFormData(prev => {
      const updatedSolutions = [...prev.solutions];
      updatedSolutions[index] = { ...updatedSolutions[index], [field]: value };
      return { ...prev, solutions: updatedSolutions };
    });
  };

  const handleOptionToggle = (index, option) => {
    setFormData(prev => {
      const updatedSolutions = [...prev.solutions];
      const currentOptions = updatedSolutions[index]?.correctOptions || [];
      
      if (currentOptions.includes(option)) {
        // Remove option if already selected
        updatedSolutions[index] = {
          ...updatedSolutions[index],
          correctOptions: currentOptions.filter(opt => opt !== option)
        };
      } else {
        // Add option if not selected
        updatedSolutions[index] = {
          ...updatedSolutions[index],
          correctOptions: [...currentOptions, option]
        };
      }
      
      return { ...prev, solutions: updatedSolutions };
    });
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      setImageUploads(prev => ({
        ...prev,
        [index]: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare form data for image uploads
      const formDataWithImages = new FormData();
      const solutionsWithImageRefs = [];

      // First upload all images and get their references
      for (let index = 0; index < formData.questionCount; index++) {
        if (imageUploads[index]) {
          formDataWithImages.append('images', imageUploads[index]);
        }
      }

      let imageReferences = {};
      if (Object.keys(imageUploads).length > 0) {
        const uploadResponse = await axios.post(
          `${process.env.REACT_APP_URL}/api/upload-images`,
          formDataWithImages,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        imageReferences = uploadResponse.data.imageUrls;
      }

      // Prepare solutions with image references
      const validatedSolutions = formData.solutions.map((sol, index) => {
        const solutionText = sol.correctSolution;
        let solutionWithImages = solutionText;
        
        // Replace image placeholders with actual URLs if they exist
        if (imageUploads[index]) {
          const imageUrl = imageReferences[index];
          solutionWithImages += `\n\n![image](${imageUrl})`;
        }

        return {
          questionNumber: sol.questionNumber || index + 1,
          correctOptions: formData.questionType === "MCQ" ? (sol.correctOptions || []) : undefined,
          correctSolution: solutionWithImages
        };
      });

      const payload = {
        stream: formData.stream,
        questionType: formData.questionType,
        testName: formData.testName,
        date: formData.date,
        solutionBank: validatedSolutions
      };

      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/createsolution`,
        payload
      );
      
      onSuccess(response.data);
      setFormData({
        stream: "LongTerm",
        questionType: "MCQ",
        testName: "",
        date: format(new Date(), "yyyy-MM-dd"),
        questionCount: 1,
        solutions: []
      });
      setImageUploads({});
      toast.success("Solution created successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create solution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col mb-2">
        <h1 className="text-3xl font-bold">Add Solutions</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stream Selection */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Stream</label>
            <select
              name="stream"
              value={formData.stream}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="LongTerm">Long Term</option>
              <option value="PUC">PUC</option>
            </select>
          </div>

          {/* Question Type Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Question Type</label>
            <select
              name="questionType"
              value={formData.questionType}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="MCQ">MCQ</option>
              <option value="FillInTheBlanks">Fill in the Blanks</option>
              <option value="TrueFalse">True/False</option>
            </select>
          </div>

          {/* Test Name Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Test Name</label>
            <input
              type="text"
              name="testName"
              value={formData.testName}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <div className="relative">
              <input
                type="date"
                value={formData.date}
                onChange={handleDateChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 mt-4">
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter the Questions Range from 1 to:
            </label>
            <input
              type="number"
              min="1"
              value={formData.questionCount}
              onChange={handleQuestionCountChange}
              className="mb-2 block w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Solutions: </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Array.from({ length: formData.questionCount }).map((_, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h4 className="font-medium text-gray-800 mb-3">Question {index + 1}</h4>
                {formData.questionType === "MCQ" && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Option(s) - Select all that apply
                    </label>
                    <div className="flex space-x-4">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`q${index}-opt${opt}`}
                            checked={formData.solutions[index]?.correctOptions?.includes(opt) || false}
                            onChange={() => handleOptionToggle(index, opt)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <label 
                            htmlFor={`q${index}-opt${opt}`}
                            className="ml-2 block text-sm font-medium text-gray-700"
                          >
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Solution
                  </label>
                  <textarea
                    value={formData.solutions[index]?.correctSolution || ""}
                    onChange={(e) => handleSolutionChange(index, 'correctSolution', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(index, e)}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                  {imageUploads[index] && (
                    <div className="mt-2 text-sm text-green-600">
                      {imageUploads[index].name} selected
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? "Processing..." : "Submit Solutions"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SolutionForm;