import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import titlelogo from "../assets/loginpagelogo.jpg";


function Login() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginType, setLoginType] = useState("staff");
  const [regNumber, setRegNumber] = useState("");
  const [dob, setDob] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const rememberedRegNumber = localStorage.getItem("rememberedRegNumber");
    if (rememberedRegNumber && loginType === "parent") {
      setRegNumber(rememberedRegNumber);
      setRememberMe(true);
    }
  }, [loginType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loginType === "staff") {
      // Existing staff login/signup logic
      if (isLogin) {
        try {
          const response = await axios.post(`${process.env.REACT_APP_URL}/api/user/login`, {
            phonenumber: phone,
            password
          });
  
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("userRole", response.data.data.user.role);
          localStorage.setItem("loginType", "staff");
          
          setMessage({ text: "Login Successful!", type: "success" });
          setTimeout(() => navigate("/home"), 1500);
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Login failed";
          setMessage({ text: errorMessage, type: "error" });
        }
      } else {
      // Signup logic
      if (password !== confirmPassword) {
        setMessage({ text: "Passwords don't match", type: "error" });
        return;
      }

      if (!/^\d{10}$/.test(phone)) {
        setMessage({ text: "Please enter a valid 10-digit phone number", type: "error" });
        return;
      }

      try {
        await axios.post(`${process.env.REACT_APP_URL}/api/user/signup`, {
          phonenumber: phone,
          password,
          role: "staff" // Default role for new signups
        });

        setMessage({ 
          text: "Registration successful! Contact admin for approval.", 
          type: "success" 
        });
        setIsLogin(true); // Switch back to login after successful registration
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Registration failed";
        setMessage({ text: errorMessage, type: "error" });
      }
    }
    
  } else {
    try {
      const response = await axios.post(`${process.env.REACT_APP_URL}/api/parent/login`, {
        regNumber,
        dob
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userRole", "parent");
      localStorage.setItem("loginType", "parent");
      localStorage.setItem("regNumber", response.data.data.student.regNumber)
      localStorage.setItem("studentData", JSON.stringify({...response.data.data, regNumber: response.data.data.student.regNumber}));
      
      if (rememberMe) {
        localStorage.setItem("rememberedRegNumber", regNumber);
      } else {
        localStorage.removeItem("rememberedRegNumber");
      }
      
      setMessage({ text: "Login Successful!", type: "success" });
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Invalid credentials";
      setMessage({ text: errorMessage, type: "error" });
    }
  }
};

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Main Content Area */}
    <div className="flex-1 flex flex-col md:flex-row bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400">
      {/* Left Section - Carousel Slideshow (Desktop) */}
      
        {/* Right Section - Login Form */}
        <div className="w-full md:w-[50%] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-xl shadow-2xl w-auto max-w-md p-6 md:p-8 ml-32">
            <div className="flex flex-col items-center mb-6">
              <img 
                src={titlelogo} 
                alt="Logo" 
                className="h-16 md:h-20 w-auto mb-4" 
              />
            </div>
  
            {message.text && (
              <div className={`mb-4 p-3 rounded-lg text-center ${
                message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {message.text}
              </div>
            )}
  
  <form onSubmit={handleSubmit} className="space-y-4">
  {/* Login Type Toggle */}
  <div className="flex items-center justify-center space-x-4 mb-4">
    <button
      type="button"
      onClick={() => {
        setLoginType("staff");
        setMessage({ text: "", type: "" });
      }}
      className={`px-4 py-2 rounded-lg transition-colors ${
        loginType === "staff" ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Staff
    </button>
    <button
      type="button"
      onClick={() => {
        setLoginType("parent");
        setMessage({ text: "", type: "" });
      }}
      className={`px-4 py-2 rounded-lg transition-colors ${
        loginType === "parent" ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Parent/Student
    </button>
  </div>

  {loginType === "staff" ? (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit phone number"
          pattern="\d{10}"
          required={loginType === "staff"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required={loginType === "staff"}
          minLength="6"
        />
      </div>

      {!isLogin && loginType === "staff" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
            minLength="6"
          />
        </div>
      )}
    </>
  ) : (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Registration Number
        </label>
        <input
          type="text"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          value={regNumber}
          onChange={(e) => setRegNumber(e.target.value)}
          placeholder="6-digit registration number"
          pattern="\d{6}"
          required={loginType === "parent"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Student's Date of Birth (MM-DD-YYYY)
        </label>
        <input
          type="text"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          placeholder="MM-DD-YYYY"
          pattern="\d{2}-\d{2}-\d{4}"
          required={loginType === "parent"}
        />
      </div>
      <div className="flex items-center">
      <input
        type="checkbox"
        id="rememberMe"
        checked={rememberMe}
        onChange={(e) => setRememberMe(e.target.checked)}
        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
        required
      />
      <label htmlFor="rememberMe" className="ml-2 block text-sm font-semibold text-orange-500 underline">
        Remember Me (uses cookies)
      </label>
    </div>
    </>
  )}

  <button
    type="submit"
    className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md transition-colors duration-300"
  >
    {loginType === "staff" ? (isLogin ? "Login" : "Register") : "Login"}
  </button>

  {loginType === "staff" && (
    <button
      type="button"
      onClick={() => {
        setIsLogin(!isLogin);
        setMessage({ text: "", type: "" });
      }}
      className="w-full text-center text-orange-500 hover:text-orange-700 font-medium text-sm mt-2"
    >
      {isLogin ? "Need an account? Register" : "Already have an account? Login"}
    </button>
  )}
</form>
          </div>
        </div>
      </div>
  </div>
);
}

export default Login;