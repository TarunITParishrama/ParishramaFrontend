import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

const FeedbackForm = () => {
  const [questions, setQuestions] = useState([
    {
      questionNumber: "Q1",
      questionStatement: "",
      options: {
        A: "Excellent",
        B: "Good",
        C: "Average",
        D: "Poor"
      }
    }
  ]);
  const [savedForms, setSavedForms] = useState([]);
  const [currentFormId, setCurrentFormId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch existing feedback forms on component mount
  useEffect(() => {
    fetchFeedbackForms();
  }, []);

  const fetchFeedbackForms = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getfeedbackforms`,{
        headers: {
          Authorization: `Bearer ${token}`
        }
      }

      );
      setSavedForms(response.data.data);
      setIsLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch feedback forms");
      setIsLoading(false);
    }
  };

  const handleQuestionChange = (index, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index].questionStatement = value;
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    const newQuestionNumber = `Q${questions.length + 1}`;
    setQuestions([
      ...questions,
      {
        questionNumber: newQuestionNumber,
        questionStatement: "",
        options: {
          A: "Excellent",
          B: "Good",
          C: "Average",
          D: "Poor"
        }
      }
    ]);
  };

  const deleteQuestion = (index) => {
    if (questions.length <= 1) {
      toast.warning("At least one question is required");
      return;
    }

    const updatedQuestions = questions.filter((_, i) => i !== index);
    // Renumber remaining questions
    const renumberedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      questionNumber: `Q${i + 1}`
    }));
    setQuestions(renumberedQuestions);
  };

  const startEdit = (index) => {
    setIsEditing(index);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = (index) => {
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate questions
  const emptyQuestions = questions.filter(q => !q.questionStatement.trim());
  if (emptyQuestions.length > 0) {
    toast.error("Please fill in all question statements");
    return;
  }

  try {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("You need to login first");
      setIsLoading(false);
      return;
    }

    const payload = {
      questions: questions.map(q => ({
        questionNumber: q.questionNumber,
        questionStatement: q.questionStatement
      }))
    };

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    let response;
    if (currentFormId) {
      response = await axios.put(
        `${process.env.REACT_APP_URL}/api/updatefeedbackform/${currentFormId}`,
        payload,
        config
      );
      toast.success("Feedback form updated successfully");
    } else {
      response = await axios.post(
        `${process.env.REACT_APP_URL}/api/createfeedbackform`,
        payload,
        config
      );
      toast.success("Feedback form created successfully");
      setCurrentFormId(response.data.data._id);
    }

    await fetchFeedbackForms();
    setIsLoading(false);
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to save feedback form");
    setIsLoading(false);
  }
};

  const loadForm = (form) => {
    setQuestions(form.questions.map(q => ({
      ...q,
      options: {
        A: "Excellent",
        B: "Good",
        C: "Average",
        D: "Poor"
      }
    })));
    setCurrentFormId(form._id);
  };

  const deleteForm = async (id) => {
    if (window.confirm("Are you sure you want to delete this feedback form?")) {
      try {
        const token = localStorage.getItem('token');
        setIsLoading(true);
        await axios.delete(`${process.env.REACT_APP_URL}/api/deletefeedbackform/${id}`,{
          headers: {
            Authorization: `Bearer ${token}`
          }
        },);
        toast.success("Feedback form deleted successfully");
        
        if (currentFormId === id) {
          setCurrentFormId(null);
          setQuestions([
            {
              questionNumber: "Q1",
              questionStatement: "",
              options: {
                A: "Excellent",
                B: "Good",
                C: "Average",
                D: "Poor"
              }
            }
          ]);
        }
        
        await fetchFeedbackForms();
        setIsLoading(false);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete feedback form");
        setIsLoading(false);
      }
    }
  };

  const createNewForm = () => {
    setCurrentFormId(null);
    setQuestions([
      {
        questionNumber: "Q1",
        questionStatement: "",
        options: {
          A: "Excellent",
          B: "Good",
          C: "Average",
          D: "Poor"
        }
      }
    ]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {currentFormId ? "Edit Feedback Form" : "Create New Feedback Form"}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-8">
            <label className="block text-lg font-medium text-gray-700 mb-4">
              Feedback Questions
            </label>
            
            {questions.map((question, index) => (
              <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="font-medium text-gray-700 mr-2">
                    {question.questionNumber}.
                  </span>
                  
                  {isEditing === index ? (
                    <div className="flex-1 flex items-center">
                      <input
                        type="text"
                        value={question.questionStatement}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="ml-2 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="ml-2 px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center">
                      <span className="flex-1 text-gray-800">
                        {question.questionStatement || "New question"}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => startEdit(index)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit question"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuestion(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete question"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="ml-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Options:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(question.options).map(([key, value]) => (
                      <div key={key} className="flex items-center">
                        <span className="font-medium text-gray-700 mr-2">{key}:</span>
                        <span className="text-gray-600">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addQuestion}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <FiPlus className="mr-2" />
              Add Question
            </button>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
            >
              {isLoading ? "Saving..." : "Save Form"}
            </button>
          </div>
        </form>
      </div>
      
      {/* Saved Forms Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Saved Feedback Forms</h2>
          <button
            onClick={createNewForm}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create New Form
          </button>
        </div>
        
        {isLoading && savedForms.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : savedForms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No saved feedback forms found</p>
        ) : (
          <div className="space-y-4">
            {savedForms.map((form) => (
              <div
                key={form._id}
                className={`p-4 border rounded-lg ${currentFormId === form._id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Form created on: {new Date(form.createdAt).toLocaleDateString()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {form.questions.length} questions
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadForm(form)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                    >
                      {currentFormId === form._id ? "Currently Editing" : "Load"}
                    </button>
                    <button
                      onClick={() => deleteForm(form._id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {currentFormId === form._id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Questions:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {form.questions.map((q, i) => (
                        <li key={i} className="text-gray-600">
                          <span className="font-medium">{q.questionNumber}</span>: {q.questionStatement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackForm;