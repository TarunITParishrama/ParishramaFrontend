import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import batchesIcon from "../../assets/batches.png"; 

export default function Batches() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Boys",
    location: ""
  });

  // Fetch all campuses
  useEffect(() => {
    if (activeTab === "all") {
      fetchCampuses();
    }
  }, [activeTab]);

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getcampuses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCampuses(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch campuses");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateCampus = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.REACT_APP_URL}/api/createcampus`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      toast.success("Campus created successfully!");
      resetForm();
      fetchCampuses();
      setActiveTab("all");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create campus");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampus = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put(`${process.env.REACT_APP_URL}/api/updatecampus/${editingId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      toast.success("Campus updated successfully!");
      resetForm();
      fetchCampuses();
      setActiveTab("all");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update campus");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampus = async (id) => {
    if (window.confirm("Are you sure you want to delete this campus?")) {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        await axios.delete(`${process.env.REACT_APP_URL}/api/deletecampus/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        toast.success("Campus deleted successfully!");
        fetchCampuses();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete campus");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditClick = (campus) => {
    setEditingId(campus._id);
    setFormData({
      name: campus.name,
      type: campus.type,
      location: campus.location
    });
    setActiveTab("edit");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "Boys",
      location: ""
    });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button
          onClick={() => navigate('/home')}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Campus Management</h1>
        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {["all", "create"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                resetForm();
                setActiveTab(tab);
              }}
              className={`pb-1 capitalize ${
                activeTab === tab ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab === "all" ? "All Campuses" : "Create Campus"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6 mb-8">
        {activeTab === "all" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <img src={batchesIcon} alt="Batches" className="h-6 w-6 mr-2" />
                <h2 className="text-lg font-semibold">All Campuses</h2>
              </div>
              <button 
                onClick={() => {
                  resetForm();
                  setActiveTab("create");
                }}
                className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500 flex items-center"
              >
                <span>+ Add Campus</span>
              </button>
            </div>
            
            {loading ? (
              <div className="text-center py-8">Loading campuses...</div>
            ) : campuses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No campuses found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campuses.map((campus) => (
                      <tr key={campus._id}>
                        <td className="px-6 py-4 whitespace-nowrap">{campus.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{campus.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{campus.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap flex space-x-2">
                          <button 
                            onClick={() => handleDeleteCampus(campus._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            disabled={loading}
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                          <button 
                            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                            onClick={() => handleEditClick(campus)}
                            disabled={loading}
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {(activeTab === "create" || activeTab === "edit") && (
          <>
            <h2 className="text-lg font-semibold">
              {activeTab === "create" ? "➕ Create New Campus" : "✏️ Edit Campus"}
            </h2>
            <form onSubmit={activeTab === "create" ? handleCreateCampus : handleUpdateCampus} className="mt-4">
              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Campus Name *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded-md mt-1" 
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Campus Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded-md mt-1"
                  required
                >
                  <option value="Boys">Boys</option>
                  <option value="Girls">Girls</option>
                  <option value="Co-ed">Co-ed</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium">Location *</label>
                <input 
                  type="text" 
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full border p-2 rounded-md mt-1" 
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("all");
                  }}
                  className="mt-6 bg-gray-300 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-2 px-6 rounded-lg hover:bg-yellow-500 transition flex-1"
                >
                  {loading ? "Processing..." : activeTab === "create" ? "Create Campus" : "Update Campus"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}