import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import axios from 'axios';
import { useState } from 'react';
import PatternsForm from '../Forms/PatternsForm';

const EditDeletePatterns = ({ patterns, selectedPattern, onSuccess, onError, onCancel }) => {
  const [editingPattern, setEditingPattern] = useState(selectedPattern || null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
        const token = localStorage.getItem('token');
      const response = await axios.delete(`${process.env.REACT_APP_URL}/api/deletepatterns/${id}`,{
        headers:{Authorization:`Bearer ${token}`}
      });
      if (response.data.status === 'success') {
        onSuccess();
      } else {
        onError(response.data.message || 'Failed to delete pattern');
      }
    } catch (error) {
      onError(error.response?.data?.message || 'Error deleting pattern');
    } finally {
      setDeletingId(null);
    }
  };

  if (editingPattern) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setEditingPattern(null)}
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center mb-4"
        >
          ← Back to list
        </button>
        <PatternsForm
          initialValues={editingPattern}
          onSubmit={async (values) => {
            try {
                const token = localStorage.getItem('token');
              const response = await axios.put(`${process.env.REACT_APP_URL}/api/updatepatterns/${editingPattern._id}`,
                {
                    headers:{Authorization: `Bearer ${token}`}
                },
                 values);
              if (response.data.status === 'success') {
                onSuccess();
              } else {
                onError(response.data.message || 'Failed to update pattern');
              }
            } catch (error) {
              onError(error.response?.data?.message || 'Error updating pattern');
            }
          }}
          onCancel={() => setEditingPattern(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onCancel}
        className="text-blue-600 hover:text-blue-800 text-sm flex items-center mb-4"
      >
        ← Back to view
      </button>
      
      <h2 className="text-xl font-semibold">Edit or Delete Patterns</h2>
      
      {patterns.length === 0 ? (
        <div className="text-gray-500">No patterns available to edit.</div>
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingPattern(pattern)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Edit"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(pattern._id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete"
                    disabled={deletingId === pattern._id}
                  >
                    {deletingId === pattern._id ? 'Deleting...' : <FiTrash2 />}
                  </button>
                </div>
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
  );
};

export default EditDeletePatterns;