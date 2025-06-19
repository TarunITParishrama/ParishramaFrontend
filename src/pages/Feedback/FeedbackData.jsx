import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from "xlsx";

const FeedbackData = () => {
  const [userRole, setUserRole] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    date: new Date(),
    streamType: '',
    campus: '',
    section: '',
    studentCount: 0
  });
  const [file, setFile] = useState(null);
  const [feedbackData, setFeedbackData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [aggregatedData, setAggregatedData] = useState([]);
  const [availableFeedbacks, setAvailableFeedbacks] = useState([]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    fetchAvailableFeedbacks();
  }, []);

  const fetchAvailableFeedbacks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getfeedbacks`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAvailableFeedbacks(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch available feedbacks');
    }
  };

  useEffect(() => {
    if (formData.date && showUploadForm) {
      fetchFeedbackForDate();
    }
  }, [formData.date, showUploadForm]);

  const fetchFeedbackForDate = async () => {
    try {
      const dateString = formData.date.toISOString().split('T')[0];
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getfeedbacks`,
        {
          params: { date: dateString },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data.length > 0) {
        const feedback = response.data.data[0];
        setFeedbackDetails(feedback);
        setAvailableQuestions(feedback.questions);
        setFormData(prev => ({ ...prev, name: feedback.name }));
      } else {
        setFeedbackDetails(null);
        setAvailableQuestions([]);
        toast.info('No feedback form found for selected date');
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to fetch feedback for selected date');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, date }));
  };

  const handleFeedbackSelect = (e) => {
    const feedbackId = e.target.value;
    const selectedFeedback = availableFeedbacks.find(f => f._id === feedbackId);
    if (selectedFeedback) {
      setFormData(prev => ({
        ...prev,
        name: selectedFeedback.name,
        date: new Date(selectedFeedback.date)
      }));
      setFeedbackDetails(selectedFeedback);
      setAvailableQuestions(selectedFeedback.questions);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const questionMap = new Map();
        const studentCount = jsonData.length - 1;
        let totalResponsesCount = 0;
        
        availableQuestions.forEach(question => {
          questionMap.set(question.questionNumber, {
            questionStatement: question.questionStatement,
            responses: [],
            countA: 0,
            countB: 0,
            countC: 0,
            countD: 0,
            noResponse: 0
          });
        });
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          let studentResponseCount = 0;
          
          for (let j = 1; j < row.length; j++) {
            const questionNumber = `Q${j}`;
            if (!questionMap.has(questionNumber)) continue;
            
            const questionData = questionMap.get(questionNumber);
            const response = row[j]?.toString().toUpperCase();
            
            if (['A', 'B', 'C', 'D'].includes(response)) {
              questionData.responses.push({ option: response });
              switch(response) {
                case 'A': questionData.countA++; break;
                case 'B': questionData.countB++; break;
                case 'C': questionData.countC++; break;
                case 'D': questionData.countD++; break;
              }
              studentResponseCount++;
            } else {
              questionData.noResponse++;
            }
          }
          
          if (studentResponseCount > 0) {
            totalResponsesCount++;
          }
        }
        
        const questions = Array.from(questionMap.entries()).map(([questionNumber, data]) => ({
          questionNumber,
          ...data
        }));

        setFile({
          name: file.name,
          data: questions,
          studentCount,
          totalResponsesCount
        });
      } catch (error) {
        toast.error('Error processing file');
        console.error(error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date || !formData.streamType || !formData.studentCount || !file) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      let optionACount = 0;
      let optionBCount = 0;
      let optionCCount = 0;
      let optionDCount = 0;
      let noResponseCount = 0;

      file.data.forEach(question => {
        optionACount += question.countA;
        optionBCount += question.countB;
        optionCCount += question.countC;
        optionDCount += question.countD;
        noResponseCount += question.noResponse;
      });

      const payload = {
        name: formData.name, // Include name in payload
        date: formData.date,
        streamType: formData.streamType,
        campus: formData.streamType === 'LongTerm' ? formData.campus : undefined,
        section: formData.streamType === 'PUC' ? formData.section : undefined,
        studentCount: formData.studentCount,
        responseCount: file.totalResponsesCount,
        questions: file.data,
        optionACount,
        optionBCount,
        optionCCount,
        optionDCount,
        noResponseCount
      };

      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_URL}/api/createfeedbackdata`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success('Feedback data uploaded successfully');
      setShowUploadForm(false);
      setFile(null);
      setFormData({
        name: '', // Reset name field
        date: new Date(),
        streamType: '',
        campus: '',
        section: '',
        studentCount: 0
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload feedback data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeedbackData = async () => {
    if (!formData.date || !formData.streamType) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const dateString = formData.date.toISOString().split('T')[0];

      // First get all feedback data for this date and stream type
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getfeedbackdata`,
        {
          params: {
            date: dateString,
            streamType: formData.streamType
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.data.length > 0) {
        // Get the feedback form for question statements
        const feedbackResponse = await axios.get(
          `${process.env.REACT_APP_URL}/api/getfeedbacks`,
          {
            params: { date: dateString },
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        let questionsWithStatements = [];
        if (feedbackResponse.data.data.length > 0) {
          const feedbackForm = feedbackResponse.data.data[0];
          const questionMap = new Map();
          feedbackForm.questions.forEach(q => {
            questionMap.set(q.questionNumber, q.questionStatement);
          });

          questionsWithStatements = response.data.data[0].questions.map(q => ({
            ...q,
            questionStatement: questionMap.get(q.questionNumber) || 'Question statement not available'
          }));
        }

        // Process data for tabular display
        const processedData = response.data.data.map(item => ({
          id: item._id,
          campusOrSection: formData.streamType === 'LongTerm' ? item.campus : item.section,
          studentCount: item.studentCount,
          responseCount: item.responseCount,
          questions: questionsWithStatements.length > 0 ? 
            questionsWithStatements.map(q => ({
              ...q,
              ...calculatePercentages(q)
            })) : 
            item.questions.map(q => ({
              ...q,
              questionStatement: 'Question statement not available',
              ...calculatePercentages(q)
            }))
        }));

        setFeedbackData(processedData);

        // Aggregate data for summary view
        const aggregated = processedData.reduce((acc, curr) => {
          curr.questions.forEach((q, idx) => {
            if (!acc[idx]) {
              acc[idx] = {
                questionNumber: q.questionNumber,
                questionStatement: q.questionStatement,
                responses: []
              };
            }
            acc[idx].responses.push({
              campusOrSection: curr.campusOrSection,
              studentCount: curr.studentCount,
              responseCount: curr.responseCount,
              countA: q.countA,
              percentA: q.percentA,
              countB: q.countB,
              percentB: q.percentB,
              countC: q.countC,
              percentC: q.percentC,
              countD: q.countD,
              percentD: q.percentD,
              noResponse: q.noResponse,
              percentNoResponse: q.percentNoResponse
            });
          });
          return acc;
        }, []);

        setAggregatedData(aggregated);
      } else {
        setFeedbackData([]);
        setAggregatedData([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch feedback data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePercentages = (question) => {
    const totalResponses = question.countA + question.countB + question.countC + question.countD + question.noResponse;
    return {
      percentA: Math.round((question.countA / totalResponses) * 100),
      percentB: Math.round((question.countB / totalResponses) * 100),
      percentC: Math.round((question.countC / totalResponses) * 100),
      percentD: Math.round((question.countD / totalResponses) * 100),
      percentNoResponse: Math.round((question.noResponse / totalResponses) * 100)
    };
  };

  const renderAdminView = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Upload Feedback Data</h2>
      
      {!showUploadForm ? (
        <button
          onClick={() => setShowUploadForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Start New Feedback Data Upload
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Upload Feedback Data</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2">Select Feedback</label>
                <select
                  onChange={handleFeedbackSelect}
                  className="border rounded p-2 w-full"
                  required
                >
                  <option value="">Select a feedback</option>
                  {availableFeedbacks.map(feedback => (
                    <option key={feedback._id} value={feedback._id}>
                      {feedback.name} ({new Date(feedback.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2">Feedback Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="border rounded p-2 w-full"
                />
              </div>
              <div>
                <label className="block mb-2">Date</label>
                <DatePicker
                  selected={formData.date}
                  onChange={handleDateChange}
                  className="border rounded p-2 w-full"
                  required
                />
                {feedbackDetails && (
                  <p className="text-sm text-green-600 mt-1">
                    Feedback form available with {availableQuestions.length} questions
                  </p>
                )}
              </div>              
              <div>
                <label className="block mb-2">Stream Type</label>
                <select
                  name="streamType"
                  value={formData.streamType}
                  onChange={handleInputChange}
                  className="border rounded p-2 w-full"
                  required
                >
                  <option value="">Select Stream</option>
                  <option value="LongTerm">LongTerm</option>
                  <option value="PUC">PUC</option>
                </select>
              </div>
              
              {formData.streamType === 'LongTerm' && (
                <div>
                  <label className="block mb-2">Campus Name</label>
                  <input
                    type="text"
                    name="campus"
                    value={formData.campus}
                    onChange={handleInputChange}
                    className="border rounded p-2 w-full"
                    required
                  />
                </div>
              )}
              
              {formData.streamType === 'PUC' && (
                <div>
                  <label className="block mb-2">Section Name</label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    className="border rounded p-2 w-full"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block mb-2">Student Count</label>
                <input
                  type="number"
                  name="studentCount"
                  value={formData.studentCount}
                  onChange={handleInputChange}
                  className="border rounded p-2 w-full"
                  min="1"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2">Upload Excel File</label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="border rounded p-2 w-full"
                required
                disabled={!feedbackDetails}
              />
              {file && (
                <div className="mt-2 text-sm">
                  <p>Selected file: {file.name}</p>
                  <p>Students in file: {file.studentCount}</p>
                  <p>Students with responses: {file.totalResponsesCount}</p>
                </div>
              )}
              {!feedbackDetails && (
                <p className="text-sm text-red-600 mt-1">
                  Please select a date with an available feedback form before uploading
                </p>
              )}
            </div>
            
            {feedbackDetails && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Available Questions for {new Date(feedbackDetails.date).toLocaleDateString()}:</h4>
                <ul className="list-disc pl-5">
                  {availableQuestions.map((q, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{q.questionNumber}:</span> {q.questionStatement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowUploadForm(false);
                  setFile(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !file || !feedbackDetails}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {isLoading ? 'Uploading...' : 'Upload Data'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

   const renderSuperAdminView = () => (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Feedback Data Analysis</h2>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-2">Stream Type</label>
            <select
              name="streamType"
              value={formData.streamType}
              onChange={handleInputChange}
              className="border rounded p-2 w-full"
            >
              <option value="">Select Stream</option>
              <option value="LongTerm">LongTerm</option>
              <option value="PUC">PUC</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2">Date</label>
            <DatePicker
              selected={formData.date}
              onChange={handleDateChange}
              className="border rounded p-2 w-full"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchFeedbackData}
              disabled={!formData.date || !formData.streamType || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? 'Loading...' : 'Fetch Data'}
            </button>
          </div>
        </div>
      </div>
      
      {aggregatedData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold">
              {formData.name || 'Feedback Analysis'}
            </h3>
            <p className="text-gray-600">
              Date: {new Date(formData.date).toLocaleDateString()} | 
              Stream: {formData.streamType} | 
              Responses: {feedbackData.length} {formData.streamType === 'LongTerm' ? 'campuses' : 'sections'}
            </p>
          </div>
          
          <div className="space-y-8">
            {aggregatedData.map((question, qIndex) => (
              <div key={qIndex} className="border rounded p-4">
                <h4 className="font-bold text-lg mb-3">
                  {question.questionNumber}: {question.questionStatement}
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {formData.streamType === 'LongTerm' ? 'Campus' : 'Section'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Students (Responded/Total)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Excellent (A)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Good (B)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average (C)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Poor (D)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No Response
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {question.responses.map((response, rIndex) => (
                        <tr key={rIndex}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {response.campusOrSection}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.responseCount}/{response.studentCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.percentA}% ({response.countA})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.percentB}% ({response.countB})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.percentC}% ({response.countC})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.percentD}% ({response.countD})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.percentNoResponse}% ({response.noResponse})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {userRole === 'super_admin' ? renderSuperAdminView() : renderAdminView()}
    </>
  );
};

export default FeedbackData;