import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FiTrash2, FiPlus } from 'react-icons/fi';

const PatternsForm = ({ initialValues, onSuccess, onCancel }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingScheme, setMarkingScheme] = useState('NEET'); // 'NEET' or 'CET'

  const formik = useFormik({
    initialValues: initialValues || {
      type: 'LongTerm',
      testName: '',
      subjects: [{ subject: '', totalQuestions: 1, totalMarks: 4 }],
    },
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const isPTT = values.type === 'PUC' && values.testName.toUpperCase() === 'PTT';
        const isPCT = values.type === 'PUC' && values.testName.toUpperCase() === 'PCT';

        const payload = {
          ...values,
          subjects: values.subjects.map(sub => {
            if (isPTT) return { ...sub, totalQuestions: 0, totalMarks: 25 };
            if (isPCT) {
              const marksPerQuestion = markingScheme === 'NEET' ? 4 : 1;
              return { ...sub, totalMarks: sub.totalQuestions * marksPerQuestion };
            }
            // LongTerm - 4 marks per question
            return { ...sub, totalMarks: sub.totalQuestions * 4 };
          }),
          totalMarks: values.subjects.reduce((sum, sub) => {
            if (isPTT) return sum + 25;
            if (isPCT) {
              const marksPerQuestion = markingScheme === 'NEET' ? 4 : 1;
              return sum + (sub.totalQuestions * marksPerQuestion);
            }
            return sum + (sub.totalQuestions * 4);
          }, 0)
        };

        const token = localStorage.getItem('token');
        await axios.post(`${process.env.REACT_APP_URL}/api/createpatterns`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success('Pattern saved successfully!');
        onSuccess?.();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to save pattern');
      } finally {
        setLoading(false);
      }
    }
  });

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${process.env.REACT_APP_URL}/api/getsubjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubjects(res.data.data);
      } catch (error) {
        toast.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, []);

  // Handle test type/name changes
  useEffect(() => {
    const isPTT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PTT';
    const isPCT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PCT';
    
    const updatedSubjects = formik.values.subjects.map(sub => {
      if (isPTT) {
        return { ...sub, totalQuestions: 0, totalMarks: 25 };
      }
      if (isPCT) {
        const marksPerQuestion = markingScheme === 'NEET' ? 4 : 1;
        return { ...sub, totalMarks: sub.totalQuestions * marksPerQuestion };
      }
      // LongTerm
      return { ...sub, totalMarks: sub.totalQuestions * 4 };
    });
    
    formik.setFieldValue('subjects', updatedSubjects);
  }, [formik.values.type, formik.values.testName, markingScheme]);

  const addSubject = () => {
    const isPTT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PTT';
    const isPCT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PCT';
    
    formik.setFieldValue('subjects', [
      ...formik.values.subjects,
      { 
        subject: '', 
        totalQuestions: isPTT ? 0 : 1,
        totalMarks: isPTT ? 25 : 
                  (isPCT ? (markingScheme === 'NEET' ? 4 : 1) : 4)
      }
    ]);
  };

  const removeSubject = (index) => {
    const updated = formik.values.subjects.filter((_, i) => i !== index);
    formik.setFieldValue('subjects', updated);
  };

  const handleQuestionChange = (index, value) => {
    const questions = parseInt(value) || 0;
    const isPTT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PTT';
    const isPCT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PCT';
    
    let marks = questions;
    if (isPTT) {
      marks = 25;
    } else if (isPCT) {
      marks = questions * (markingScheme === 'NEET' ? 4 : 1);
    } else {
      // LongTerm
      marks = questions * 4;
    }
    
    formik.setFieldValue(`subjects[${index}].totalQuestions`, questions);
    formik.setFieldValue(`subjects[${index}].totalMarks`, marks);
  };

  const isPTT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PTT';
  const isPCT = formik.values.type === 'PUC' && formik.values.testName.toUpperCase() === 'PCT';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">
        {initialValues ? 'Edit Pattern' : 'New Pattern'}
      </h2>

      <form onSubmit={formik.handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Type</label>
            <select
              name="type"
              onChange={formik.handleChange}
              value={formik.values.type}
              className="w-full p-2 border rounded"
            >
              <option value="LongTerm">LongTerm</option>
              <option value="PUC">PUC</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">Test Name</label>
            <input
              type="text"
              name="testName"
              onChange={formik.handleChange}
              value={formik.values.testName}
              className="w-full p-2 border rounded"
              placeholder="Enter TestNames in Alphabets only."
            />
          </div>
        </div>

        {isPCT && (
          <div className="bg-gray-50 p-4 rounded">
            <label className="block mb-2">Marking Scheme</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="markingScheme"
                  checked={markingScheme === 'NEET'}
                  onChange={() => setMarkingScheme('NEET')}
                  className="mr-2"
                />
                NEET (+4 per question)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="markingScheme"
                  checked={markingScheme === 'CET'}
                  onChange={() => setMarkingScheme('CET')}
                  className="mr-2"
                />
                CET (+1 per question)
              </label>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Subject</th>
                {!isPTT && <th className="p-3">Questions</th>}
                <th className="p-3">Marks</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {formik.values.subjects.map((subject, index) => (
                <tr key={index} className="border-b">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">
                    <select
                      value={subject.subject}
                      onChange={(e) => 
                        formik.setFieldValue(`subjects[${index}].subject`, e.target.value)
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((subj) => (
                        <option key={subj._id} value={subj._id}>
                          {subj.subjectName}
                        </option>
                      ))}
                    </select>
                  </td>
                  {!isPTT && (
                    <td className="p-3">
                      <input
                        type="number"
                        min="1"
                        value={subject.totalQuestions}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <input
                      type="number"
                      value={subject.totalMarks}
                      readOnly
                      className="w-full p-2 border rounded bg-gray-100"
                    />
                  </td>
                  <td className="p-3">
                    {formik.values.subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={addSubject}
            className="flex items-center px-4 py-2 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white rounded"
          >
            <FiPlus className="mr-2" /> Add Subject
          </button>

          <div className="text-lg font-semibold">
            Total Marks: {formik.values.subjects.reduce((sum, sub) => sum + sub.totalMarks, 0)}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Pattern'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatternsForm;