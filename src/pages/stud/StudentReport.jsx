import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
//import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
//import { Calendar as CalendarIcon } from 'react-feather';
import ReportCard from '../../download/ReportCard';

const StudentReport = ({ onClose }) => {
  const [formData, setFormData] = useState({
    rollNo: '',
    studentName: '',
    classSection: '',
    fromDate: null,
    toDate: null
  });
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isValidRollNo, setIsValidRollNo] = useState(false);

  // Validate roll number is exactly 5 digits
  useEffect(() => {
    setIsValidRollNo(/^\d{6}$/.test(formData.rollNo));
  }, [formData.rollNo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Fetch student reports when Fetch button is clicked
  const fetchStudentReports = async () => {
    if (!isValidRollNo) return;
    
    setIsFetching(true);
    setStatus('Fetching reports...');
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getstudentreportbystudentid/${formData.rollNo}`);
      
      if (!response.data?.data) {
        throw new Error('No data received from server');
      }
  
      const filteredReports = filterReportsByDate(response.data.data);
      setReports(filteredReports);
      setStatus(`Found ${filteredReports.length} reports for ${formData.rollNo}`);
    } catch (error) {
      console.error('Error fetching reports:', error);
      let errorMessage = 'Failed to fetch reports';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'No response from server. Check your connection.';
      } else {
        // Other errors
        errorMessage = error.message || 'Failed to fetch reports';
      }
      
      setStatus(errorMessage);
      setReports([]);
    } finally {
      setIsFetching(false);
    }
  };

  // Filter reports by selected date range
  const filterReportsByDate = (reports) => {
    if (!formData.fromDate && !formData.toDate) {
      setStatus('Showing all available reports (no date filters applied)');
      return reports;
    }
    
    const filtered = reports.filter(report => {
      const reportDate = parseISO(report.date);
      return (
        (!formData.fromDate || reportDate >= formData.fromDate) &&
        (!formData.toDate || reportDate <= formData.toDate)
      );
    });

    if (formData.fromDate && !formData.toDate) {
      setStatus(`Showing reports from ${format(formData.fromDate, 'dd/MM/yyyy')} onwards`);
    } else if (formData.fromDate && formData.toDate) {
      setStatus(`Showing reports between ${format(formData.fromDate, 'dd/MM/yyyy')} and ${format(formData.toDate, 'dd/MM/yyyy')}`);
    }

    return filtered;
  };

  // Generate PDF report
  const generatePDF = () => {
    if (reports.length === 0) {
      setStatus('No reports available to generate PDF');
      return;
    }

    const studentData = {
      studentName: formData.studentName,
      rollNo: formData.rollNo,
      classSection: formData.classSection,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      reports: reports.map(report => ({
        testName: report.testName,
        date: format(parseISO(report.date), 'dd/MM/yyyy'),
        correctAnswers: report.correctAnswers,
        wrongAnswers: report.wrongAnswers,
        unattempted: report.unattempted,
        totalMarks: report.totalMarks,
        accuracy: report.accuracy,
        percentile: report.percentile
      })),
      totalTestsAttended: reports.length,
      totalMarks: reports.reduce((sum, report) => sum + report.totalMarks, 0),
      averageMarks: reports.reduce((sum, report) => sum + report.totalMarks, 0) / reports.length
    };

    ReportCard.generatePDF(studentData);
  };

  return (
    <div className="space-y-6">
      {/* Roll Number Input with Fetch Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700">
            Roll Number (6 digits)
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              name="rollNo"
              value={formData.rollNo}
              onChange={handleChange}
              maxLength="6"
              pattern="\d{5}"
              className="flex-1 block w-full border border-gray-300 rounded-l-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="12345"
              required
            />
            <button
              type="button"
              onClick={fetchStudentReports}
              disabled={!isValidRollNo || isFetching}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white ${
                isValidRollNo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isFetching ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
        </div>

        {/* Student Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Student Name
          </label>
          <input
            type="text"
            name="studentName"
            value={formData.studentName}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Class/Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Class/Section
          </label>
          <input
            type="text"
            name="classSection"
            value={formData.classSection}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Date Range Pickers */}
        {/* <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              From Date
            </label>
            <div className="relative mt-1">
              <DatePicker
                selected={formData.fromDate}
                onChange={(date) => setFormData({ ...formData, fromDate: date })}
                selectsStart
                startDate={formData.fromDate}
                endDate={formData.toDate}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
                isClearable
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              To Date
            </label>
            <div className="relative mt-1">
              <DatePicker
                selected={formData.toDate}
                onChange={(date) => setFormData({ ...formData, toDate: date })}
                selectsEnd
                startDate={formData.fromDate}
                endDate={formData.toDate}
                minDate={formData.fromDate}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
                isClearable
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Status Message */}
      {status && (
        <div className={`p-3 rounded-md ${
          status.includes('Failed') ? 'bg-red-50 text-red-800' : 
          status.includes('Found') ? 'bg-green-50 text-green-800' : 
          'bg-blue-50 text-blue-800'
        }`}>
          {status}
        </div>
      )}

      {/* Reports Table */}
      {reports.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wrong</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unattempted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Marks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentile</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.testName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(parseISO(report.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{report.wrongAnswers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.unattempted}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{report.correctAnswers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.totalMarks}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{report.accuracy}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{report.percentile}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={generatePDF}
          disabled={reports.length === 0}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            reports.length > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
        >
          Generate PDF
        </button>
      </div>
    </div>
  );
};

export default StudentReport;