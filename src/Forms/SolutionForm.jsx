import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus } from "react-feather";

const SolutionForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    subject: "",
    chapter: "",
    subtopic: "",
    questionType: "MCQ",
    testName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    questionCount: 1,
    solutions: []
  });

  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapter, setNewChapter] = useState("");
  const [showNewSubtopic, setShowNewSubtopic] = useState(false);
  const [newSubtopic, setNewSubtopic] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getsubjects`);
      setSubjects(response.data.data);
    } catch (err) {
      setError("Failed to fetch subjects");
    }
  };

  // Fetch chapters when subject changes
  useEffect(() => {
    const fetchChapters = async () => {
      if (formData.subject) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_URL}/api/getchapters?subject=${formData.subject}`);
          setChapters(response.data.data);
          setFormData(prev => ({ ...prev, chapter: "", subtopic: "" }));
        } catch (err) {
          setError("Failed to fetch chapters");
        }
      }
    };
    fetchChapters();
  }, [formData.subject]);

  // Fetch subtopics when chapter changes
  useEffect(() => {
    const fetchSubtopics = async () => {
      if (formData.subject && formData.chapter) {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_URL}/api/getsubtopic?subject=${formData.subject}&chapter=${formData.chapter}`
          );
          setSubtopics(response.data.data);
          setFormData(prev => ({ ...prev, subtopic: "" }));
        } catch (err) {
          setError("Failed to fetch subtopics");
        }
      }
    };
    fetchSubtopics();
  }, [formData.subject, formData.chapter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset new item inputs when selection changes
    if (name === "subject") {
      setShowNewChapter(false);
      setNewChapter("");
    }
    if (name === "chapter") {
      setShowNewSubtopic(false);
      setNewSubtopic("");
    }
  };

  const handleDateChange = (e) => {
    setFormData(prev => ({ ...prev, date: e.target.value }));
  };

  const handleQuestionCountChange = (e) => {
    const count = parseInt(e.target.value) || 1;
    setFormData(prev => {
      const solutions = Array(count).fill().map((_, i) => (
        prev.solutions[i] || { 
          questionNumber: i + 1, 
          correctOption: "", 
          correctSolution: "" 
        }
      )).slice(0, count);
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

  const handleAddNewSubject = async () => {
    if (!newSubject.trim()) return;
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_URL}/api/createsubject`, {
        subjectName: newSubject
      });
      
      setSubjects([...subjects, response.data.data]);
      setFormData(prev => ({ ...prev, subject: newSubject }));
      setNewSubject("");
      setShowNewSubject(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add subject");
    }
  };

  const handleAddNewChapter = async () => {
    if (!newChapter.trim() || !formData.subject) return;
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_URL}/api/createchapter`, {
        chapterName: newChapter,
        subject: formData.subject
      });
      
      setChapters([...chapters, response.data.data]);
      setFormData(prev => ({ ...prev, chapter: newChapter }));
      setNewChapter("");
      setShowNewChapter(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add chapter");
    }
  };

  const handleAddNewSubtopic = async () => {
    if (!newSubtopic.trim() || !formData.subject || !formData.chapter) return;
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_URL}/api/createsubtopic`, {
        subtopicName: newSubtopic,
        subject: formData.subject,
        chapter: formData.chapter
      });
      
      setSubtopics([...subtopics, response.data.data]);
      setFormData(prev => ({ ...prev, subtopic: newSubtopic }));
      setNewSubtopic("");
      setShowNewSubtopic(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add subtopic");
    }
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        solutionBank: formData.solutions.map(solution => ({
          questionNumber: solution.questionNumber,
          correctOption: formData.questionType === "MCQ" ? solution.correctOption : undefined,
          correctSolution: solution.correctSolution
        }))
      };

      const response = await axios.post(`${process.env.REACT_APP_URL}/api/createsolution`, payload);
      onSuccess(response.data);
      setFormData({
        subject: "",
        chapter: "",
        subtopic: "",
        questionType: "MCQ",
        testName: "",
        date: format(new Date(), "yyyy-MM-dd"),
        questionCount: 1,
        solutions: []
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create solution");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col mb-2">
        {/* <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button> */}
        <h1 className="text-3xl font-bold">Add Solutions</h1>
      </div>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subject Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <div className="flex space-x-2">
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject._id} value={subject.subjectName}>
                    {subject.subjectName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewSubject(!showNewSubject)}
                className="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                <Plus size={16} />
              </button>
            </div>
            
            {showNewSubject && (
              <div className="mt-2 flex space-x-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="New subject name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewSubject}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Chapter Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Chapter</label>
            <div className="flex space-x-2">
              <select
                name="chapter"
                value={formData.chapter}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
                disabled={!formData.subject}
              >
                <option value="">Select Chapter</option>
                {chapters.map(chapter => (
                  <option key={chapter._id} value={chapter.chapterName}>
                    {chapter.chapterName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewChapter(!showNewChapter)}
                disabled={!formData.subject}
                className="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
            
            {showNewChapter && (
              <div className="mt-2 flex space-x-2">
                <input
                  type="text"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  placeholder="New chapter name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewChapter}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Subtopic Dropdown */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Subtopic</label>
            <div className="flex space-x-2">
              <select
                name="subtopic"
                value={formData.subtopic}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                required
                disabled={!formData.chapter}
              >
                <option value="">Select Subtopic</option>
                {subtopics.map(subtopic => (
                  <option key={subtopic._id} value={subtopic.subtopicName}>
                    {subtopic.subtopicName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewSubtopic(!showNewSubtopic)}
                disabled={!formData.chapter}
                className="px-2 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
            
            {showNewSubtopic && (
              <div className="mt-2 flex space-x-2">
                <input
                  type="text"
                  value={newSubtopic}
                  onChange={(e) => setNewSubtopic(e.target.value)}
                  placeholder="New subtopic name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewSubtopic}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
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

        

      {/* Solutions Input Section */}
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
      Correct Option
    </label>
    <div className="flex space-x-4">
      {['A', 'B', 'C', 'D'].map(opt => (
        <div key={opt} className="flex items-center">
          <input
            type="radio"
            id={`q${index}-opt${opt}`}
            name={`question-${index}-option`}
            value={opt}
            checked={formData.solutions[index]?.correctOption === opt}
            onChange={() => handleSolutionChange(index, 'correctOption', opt)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            required
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
    required
  />
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