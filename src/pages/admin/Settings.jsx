import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiTrash2 } from 'react-icons/fi';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Constants for the protected super admin
  const PROTECTED_SUPER_ADMIN_PHONE = '9353980418';
  const isProtectedUser = (user) => user.phonenumber === PROTECTED_SUPER_ADMIN_PHONE && user.role === 'super_admin';

  // Fetch all users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUsers(response.data.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
        console.error('Fetch users error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Update user approval status
  const handleApprovalToggle = async (userId, currentApproval) => {
    try {
      setActionLoading(true);
      const response = await axios.patch(
        `${process.env.REACT_APP_URL}/api/users/${userId}/approval`,
        { approval: !currentApproval },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setUsers(users.map(user => 
        user._id === userId ? { ...user, approval: !currentApproval } : user
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update approval');
      console.error('Approval update error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Update user role
  const handleRoleChange = async (userId, newRole) => {
    try {
      setActionLoading(true);
      const response = await axios.patch(
        `${process.env.REACT_APP_URL}/api/users/${userId}/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      setUsers(users.map(user => 
        user._id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
      console.error('Role update error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user with confirmation
  const handleDeleteUser = async (userId) => {
    const userToDelete = users.find(user => user._id === userId);
    if (isProtectedUser(userToDelete)) {
      alert('This super admin account cannot be deleted');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setActionLoading(true);
      await axios.delete(
        `${process.env.REACT_APP_URL}/api/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setUsers(users.filter(user => user._id !== userId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      console.error('Delete user error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <h1 className="text-3xl font-bold">User Management Settings</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md my-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto mt-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => {
                const isProtected = isProtectedUser(user);
                return (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.phonenumber}
                        {isProtected && <span className="ml-2 text-xs text-yellow-600">(Protected)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${
                          isProtected ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        disabled={actionLoading || isProtected}
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="counseller">Counseller</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => !isProtected && handleApprovalToggle(user._id, user.approval)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          user.approval ? 'bg-green-600' : 'bg-gray-200'
                        } ${actionLoading || isProtected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={actionLoading || isProtected}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            user.approval ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="ml-2 text-sm text-gray-600">
                        {user.approval ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className={`text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition-colors ${
                          isProtected ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={actionLoading || isProtected}
                        title={isProtected ? 'Protected account cannot be deleted' : 'Delete User'}
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}