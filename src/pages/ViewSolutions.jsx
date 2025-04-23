import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ViewSolutions() {
  const [filters, setFilters] = useState({
    stream: "LongTerm",
    questionType: "",
    testName: "",
    date: ""
  });
  const [testNames, setTestNames] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch test names when stream changes
  useEffect(() => {
    const fetchTestNames = async () => {
      try {
        toast.info("Loading test names...", { autoClose: 2000 });
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getsolutionbank?stream=${filters.stream}`
        );
        const uniqueTestNames = [...new Set(response.data.data.map(item => item.solutionRef.testName))];
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
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSolutions([]);

    try {
      toast.info("Searching for solutions...");
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getsolutionbank?${params.toString()}`);
      console.log("API Response:", response.data); // Add this line
      
      const sortedSolutions = response.data.data.sort((a, b) => a.questionNumber - b.questionNumber);
      
      if (sortedSolutions.length === 0) {
        toast.info("No solutions found matching your criteria");
      } else {
        toast.success(`Found ${sortedSolutions.length} solutions`);
      }
      
      setSolutions(sortedSolutions);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch solutions. Please try again.";
      toast.error(errorMsg);
      console.error("Solutions fetch error:", err);
    } finally {
      setLoading(false);
      toast.dismiss();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">View Solutions</h1>
      </div>

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stream Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Stream</label>
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
              <label className="block text-sm font-medium text-gray-700">Question Type</label>
              <select
                name="questionType"
                value={filters.questionType}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="FillInTheBlanks">Fill in the Blanks</option>
                <option value="TrueFalse">True/False</option>
              </select>
            </div>

            {/* Test Name Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Name</label>
              <select
                name="testName"
                value={filters.testName}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Tests</option>
                {testNames.map((name, index) => (
                  <option key={index} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
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
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : 'Search Solutions'}
            </button>
          </div>
        </form>

        {solutions.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Solutions Found: {solutions.length}</h2>
          <div className="space-y-4">
            {solutions.map((solution, index) => (
              <div 
                key={index} 
                className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative 
                  overflow-hidden ${solution.isGrace ? 'bg-gray-100/60' : 'bg-white'}`}
              >
                {/* Grace Stamp Overlay */}
                {solution.isGrace && (
                  <>
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px] z-0"></div>
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="transform rotate-[-10deg]">
                        <span className="text-5xl font-bold text-green-600/60 tracking-widest border-4 border-green-600/50 rounded-lg px-6 py-2">
                          GRACED
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="relative z-20"> {/* Content wrapper to stay above stamp */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-medium text-lg ${solution.isGrace ? 'text-gray-700' : 'text-gray-900'}`}>
                        Question {solution.questionNumber}
                      </h3>
                      <p className={`text-sm ${solution.isGrace ? 'text-gray-600' : 'text-gray-500'}`}>
                        Stream: {solution.solutionRef.stream}
                      </p>
                    </div>
                    <span className={`text-sm ${solution.isGrace ? 'text-gray-600' : 'text-gray-500'}`}>
                      {solution.solutionRef.testName} - {new Date(solution.solutionRef.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {solution.solutionRef.questionType === "MCQ" && (
                    <div className="mt-3">
                      <p className={`text-sm font-medium ${solution.isGrace ? 'text-gray-700' : 'text-gray-700'}`}>
                        Correct Option(s):
                      </p>
                      <div className="flex space-x-4 mt-1">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const isCorrect = solution.correctOptions?.includes(opt) || 
                                          solution.correctOption === opt;
                          
                          return (
                            <span 
                              key={opt}
                              className={`px-3 py-1 rounded-lg text-lg font-medium ${
                                isCorrect
                                  ? solution.isGrace
                                    ? 'bg-green-200/80 text-green-900 border-2 border-green-400/80'
                                    : 'bg-green-100 text-green-400 border border-green-200'
                                  : 'text-gray-700 bg-gray-100'
                              }`}
                            >
                              {opt}
                              {isCorrect && (
                                <span className={`ml-1 ${solution.isGrace ? 'text-green-800' : 'text-green-400'}`}>
                                  ✓
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      {solution.correctOptions?.length > 1 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Multiple correct options: {solution.correctOptions.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3">
                    <p className={`text-sm font-medium ${solution.isGrace ? 'text-gray-700' : 'text-gray-700'}`}>
                      Correct Solution:
                    </p>
                    <div className={`mt-1 p-3 rounded-lg ${solution.isGrace ? 'bg-white/80 border border-green-200/50' : 'bg-gray-50'}`}>
                      <p className={solution.isGrace ? 'text-gray-800' : 'text-gray-700'}>
                        {solution.correctSolution}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500 py-8">No solutions found. Apply filters to search.</p>
      )}
    </div>
    </div>
  );
}