import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const FeedbackAdmin = () => {
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [existingFeedbacks, setExistingFeedbacks] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role) setUserRole(role);
    fetchFeedbackForms();
  }, []);

  useEffect(() => {
    const fetchExistingFeedbacks = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getfeedbacks`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setExistingFeedbacks(response.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch existing feedbacks");
      }
    };
    fetchExistingFeedbacks();
  }, []);

  const fetchFeedbackForms = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getfeedbackforms`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setFeedbackForms(response.data.data);
      setIsLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch feedback forms");
      setIsLoading(false);
    }
  };

  const handleQuestionSelect = (question) => {
    setSelectedQuestions(prev => {
      const isSelected = prev.some(q => q.questionNumber === question.questionNumber);
      if (isSelected) {
        return prev.filter(q => q.questionNumber !== question.questionNumber);
      } else {
        return [...prev, question];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedQuestions([]);
    } else {
      const allQuestions = feedbackForms.flatMap(form => 
        form.questions.map(question => ({
          ...question,
          questionNumber: question.questionNumber
        }))
      );
      setSelectedQuestions(allQuestions);
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!feedbackName.trim()) {
      toast.error("Please enter a feedback name");
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Sort questions by their original question number before sending
      const sortedQuestions = [...selectedQuestions].sort((a, b) => {
        const numA = parseInt(a.questionNumber.replace('Q', ''));
        const numB = parseInt(b.questionNumber.replace('Q', ''));
        return numA - numB;
      });

      const payload = {
        name: feedbackName,
        date: selectedDate,
        questionNumbers: sortedQuestions.map(q => q.questionNumber),
        createdBy: userRole 
      };

      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/createfeedback`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      toast.success("Feedback created successfully");
      setSelectedQuestions([]);
      setSelectAll(false);
      setFeedbackName("");
      setSelectedDate(new Date());
      
      // Refresh existing feedbacks
      const feedbacksResponse = await axios.get(
        `${process.env.REACT_APP_URL}/api/getfeedbacks`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setExistingFeedbacks(feedbacksResponse.data.data);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create feedback";
      toast.error(errorMessage);
      
      if (errorMessage.includes("already exists")) {
        setSelectedDate(new Date(selectedDate.getTime())); 
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderExistingFeedbacks = () => (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Existing Feedbacks</h3>
      {existingFeedbacks.length === 0 ? (
        <p className="text-gray-500">No existing feedbacks found</p>
      ) : (
        <div className="space-y-2">
          {existingFeedbacks.map(feedback => (
            <div 
              key={feedback._id} 
              className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                selectedDate.toDateString() === new Date(feedback.date).toDateString() 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
              onClick={() => {
                setSelectedDate(new Date(feedback.date));
                setFeedbackName(feedback.name || "");
                // Load questions from existing feedback when clicked
                setSelectedQuestions(feedback.questions);
              }}
            >
              <p className="font-medium">
                {feedback.name || "Untitled Feedback"}
              </p>
              <p className="text-sm text-gray-500">
                Date: {new Date(feedback.date).toLocaleDateString()} | 
                Questions: {feedback.questions.length} | 
                Created by: {feedback.createdBy}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Feedback</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Feedback Name
              </label>
              <input
                type="text"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter feedback name"
                required
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                //minDate={new Date()}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-lg font-medium text-gray-700">
                Available Questions
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="select-all"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Select All
                </label>
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : feedbackForms.length === 0 ? (
              <p className="text-gray-500">No questions found</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto p-2 border rounded">
                {feedbackForms.flatMap(form => 
                  form.questions.map((question, index) => (
                    <div key={`${form._id}-${index}`} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`question-${form._id}-${index}`}
                        checked={selectedQuestions.some(
                          q => q.questionNumber === question.questionNumber
                        )}
                        onChange={() => handleQuestionSelect(question)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`question-${form._id}-${index}`}
                        className="ml-2 block text-gray-700"
                      >
                        <span className="font-medium">{question.questionNumber}:</span> {question.questionStatement}
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedQuestions.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Selected Questions ({selectedQuestions.length}):</h3>
              <ul className="list-disc pl-5">
                {selectedQuestions
                  .sort((a, b) => {
                    const numA = parseInt(a.questionNumber.replace('Q', ''));
                    const numB = parseInt(b.questionNumber.replace('Q', ''));
                    return numA - numB;
                  })
                  .map((q, i) => (
                    <li key={i}>{q.questionNumber}: {q.questionStatement}</li>
                  ))
                }
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? "Creating..." : "Create Feedback"}
            </button>
          </div>
        </form>
      </div>
      {renderExistingFeedbacks()}
    </div>
  );
};

export default FeedbackAdmin;