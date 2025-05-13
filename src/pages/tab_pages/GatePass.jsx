import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function GatePass() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const studentRegNumber = localStorage.getItem('studentRegNumber'); // For parent view
const [activeTab, setActiveTab] = useState(
  userRole === 'parent' ? 'parentview' : 
  userRole === 'staff' ? 'generate' : 
  'viewall'
);  const [formData, setFormData] = useState({
    studentRegNumber: '',
    studentName: '',
    campus: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    parentName: '',
    parentMobile: '',
    escorterName: '',
    escorterMobile: '',
    wardenName: '',
    imageURL: '',
    otp: '',
    enteredOTP: ''
  });
  const [otpChannel, setOtpChannel] = useState('sms');
  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch student details when regNumber changes
  const fetchStudentDetails = async () => {
    if (!formData.studentRegNumber.match(/^\d{6}$/)) return;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getstudentdetails/${formData.studentRegNumber}`);
      const student = response.data.data;
      
      setFormData(prev => ({
        ...prev,
        studentName: student.studentName,
        campus: student.campus._id,
        parentName: student.parentName,
        parentMobile: student.parentMobile
      }));
    } catch (error) {
      toast.error("Student not found");
    }
  };

  // Validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailValid(validateEmail(value));
  };

  // Send OTP via selected channel
  const handleSendOTP = async () => {
    try {
      let payload = { channel: otpChannel };
      
      if (otpChannel === 'email') {
        payload.email = email;
      } else {
        payload.mobile = formData.parentMobile;
      }

      const response = await axios.post(`${process.env.REACT_APP_URL}/api/sendotp`, payload);
      setFormData(prev => ({ ...prev, otp: response.data.otp }));
      toast.success(`OTP sent via ${otpChannel}`);
      setOtpSent(true);
    } catch (error) {
      toast.error(`Failed to send OTP via ${otpChannel}`);
    }
  };

  // Verify OTP
  const verifyOTP = () => {
    if (formData.otp === formData.enteredOTP) {
      setOtpVerified(true);
      toast.success("OTP verified successfully");
    } else {
      toast.error("Invalid OTP");
    }
  };

  // Upload image to S3
  const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Add validation for studentRegNumber
  if (!formData.studentRegNumber || !formData.studentRegNumber.match(/^\d{6}$/)) {
    toast.error("Please enter a valid 6-digit registration number first");
    return;
  }

  try {
    setLoading(true);
    const ext = file.name.split('.').pop();
    const response = await axios.get(
      `${process.env.REACT_APP_URL}/api/generate-gatepass-upload-url/${formData.studentRegNumber}/${ext}`
    );
    
    // Upload the file directly to S3
    await axios.put(response.data.uploadURL, file, {
      headers: {
        'Content-Type': file.type
      }
    });

    setFormData(prev => ({ ...prev, imageURL: response.data.viewURL }));
    setImageUploaded(true);
    toast.success("Image uploaded successfully");
  } catch (error) {
    console.error("Upload error:", error);
    toast.error("Failed to upload image");
  } finally {
    setLoading(false);
  }
};

  // Submit gate pass
  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`${process.env.REACT_APP_URL}/api/creategatepass`, formData, {
        headers:{
          Authorization: `Bearer ${token}`
        }
      });
      toast.success("Gate pass generated successfully");
      resetForm();
    } catch (error) {
      toast.error("Failed to generate gate pass");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      studentRegNumber: '',
      studentName: '',
      campus: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      parentName: '',
      parentMobile: '',
      escorterName: '',
      escorterMobile: '',
      wardenName: '',
      imageURL: '',
      otp: '',
      enteredOTP: ''
    });
    setEmail('');
    setEmailValid(false);
    setOtpSent(false);
    setOtpVerified(false);
    setImageUploaded(false);
  };

  // Fetch gate passes for staff view
  const fetchAllGatePasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getallgatepasses`,{
        headers:{
          Authorization: `Bearer ${token}`
        }
      });
      setGatePasses(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch gate passes");
    } finally {
      setLoading(false);
    }
  };

  // Fetch gate passes for parent view
  const fetchStudentGatePasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const regNo = localStorage.getItem('regNumber')
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getgatepassesbystudent/${regNo}`,{
        headers:{
          Authorization: `Bearer ${token}`
        }
      });
      setGatePasses(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch gate passes");
    } finally {
      setLoading(false);
    }
  };

  // Load data based on tab
  useEffect(() => {
    if (activeTab === 'viewall') {
      fetchAllGatePasses();
    } else if (activeTab === 'parentview') {
      fetchStudentGatePasses();
    }
  }, [activeTab]);

  // Get tabs based on user role
 const getTabs = (userRole) => {
  const tabs = [];
  
  if (['staff', 'admin', 'super_admin'].includes(userRole)) {
    tabs.push({ id: "generate", label: "Generate Pass" });
  }
  
  if (['staff', 'admin', 'super_admin'].includes(userRole)) {
    tabs.push({ id: "viewall", label: "View All Passes" });
  }
  
  if (userRole === 'parent') {
    tabs.push({ id: "parentview", label: "My Child's Passes" });
  }

  return tabs.length ? tabs : [{ id: "view", label: "View Passes" }];
};

  const tabs = getTabs(userRole);

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
        <h1 className="text-3xl font-bold">Out Pass</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-1 capitalize ${
                activeTab === tab.id ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto mt-6 p-4">
        {activeTab === "generate" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Generate Out Pass</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Reg Number */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">Student Registration Number</label>
                <div className="flex mt-1">
                  <input
                    type="text"
                    value={formData.studentRegNumber}
                    onChange={(e) => setFormData({...formData, studentRegNumber: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter 6-digit reg number"
                  />
                  <button 
                    onClick={fetchStudentDetails}
                    className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Fetch
                  </button>
                </div>
              </div>

              {/* Student Name */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">Student Name</label>
                <input
                  type="text"
                  value={formData.studentName}
                  readOnly
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>

              {/* Parent Name */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">Parent Name</label>
                <input
                  type="text"
                  value={formData.parentName}
                  readOnly
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>

              {/* Parent Mobile */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">Parent Mobile</label>
                <input
                  type="text"
                  value={formData.parentMobile}
                  readOnly
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                />
              </div>

              {/* OTP Channel Selection */}
              <div className="col-span-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Send OTP via</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setOtpChannel('sms')}
                    className={`px-4 py-2 rounded-md ${otpChannel === 'sms' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    SMS
                  </button>
                  <button
                    onClick={() => setOtpChannel('whatsapp')}
                    className={`px-4 py-2 rounded-md ${otpChannel === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setOtpChannel('email')}
                    className={`px-4 py-2 rounded-md ${otpChannel === 'email' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                  >
                    Email
                  </button>
                </div>
              </div>

              {/* Email Input (shown only when email channel selected) */}
              {otpChannel === 'email' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter email address"
                  />
                  {email && !emailValid && (
                    <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                  )}
                </div>
              )}

              {/* Send OTP Button */}
              <div className="col-span-2">
                <button
                  onClick={handleSendOTP}
                  disabled={
                    (otpChannel !== 'email' && !formData.parentMobile) ||
                    (otpChannel === 'email' && (!email || !emailValid)) ||
                    otpSent
                  }
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {otpSent ? 'OTP Sent' : `Send OTP via ${otpChannel.toUpperCase()}`}
                </button>
              </div>

              {/* OTP Verification */}
              {otpSent && !otpVerified && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      value={formData.enteredOTP}
                      onChange={(e) => setFormData({...formData, enteredOTP: e.target.value})}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter 6-digit OTP"
                      maxLength="6"
                    />
                    <button 
                      onClick={verifyOTP}
                      className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {/* Escorter Details */}
              {otpVerified && (
                <>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Escorter Name</label>
                    <input
                      type="text"
                      value={formData.escorterName}
                      onChange={(e) => setFormData({...formData, escorterName: e.target.value})}
                      className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Escorter Mobile</label>
                    <input
                      type="text"
                      value={formData.escorterMobile}
                      onChange={(e) => setFormData({...formData, escorterMobile: e.target.value})}
                      className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Warden Name</label>
                    <input
                      type="text"
                      value={formData.wardenName}
                      onChange={(e) => setFormData({...formData, wardenName: e.target.value})}
                      className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Escorter Photo</label>
                    <input
                      type="file"
                      onChange={handleImageUpload}
                      className="mt-1 w-full"
                      accept="image/*"
                      required
                    />
                    {loading && <p className="text-sm text-gray-500">Uploading image...</p>}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={resetForm}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Clear All
              </button>
              <button
                onClick={handleSubmit}
                disabled={!otpVerified || !imageUploaded}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-gray-400"
              >
                Generate Pass
              </button>
            </div>
          </div>
        )}

        {activeTab === "viewall" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">All Gate Passes</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Mobile</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escorter Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warden Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gatePasses.map((pass) => (
                      <tr key={pass._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pass.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pass.studentRegNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.parentMobile}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.escorterName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.wardenName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.imageURL && (
                            <a href={pass.imageURL} target="_blank" rel="noopener noreferrer">
                              <img src={pass.imageURL} alt="Escorter" className="h-10 w-10 rounded-full object-cover" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "parentview" && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Gate Passes</h2>
            {loading ? (
              <p>Loading...</p>
            ) : gatePasses.length === 0 ? (
              <p>No gate passes found</p>
            ) : (
              <div className="space-y-4">
                {gatePasses.map((pass) => (
                  <div key={pass._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p>{new Date(pass.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Time</p>
                        <p>{pass.time}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Escorter Name</p>
                        <p>{pass.escorterName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Escorter Mobile</p>
                        <p>{pass.escorterMobile}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Warden Name</p>
                        <p>{pass.wardenName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Escorter Photo</p>
                        {pass.imageURL && (
                          <a href={pass.imageURL} target="_blank" rel="noopener noreferrer">
                            <img src={pass.imageURL} alt="Escorter" className="h-30 w-28 rounded-full object-cover" />
                          </a>
                        )}
                      </div>
                    </div>
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