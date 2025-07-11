import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

function ViewProfile() {
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [signedImageUrl, setSignedImageUrl] = useState(null);
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!username) {
      toast.error("No username found. Please log in again.");
      return;
    }

    axios
      .get(`${process.env.REACT_APP_URL}/api/getprofile/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(async (res) => {
        setProfile(res.data.data);
        setFormData(res.data.data);
        if (res.data.data.imageUrl) {
          const idNumber = res.data.data.idNumber;
          const signedRes = await axios.get(
            `${process.env.REACT_APP_URL}/api/viewprofileimage/${idNumber}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setSignedImageUrl(signedRes.data.url);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load profile.");
      });
  }, [token, username]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_URL}/api/updateprofile/${username}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Profile updated successfully.");
      setProfile(formData);
      setEditMode(false);
    } catch (err) {
      toast.error("Error updating profile.");
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile) return toast.error("Please choose an image.");

    try {
      const uploadUrlRes = await axios.get(
        `${process.env.REACT_APP_URL}/api/getuploadurl/${profile.idNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.put(uploadUrlRes.data.url, imageFile, {
        headers: { "Content-Type": imageFile.type },
      });

      const imageUrl = uploadUrlRes.data.url.split("?")[0];

      await axios.put(
        `${process.env.REACT_APP_URL}/api/updateprofileimageurl/${username}`,
        { imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile({ ...profile, imageUrl });
      toast.success("Image uploaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload image.");
    }
  };

  if (!profile) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white shadow p-6 rounded-lg mt-4">
      <h2 className="text-xl font-bold mb-4 text-center">My Profile</h2>
      <div className="space-y-3">
        {editMode ? (
          <>
            <input
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Full Name"
            />
            <input
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Role"
            />
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth?.split("T")[0]}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            <input
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Mobile Number"
            />
            <input
              name="contactNumber"
              value={formData.contactNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Contact Number"
            />
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Address"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormData(profile);
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
            {/* Password Change Section */}
            {/* <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Change Password</h3>
              <div className="grid gap-3">
                <input
                  type="password"
                  
                  placeholder="Current Password"
                  className="p-2 border rounded"
                  value={formData.currentPassword || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentPassword: e.target.value,
                    })
                  }
                />
                <input
                  type="password"
                  placeholder="New Password"
                  className="p-2 border rounded"
                  value={formData.newPassword || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                />
                <button
                  onClick={async () => {
                    try {
                      const res = await axios.put(
                        `${process.env.REACT_APP_URL}/api/updatepassword/${username}`,
                        {
                          currentPassword: formData.currentPassword,
                          newPassword: formData.newPassword,
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      toast.success(res.data.message);
                      setFormData({
                        ...formData,
                        currentPassword: "",
                        newPassword: "",
                      });
                    } catch (err) {
                      toast.error(
                        err.response?.data?.message || "Password update failed"
                      );
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Update Password
                </button>
              </div>
            </div> */}
          </>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            {signedImageUrl && (
              <img
                src={signedImageUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover"
              />
            )}
            <div className="space-y-2 w-full">
              <p>
                <strong>Full Name:</strong> {profile.fullName}
              </p>
              <p>
                <strong>Role:</strong> {profile.role}
              </p>
              <p>
                <strong>ID Number:</strong> {profile.idNumber}
              </p>
              <p>
                <strong>Date of Birth:</strong>{" "}
                {new Date(profile.dateOfBirth).toLocaleDateString()}
              </p>
              <p>
                <strong>Mobile Number:</strong> {profile.mobileNumber}
              </p>
              <p>
                <strong>Contact Number:</strong>{" "}
                {profile.contactNumber || "N/A"}
              </p>
              <p>
                <strong>Address:</strong> {profile.address}
              </p>
              <button
                onClick={() => setEditMode(true)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
              >
                Edit Profile Details
              </button>
            </div>
          </div>
        )}
        <div className="mt-4">
          <label className="block mb-1">Update Profile Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
          <button
            onClick={handleImageUpload}
            className="mt-2 bg-indigo-600 text-white px-4 py-1 rounded"
          >
            Update Image
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewProfile;
