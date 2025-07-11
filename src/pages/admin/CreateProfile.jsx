import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function CreateProfile() {
  const [formData, setFormData] = useState({
    username: "",
    idNumber: "",
    fullName: "",
    role: "",
    dateOfBirth: "",
    address: "",
    mobileNumber: "",
    contactNumber: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_URL}/api/createprofile`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Profile created successfully");
      setFormData({
        username: "",
        idNumber: "",
        fullName: "",
        role: "",
        dateOfBirth: "",
        address: "",
        mobileNumber: "",
        contactNumber: "",
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Error creating profile";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-bold mb-4">Create Staff/Admin Profile</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <div>
          <label className="block mb-1">Username (Mobile No. from User)</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">ID Number</label>
          <input type="text" name="idNumber" value={formData.idNumber} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Full Name</label>
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Role</label>
          <input type="text" name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Date of Birth</label>
          <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Address</label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Mobile Number</label>
          <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block mb-1">Contact Number</label>
          <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Profile"}
        </button>
      </form>
    </div>
  );
}
