import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function GatePass() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const studentRegNumber = localStorage.getItem('regNumber'); 
  const [activeTab, setActiveTab] = useState(
    userRole === 'parent' ? 'parentview' : 
    userRole === 'staff' ? 'generate' : 
    'viewall'
  );
  const [formData, setFormData] = useState({
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
    imageKey: '',
    otp: '',
    enteredOTP: '',
    passType: 'check-out',
    checkInTime: ''
  });
  const [otpChannel, setOtpChannel] = useState('sms');
  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentHasEmail, setStudentHasEmail] = useState(false);

  // Fetch student details when regNumber changes
  const fetchStudentDetails = async () => {
    if (!formData.studentRegNumber.match(/^\d{6}$/)) {
      toast.error("Please enter a valid 6-digit registration number");
      return;
    }
    
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

      // Check if student has email and set states accordingly
      if (student.emailId && validateEmail(student.emailId)) {
        setEmail(student.emailId);
        setEmailValid(true);
        setStudentHasEmail(true);
      } else {
        setEmail('');
        setEmailValid(false);
        setStudentHasEmail(false);
      }
    } catch (error) {
      toast.error("Student not found");
      setStudentHasEmail(false);
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
        if (!emailValid) {
          toast.error("Please enter a valid email address");
          return;
        }
        payload.email = email;
      } else {
        if (!formData.parentMobile) {
          toast.error("Parent mobile number is required");
          return;
        }
        payload.mobile = formData.parentMobile;
      }

      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_URL}/api/sendotp`, payload);
      setFormData(prev => ({ ...prev, otp: response.data.otp }));
      toast.success(`OTP sent via ${otpChannel}`);
      setOtpSent(true);
    } catch (error) {
      toast.error(`Failed to send OTP via ${otpChannel}`);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = () => {
    if (!formData.enteredOTP || formData.enteredOTP.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }

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

    if (!formData.studentRegNumber || !formData.studentRegNumber.match(/^\d{6}$/)) {
      toast.error("Please enter a valid 6-digit registration number first");
      return;
    }

    try {
      setLoading(true);
      const ext = file.name.split('.').pop();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/generate-gatepass-upload-url/${formData.studentRegNumber}/${ext}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      await axios.put(response.data.uploadURL, file, {
        headers: {
          'Content-Type': file.type
        }
      });

      setFormData(prev => ({ 
        ...prev, 
        imageKey: response.data.key
      }));
      setImageUploaded(true);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate('/login');
      } else {
        toast.error("Failed to upload image");
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit gate pass
  const handleSubmit = async () => {
    if (!formData.escorterName || !formData.escorterMobile || !formData.wardenName || !formData.imageKey) {
      toast.error("Please fill all required fields");
      return;
    }

    const submitData = { ...formData };
    if (submitData.passType === 'check-in') {
      submitData.checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_URL}/api/creategatepass`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      toast.success(`Gate pass ${submitData.passType === 'check-out' ? 'generated' : 'recorded'} successfully`);
      resetForm();
      if (activeTab === 'viewall') {
        fetchAllGatePasses();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process gate pass");
    } finally {
      setLoading(false);
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
      imageKey: '',
      otp: '',
      enteredOTP: '',
      passType: 'check-out',
      checkInTime: ''
    });
    setEmail('');
    setEmailValid(false);
    setOtpSent(false);
    setOtpVerified(false);
    setImageUploaded(false);
    setStudentHasEmail(false);
  };

  // Fetch gate passes for staff view
  const fetchAllGatePasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getallgatepasses`, {
        headers: {
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

  // Fetch active check-out passes
  const fetchActiveCheckOutPasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getactivecheckoutpasses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setGatePasses(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch active passes");
    } finally {
      setLoading(false);
    }
  };

  // Fetch gate passes for parent view
  const fetchStudentGatePasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getgatepassesbystudent/${studentRegNumber}`, {
        headers: {
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
    } else if (activeTab === 'active') {
      fetchActiveCheckOutPasses();
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
    
    if (['admin', 'super_admin'].includes(userRole)) {
      tabs.push({ id: "viewall", label: "View All Passes" });
      tabs.push({ id: "active", label: "Active Check-Outs" });
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
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-4 sm:px-8 flex flex-col">
        <button
          onClick={() => navigate('/home')}
          className="text-white text-sm flex items-center mb-2 self-start"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold">E-Pass</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-1 capitalize text-sm sm:text-base ${
                activeTab === tab.id ? "border-b-2 border-white" : "text-gray-200 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto mt-6 p-2 sm:p-4">
        
        {activeTab === "generate" && (
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Generate E-Pass</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Pass Type */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pass Type</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setFormData({ ...formData, passType: 'check-out' })} 
                    className={`px-4 py-2 rounded-md ${formData.passType === 'check-out' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  >
                    Check-Out Pass
                  </button>
                  <button 
                    onClick={() => setFormData({ ...formData, passType: 'check-in' })} 
                    className={`px-4 py-2 rounded-md ${formData.passType === 'check-in' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                  >
                    Check-In Pass
                  </button>
                </div>
              </div>

              {/* Student Reg Number & Fetch */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Registration Number</label>
                <div className="flex flex-col md:flex-row gap-2">
                  <input 
                    type="text" 
                    value={formData.studentRegNumber} 
                    onChange={(e) => setFormData({ ...formData, studentRegNumber: e.target.value })} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2" 
                    placeholder="Enter 6-digit reg number" 
                    maxLength="6" 
                    pattern="\d{6}" 
                    inputMode="numeric" 
                  />
                  <button 
                    onClick={fetchStudentDetails} 
                    disabled={!formData.studentRegNumber.match(/^\d{6}$/)} 
                    className="w-full md:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    Fetch
                  </button>
                </div>
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                <input 
                  type="text" 
                  value={formData.studentName} 
                  readOnly 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100" 
                />
              </div>

              {/* Parent Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                <input 
                  type="text" 
                  value={formData.parentName} 
                  readOnly 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100" 
                />
              </div>

              {/* Parent Mobile */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Mobile</label>
                <input 
                  type="text" 
                  value={formData.parentMobile} 
                  readOnly 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100" 
                />
              </div>

              {/* OTP Channel */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Send OTP via</label>
                <div className="flex flex-wrap gap-2">
                  {/* <button 
      onClick={() => setOtpChannel('sms')}
      disabled
      className={`px-4 py-2 rounded-md w-full sm:w-auto cursor-not-allowed ${otpChannel === 'sms' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}
    >
      SMS
    </button>
                  <button 
                    onClick={() => setOtpChannel('whatsapp')} 
                    disabled

                    className={`px-4 py-2 rounded-md w-full sm:w-auto cursor-not-allowed ${otpChannel === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                  >
                    WhatsApp
                  </button> */}
                  <button 
                    onClick={() => setOtpChannel('email')} 
                    className={`px-4 py-2 rounded-md w-full sm:w-auto ${otpChannel === 'email' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                  >
                    Email
                  </button>
                </div>
              </div>

              {/* Email Input - Only shown when email channel is selected and student has no email */}
              {otpChannel === 'email' && !studentHasEmail && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={handleEmailChange} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2" 
                    placeholder="Enter email address" 
                    required 
                  />
                  {email && !emailValid && (
                    <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                  )}
                </div>
              )}

              {/* Display student's email if available */}
              {otpChannel === 'email' && studentHasEmail && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-blue-700">{email}</span>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <button 
                  onClick={handleSendOTP} 
                  disabled={
                    (otpChannel !== 'email' && !formData.parentMobile) || 
                    (otpChannel === 'email' && ((!studentHasEmail && (!email || !emailValid)) || (studentHasEmail && !emailValid))) || 
                    otpSent || 
                    (otpChannel === 'sms' || otpChannel === 'whatsapp') ||
                    loading
                  } 
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Sending...' : otpSent ? 'OTP Sent' : `Send OTP via ${otpChannel.toUpperCase()}`}
                </button>
              </div>

              {otpSent && !otpVerified && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input 
                      type="text" 
                      value={formData.enteredOTP} 
                      onChange={(e) => setFormData({ ...formData, enteredOTP: e.target.value })} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2" 
                      placeholder="Enter 6-digit OTP" 
                      maxLength="6" 
                      inputMode="numeric" 
                    />
                    <button 
                      onClick={verifyOTP} 
                      disabled={!formData.enteredOTP || formData.enteredOTP.length !== 6} 
                      className="w-full md:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {otpVerified && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escorter Name*</label>
                    <input 
                      type="text" 
                      value={formData.escorterName} 
                      onChange={(e) => setFormData({ ...formData, escorterName: e.target.value })} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escorter Mobile*</label>
                    <input 
                      type="tel" 
                      value={formData.escorterMobile} 
                      onChange={(e) => setFormData({ ...formData, escorterMobile: e.target.value })} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2" 
                      required 
                      inputMode="tel" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warden Name*</label>
                    <input 
                      type="text" 
                      value={formData.wardenName} 
                      onChange={(e) => setFormData({ ...formData, wardenName: e.target.value })} 
                      className="w-full border border-gray-300 rounded-md px-3 py-2" 
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Escorter Photo*</label>
                    <input 
                      type="file" 
                      onChange={handleImageUpload} 
                      className="w-full text-sm" 
                      accept="image/*" 
                      required 
                      disabled={loading} 
                    />
                    {loading && <p className="text-sm text-gray-500 mt-1">Uploading image...</p>}
                    {imageUploaded && !loading && <p className="text-sm text-green-500 mt-1">Image uploaded successfully</p>}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col md:flex-row gap-2 md:justify-end">
              <button 
                onClick={resetForm} 
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                Clear All
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={!otpVerified || !imageUploaded || loading} 
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-gray-400"
              >
                {loading ? 'Processing...' : formData.passType === 'check-out' ? 'Generate Pass' : 'Record Check-In'}
              </button>
            </div>
          </div>
        )}

        {/* Rest of the tabs (viewall, active, parentview) remain unchanged */}
        {activeTab === "viewall" && (
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">All E-Passes</h2>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <p>Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Mobile</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escorter</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warden</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gatePasses.map((pass) => (
                      <tr key={pass._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pass.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.passType === 'check-out' ? 'Check-Out' : 'Check-In'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pass.studentRegNumber}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.studentName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.parentMobile}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.escorterName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.wardenName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            pass.status === 'approved' ? 'bg-green-100 text-green-800' :
                            pass.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            pass.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {pass.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.imageURL && (
                            <a href={pass.imageURL} target="_blank" rel="noopener noreferrer" className="inline-block">
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

        {activeTab === "active" && (
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Active Check-Out Passes</h2>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <p>Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Mobile</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escorter</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warden</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {gatePasses.map((pass) => (
                      <tr key={pass._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pass.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pass.studentRegNumber}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.studentName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.parentMobile}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.escorterName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.wardenName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            pass.status === 'approved' ? 'bg-green-100 text-green-800' :
                            pass.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            pass.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {pass.status}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pass.imageURL && (
                            <a href={pass.imageURL} target="_blank" rel="noopener noreferrer" className="inline-block">
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
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">My Child's E-Passes</h2>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <p>Loading...</p>
              </div>
            ) : gatePasses.length === 0 ? (
              <p className="text-gray-600 text-center">No passes found.</p>
            ) : (
              <div className="grid gap-4">
                {gatePasses.map((pass) => (
                  <div key={pass._id} className="border rounded-lg shadow-sm p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-gray-500">{new Date(pass.date).toLocaleDateString()}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        pass.status === 'approved' ? 'bg-green-100 text-green-800' :
                        pass.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        pass.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {pass.status || 'pending'}
                      </span>
                    </div>
                    <div className="text-sm mb-1"><strong>Pass Type:</strong> {pass.passType === 'check-out' ? 'Check-Out' : 'Check-In'}</div>
                    <div className="text-sm mb-1"><strong>Escorter:</strong> {pass.escorterName}</div>
                    <div className="text-sm mb-1"><strong>Escorter Number:</strong> {pass.escorterMobile}</div>
                    <div className="text-sm mb-1"><strong>Warden:</strong> {pass.wardenName}</div>
                    {pass.passType === 'check-out' ? (
                      <div className="text-sm mb-1"><strong>Check-Out Time:</strong> {pass.time}</div>
                    ):(
                      <div className="text-sm mb-1"><strong>Check-In Time:</strong> {pass.checkInTime}</div>
                    )}
                    {pass.imageURL ? (
                      <div className="mt-2">
                        <a href={pass.imageURL} target="_blank" rel="noopener noreferrer">
                          <img
                            src={pass.imageURL}
                            alt="Escorter"
                            className="h-24 w-24 rounded-md object-cover border"
                          />
                        </a>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic mt-2">No image uploaded</div>
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