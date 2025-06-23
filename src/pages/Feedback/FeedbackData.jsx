import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import { FiTrash2, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
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
  const [availableFeedbackNames, setAvailableFeedbackNames] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

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
      
      // Extract unique feedback names
      const names = [...new Set(response.data.data.map(f => f.name))];
      setAvailableFeedbackNames(names);
    } catch (error) {
      toast.error('Failed to fetch available feedbacks');
    }
  };

  useEffect(() => {
    // if (formData.date && showUploadForm) {
      //fetchFeedbackForDate();
    // }
  }, [formData.date, showUploadForm]);

//   const fetchFeedbackForDate = async () => {
//   try {
//     const dateString = formData.date.toISOString().split('T')[0];
//     const token = localStorage.getItem('token');
//     const response = await axios.get(
//       `${process.env.REACT_APP_URL}/api/getfeedbacks`,
//       {
//         params: { date: dateString },
//         headers: { Authorization: `Bearer ${token}` }
//       }
//     );

//     if (response.data.data.length > 0) {
//       // If we have a selected feedback name, try to find that specific feedback
//       let feedback = response.data.data[0]; // Default to first one
      
//       if (formData.name) {
//         // Try to find feedback with matching name
//         const matchingFeedback = response.data.data.find(f => f.name === formData.name);
//         if (matchingFeedback) {
//           feedback = matchingFeedback;
//         }
//       }

