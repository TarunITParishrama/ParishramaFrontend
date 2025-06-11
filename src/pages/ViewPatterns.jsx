import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PatternsForm from '../Forms/PatternsForm';
import EditDeletePatterns from './EditDeletePatterns';
import axios from 'axios';

const ViewPatterns = () => {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('view');
  const [selectedPattern, setSelectedPattern] = useState(null);

  useEffect(() => {
    if (activeView !== 'view') return;
    
    const fetchPatterns = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/getpatterns`,
            {
                headers: {Authorization:`Bearer ${token}`}
            }
        );
        setPatterns(response.data.data);
      } catch (error) {
        toast.error('Failed to fetch patterns');
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
  }, [activeView]);

  const handleSuccess = (message) => {
    toast.success(message);
    setActiveView('view');
    setSelectedPattern(null);
  };

  const handleError = (error) => {
    toast.error(error);
  };

  const handleEditClick = (pattern) => {
    setSelectedPattern(pattern);
    setActiveView('edit');
  };

  return (
    <div className="space-y-4">
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveView('view')}
          className={`px-4 py-2 rounded-md ${
            activeView === 'view' ? 'bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          View Patterns
        </button>
        <button
          onClick={() => setActiveView('add')}
          className={`px-4 py-2 rounded-md ${
            activeView === 'add' ? 'bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Add Pattern
        </button>
        <button
          onClick={() => setActiveView('edit')}
          className={`px-4 py-2 rounded-md ${
            activeView === 'edit' ? 'bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white' : 'bg-gray-200 text-gray-700'
          }`}
          disabled={patterns.length === 0}
        >
          Edit/Delete Patterns
        </button>
      </div>

      {activeView === 'view' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Patterns</h2>
          {loading ? (
            <div>Loading patterns...</div>
          ) : patterns.length === 0 ? (
            <div className="text-gray-500">No patterns found. Add one to get started.</div>
          ) : (
            <div className="space-y-4">
              {patterns.map((pattern) => (
                <div key={pattern._id} className="p-4 border rounded-md shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {pattern.testName} ({pattern.type})
                      </h3>
                      <p className="text-sm text-gray-600">
                        Total Marks: {pattern.totalMarks}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditClick(pattern)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Quick Edit
                    </button>
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Subjects:</h4>
                    <ul className="space-y-1">
                      {pattern.subjects.map((subject, index) => (
                        <li key={index} className="text-sm">
                          • {subject.subject.subjectName}: {subject.totalQuestions} questions ({subject.totalMarks} marks)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'add' && (
        <PatternsForm 
          onSuccess={() => handleSuccess('Pattern created successfully!')}
          onError={handleError}
          onCancel={() => setActiveView('view')}
        />
      )}

      {activeView === 'edit' && (
        <EditDeletePatterns
          patterns={patterns}
          selectedPattern={selectedPattern}
          onSuccess={() => handleSuccess('Pattern updated/deleted successfully!')}
          onError={handleError}
          onCancel={() => setActiveView('view')}
        />
      )}
    </div>
  );
};

export default ViewPatterns;