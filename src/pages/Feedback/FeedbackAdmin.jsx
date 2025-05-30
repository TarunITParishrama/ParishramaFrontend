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

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem("userRole");
    if (role) setUserRole(role);
    
    fetchFeedbackForms();
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

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (selectedQuestions.length === 0) {
    toast.error("Please select at least one question");
    return;
  }

  try {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const payload = {
      date: selectedDate,
      questionNumbers: selectedQuestions.map(q => q.questionNumber),
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
    setSelectedDate(new Date());
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to create feedback";
    toast.error(errorMessage);
    
    // If the error is about duplicate date, suggest a new date
    if (errorMessage.includes("already exists")) {
      setSelectedDate(new Date(selectedDate.getTime())); 
    }
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Feedback</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
              minDate={new Date()}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Available Questions
            </label>
            
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : feedbackForms.length === 0 ? (
              <p className="text-gray-500">No questions found</p>
            ) : (
              <div className="space-y-3">
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
                  )))
                }
              </div>
            )}
          </div>
            {selectedQuestions.length > 0 && (
  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
    <h3 className="font-medium mb-2">Selected Questions:</h3>
    <ul className="list-disc pl-5">
      {selectedQuestions.map((q, i) => (
        <li key={i}>{q.questionNumber}: {q.questionStatement}</li>
      ))}
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
    </div>
  );
};

export default FeedbackAdmin;