//       setFeedbackDetails(feedback);
//       setAvailableQuestions(feedback.questions);
//       setFormData(prev => ({ 
//         ...prev, 
//         name: feedback.name,
//         date: new Date(feedback.date) // Ensure date is synchronized
//       }));
//     } else {
//       setFeedbackDetails(null);
//       setAvailableQuestions([]);
//       toast.info('No feedback form found for selected date');
//     }
//   } catch (error) {
//     console.error('Error fetching feedback:', error);
//     toast.error('Failed to fetch feedback for selected date');
//   }
// };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if(name === 'name' && feedbackDetails){
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, date }));
  };

  const handleFeedbackSelect = (e) => {
  const feedbackId = e.target.value;

  if (!feedbackId) {
    setFormData(prev => ({
      ...prev,
      name: '',
      date: new Date(),
      streamType: '',
      campus: '',
      section: '',
      studentCount: 0
    }));
    setFeedbackDetails(null);
    setAvailableQuestions([]);
    return;
  }

  const selectedFeedback = availableFeedbacks.find(f => f._id === feedbackId);
  if (selectedFeedback) {
    setFormData(prev => ({
      ...prev,
      name: selectedFeedback.name,
      date: new Date(selectedFeedback.date),
      streamType: '',
      campus: '',
      section: '',
      studentCount: 0
    }));

    setFeedbackDetails(selectedFeedback);
    setAvailableQuestions(selectedFeedback.questions || []);

    // ✅ Only pass the selected feedback object
    fetchFeedbackForFeedback(selectedFeedback);
  }
};
  const fetchFeedbackForFeedback = async (feedbackObj) => {
  try {
    if (!feedbackObj) return;

    const token = localStorage.getItem('token');

    const dateString = new Date(feedbackObj.date).toISOString().split('T')[0];

    const response = await axios.get(
      `${process.env.REACT_APP_URL}/api/getfeedbacks`,
      {
        params: { date: dateString },
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const matched = response.data.data.find(f => f._id === feedbackObj._id);
    if (matched) {
      setFeedbackDetails(matched);
      setAvailableQuestions(matched.questions || []);
      setFormData(prev => ({
        ...prev,
        name: matched.name,
        date: new Date(matched.date)
      }));
    } else {
      toast.error("Selected feedback not found on server.");
    }

  } catch (error) {
    console.error('Error fetching feedback by ID:', error);
    toast.error('Failed to fetch selected feedback');
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
        name: formData.name,
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
        name: '',
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

  const handleRemoveFile = () => {
    setFile(null);
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const fetchFeedbackData = async (selectedName = ' ') => {
    if (!formData.date || !formData.streamType) return;
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const dateString = formData.date.toISOString().split('T')[0];

      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getfeedbackdata`,
        {
          params: {
            date: dateString,
            streamType: formData.streamType,
            name: formData.name || undefined
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.data.length > 0) {
        const feedbackResponse = await axios.get(
          `${process.env.REACT_APP_URL}/api/getfeedbacks`,
          {
            params: { 
              date: dateString,
              name: formData.name || undefined
            },
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        let questionsWithStatements = [];
        if (feedbackResponse.data.data.length > 0) {
          let feedbackForm = feedbackResponse.data.data[0];
          const matchName = selectedName || formData.name;

        if (matchName) {
          const matchingFeedback = response.data.data.find(f => f.name === matchName);
          if (matchingFeedback) {
            feedbackForm = matchingFeedback;
          }
        }
          const questionMap = new Map();
          feedbackForm.questions.forEach(q => {
            questionMap.set(q.questionNumber, q.questionStatement);
          });

          questionsWithStatements = response.data.data[0].questions.map(q => ({
            ...q,
            questionStatement: questionMap.get(q.questionNumber) || 'Question statement not available'
          }));
        }

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

  const downloadPDF = async () => {
    try {
      setPdfLoading(true);
      toast.info('Generating PDF report, this may take a moment...', { autoClose: false });

      const input = document.getElementById('superadmin-view');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Add title and metadata to the first page
      pdf.setFontSize(18);
      pdf.setTextColor(40);
      pdf.text('Feedback Analysis Report', pageWidth / 2, 40, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Stream Type: ${formData.streamType}`, 40, 80);
      pdf.text(`Date: ${formData.date.toLocaleDateString()}`, 40, 100);
      pdf.text(`Feedback Name: ${formData.name || 'All'}`, 40, 120);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 40, 140);
      
      let yPosition = 180;
      let pageNumber = 1;

      // Process each question for the PDF
      for (const [qIndex, question] of aggregatedData.entries()) {
        // Check if we need a new page before adding the question
        if (yPosition > pageHeight - 200) {
          pdf.addPage();
          pageNumber++;
          yPosition = 40;
        }

        // Add question header
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 128); // Navy blue for questions
        pdf.text(`${question.questionNumber}: ${question.questionStatement}`, 40, yPosition, { maxWidth: pageWidth - 80 });
        yPosition += 30;

        // Add table headers
        pdf.setFontSize(10);
        pdf.setTextColor(0);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(40, yPosition, pageWidth - 80, 20, 'F');
        pdf.text(formData.streamType === 'LongTerm' ? 'Campus' : 'Section', 50, yPosition + 15);
        pdf.text('Students', 150, yPosition + 15);
        pdf.text('Excellent (A)', 230, yPosition + 15);
        pdf.text('Good (B)', 310, yPosition + 15);
        pdf.text('Average (C)', 390, yPosition + 15);
        pdf.text('Poor (D)', 470, yPosition + 15);
        pdf.text('No Response', 550, yPosition + 15);
        yPosition += 30;

        // Add responses
        pdf.setFontSize(9);
        for (const [rIndex, response] of question.responses.entries()) {
          // Check if we need a new page before adding a row
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            pageNumber++;
            yPosition = 40;
            // Redraw headers if we're on a new page
            pdf.setFontSize(10);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(40, yPosition, pageWidth - 80, 20, 'F');
            pdf.text(formData.streamType === 'LongTerm' ? 'Campus' : 'Section', 50, yPosition + 15);
            pdf.text('Students', 150, yPosition + 15);
            pdf.text('Excellent (A)', 230, yPosition + 15);
            pdf.text('Good (B)', 310, yPosition + 15);
            pdf.text('Average (C)', 390, yPosition + 15);
            pdf.text('Poor (D)', 470, yPosition + 15);
            pdf.text('No Response', 550, yPosition + 15);
            yPosition += 30;
          }

          pdf.setTextColor(0);
          pdf.text(response.campusOrSection, 50, yPosition + 10);
          pdf.text(`${response.responseCount}/${response.studentCount}`, 150, yPosition + 10);
          
          // Color-coded percentages
          pdf.setTextColor(75, 0, 130); // Violet for Excellent
          pdf.text(`${response.percentA}% (${response.countA})`, 230, yPosition + 10);
          
          pdf.setTextColor(0, 100, 0); // Green for Good
          pdf.text(`${response.percentB}% (${response.countB})`, 310, yPosition + 10);
          
          pdf.setTextColor(218, 165, 32); // Goldenrod for Average
          pdf.text(`${response.percentC}% (${response.countC})`, 390, yPosition + 10);
          
          pdf.setTextColor(178, 34, 34); // Firebrick for Poor
          pdf.text(`${response.percentD}% (${response.countD})`, 470, yPosition + 10);
          
          pdf.setTextColor(128, 128, 128); // Gray for No Response
          pdf.text(`${response.percentNoResponse}% (${response.noResponse})`, 550, yPosition + 10);
          
          yPosition += 20;
        }

        // Add some space between questions
        yPosition += 30;
      }

      // Add page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(150);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 60, pageHeight - 20);
      }

      // Save the PDF
      const fileName = `Feedback_Report_${formData.streamType}_${formData.name || 'All'}_${formData.date.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success(`PDF report generated with ${totalPages} pages`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setPdfLoading(false);
    }
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
  value={feedbackDetails?._id || ''} // This ensures the select shows the correct selected value
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
      readOnly // Make it read-only since it should come from the selected feedback
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
                <div className="mt-2 text-sm bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">Selected file: {file.name}</p>
                    <p>Students in file: {file.studentCount}</p>
                    <p>Students with responses: {file.totalResponsesCount}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="Remove file"
                  >
                    <FiTrash2 size={20} />
                  </button>
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
    <div className="container mx-auto px-4 py-8" id="superadmin-view">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Feedback Data Analysis</h2>
        <div className="flex gap-2">
          {aggregatedData.length > 0 && (
            <button
              onClick={downloadPDF}
              disabled={isLoading || pdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <FiDownload />
              {pdfLoading ? 'Generating PDF...' : 'Download Report'}
            </button>
          )}
          <button
            onClick={fetchFeedbackData}
            disabled={!formData.date || !formData.streamType || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
          
          <div>
            <label className="block mb-2">Feedback Name</label>
            <select
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="border rounded p-2 w-full"
            >
              <option value="">All Feedback Names</option>
              {availableFeedbackNames.map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
            </select>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-violet-500 uppercase tracking-wider">
                          Excellent (A)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                          Good (B)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-yellow-500 uppercase tracking-wider">
                          Average (C)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">
                          Poor (D)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No Response/Invalid Response
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
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm ${
                            response.percentD > 10 ? 'bg-red-400 text-white font-semibold' : 'text-gray-500'
                            }`}
                          >
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