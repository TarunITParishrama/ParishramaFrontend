import React, { useState, useEffect,useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function Noticeboard() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const [activeTab, setActiveTab] = useState('view');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    dropDate: new Date(),
    dropTime: '12:00'
  });

  // Fetch notices based on user role
  const fetchNotices = useCallback(async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    const endpoint = userRole === 'parent' ? '/api/notices/active' : '/api/notices';
    
    const response = await axios.get(`${process.env.REACT_APP_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    setNotices(response.data.data);
  } catch (error) {
    toast.error('Failed to fetch notices');
    console.error('Fetch error:', error);
  } finally {
    setLoading(false);
  }
}, [userRole]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const dropDate = new Date(formData.dropDate);
      const [hours, minutes] = formData.dropTime.split(':');
      dropDate.setHours(hours, minutes, 0, 0);

      await axios.post(`${process.env.REACT_APP_URL}/api/notices`, {
        subject: formData.subject,
        message: formData.message,
        dropDate,
        dropTime: formData.dropTime,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      toast.success('Notice created successfully!');
      setFormData({
        subject: '',
        message: '',
        dropDate: new Date(),
        dropTime: '12:00'
      });
      fetchNotices();
    } catch (error) {
      toast.error('Failed to create notice');
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle date change
  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, dropDate: date }));
  };

  // Load notices on component mount and tab change
  useEffect(() => {
    fetchNotices();
  }, [activeTab, fetchNotices]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Notice Board</h1>
        
        {userRole !== 'parent' && (
          <div className="mt-4 flex space-x-6">
            <button
              onClick={() => setActiveTab('view')}
              className={`pb-1 capitalize ${
                activeTab === 'view' ? 'border-b-2 border-white' : 'text-gray-200 hover:text-white'
              }`}
            >
              View Notices
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-1 capitalize ${
                activeTab === 'create' ? 'border-b-2 border-white' : 'text-gray-200 hover:text-white'
              }`}
            >
              Create Notice
            </button>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto mt-6 p-4">
        {activeTab === 'create' ? (
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Notice</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  maxLength="100"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="5"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  maxLength="1000"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dropDate">
                    Drop Date
                  </label>
                  <DatePicker
                    id="dropDate"
                    selected={formData.dropDate}
                    onChange={handleDateChange}
                    minDate={new Date()}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dropTime">
                    Drop Time
                  </label>
                  <input
                    id="dropTime"
                    name="dropTime"
                    type="time"
                    value={formData.dropTime}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Notice'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">📜</span> 
              {userRole === 'parent' ? 'Latest Notices' : 'All Notices'}
            </h2>

            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Loading notices...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {userRole === 'parent' ? 'No active notices available' : 'No notices found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notices.map(notice => (
                  <div key={notice._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-800">{notice.subject}</h3>
                      {userRole !== 'parent' && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          notice.status === 'active' ? 'bg-green-100 text-green-800' :
                          notice.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {notice.status}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-2">{notice.message}</p>
                    <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                      <span>
                        {new Date(notice.dropDate).toLocaleDateString()} at {notice.dropTime}
                      </span>
                      {userRole !== 'parent' && (
                        <span>
                          Posted by: {notice.createdBy?.name || 'System'}
                        </span>
                      )}
                    </div>
                    {userRole !== 'parent' && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this notice?')) {
                              try {
                                const token = localStorage.getItem('token');
                                await axios.delete(`${process.env.REACT_APP_URL}/api/notices/${notice._id}`, {
                                  headers: {
                                    Authorization: `Bearer ${token}`
                                  }
                                });
                                toast.success('Notice deleted successfully');
                                fetchNotices();
                              } catch (error) {
                                toast.error('Failed to delete notice');
                              }
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}