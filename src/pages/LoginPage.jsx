import React, { useState, useEffect, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo_kannada.png";
import titlelogo from "../assets/loginpagelogo.jpg";
import creativity from "../assets/creativity.png";
import honesty from "../assets/honesty.png";
import trust from "../assets/trust.png";

// Import slide images
import slide1 from "../assets/slides/slide1.png";
import slide2 from "../assets/slides/slide2.png";
import slide3 from "../assets/slides/slide3.png";
import slide4 from "../assets/slides/slide4.png";
import slide5 from "../assets/slides/slide5.png";
import slide6 from "../assets/slides/slide6.png";

function Login() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginType, setLoginType] = useState("staff"); // 'staff' or 'parent'
  const [regNumber, setRegNumber] = useState("");
  const [dob, setDob] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState('next');
  const carouselRef = useRef(null);

  useEffect(() => {
    const rememberedRegNumber = localStorage.getItem("rememberedRegNumber");
    if (rememberedRegNumber && loginType === "parent") {
      setRegNumber(rememberedRegNumber);
      setRememberMe(true);
    }
  }, [loginType]);

  const goToSlide = (index, direction) => {
    setTransitionDirection(direction);
    setCurrentSlide(index);
  };

  const goToNext = () => {
    goToSlide((currentSlide + 1) % slides.length, 'next');
  };

  const goToPrev = () => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length, 'prev');
  };

  // Auto-advance slides
  useEffect(() => {
    const interval = setInterval(goToNext, 3000);
    return () => clearInterval(interval);
  }, [currentSlide]);


  const slides = [slide1, slide2, slide3, slide4, slide5, slide6];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

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
      {/* White Top Section */}
      <div className="bg-white w-full py-4 px-9 flex justify-between items-center border-b border-gray-200">
        <img 
          src={titlelogo} 
          alt="title logo" 
          className="h-20 w-full object-contain ml-2" 
        />
        
        {/* Values Icons - Right-aligned */}
        <div className="flex items-center">
          <div className="relative mr-6" style={{ width: '80px', height: '50px' }}>
            <img src={creativity} alt="Creativity" className="h-8 w-8 md:h-10 md:w-10 absolute top-0 left-0 z-10" />
            <img src={honesty} alt="Honesty" className="h-8 w-8 md:h-10 md:w-10 absolute top-1 left-6 md:left-8 z-20" />
            <img src={trust} alt="Trust" className="h-8 w-8 md:h-10 md:w-10 absolute top-1 left-12 md:left-16 z-30" />
          </div>
          <div className="flex flex-col space-y-0 text-xs md:text-sm">
            <span className="font-bold text-black">Creativity</span>
            <span className="font-bold text-red-600">Honesty</span>
            <span className="font-bold text-yellow-400">Trust</span>
          </div>
        </div>
      </div>
  
      {/* Main Content Area */}
    <div className="flex-1 flex flex-col md:flex-row bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400">
      {/* Left Section - Carousel Slideshow (Desktop) */}
      <div className="hidden md:flex md:w-[50%] items-center justify-center p-4 ml-32">
        <div className="relative w-full max-w-lg h-96"> {/* Fixed height container */}
          <div 
            ref={carouselRef}
            className="relative w-full h-full transition-transform duration-700 ease-in-out"
          >
            {slides.map((slide, index) => {
              let position = 'hidden';
              if (index === currentSlide) position = 'current';
              else if (index === (currentSlide + 1) % slides.length) position = 'next';
              else if (index === (currentSlide - 1 + slides.length) % slides.length) position = 'prev';

              return (
                <div
                  key={index}
                  className={`absolute w-full h-full transition-all duration-700 ease-in-out rounded-xl overflow-hidden ${
                    position === 'current' ? 'opacity-100 z-10 translate-x-0 scale-100' :
                    position === 'next' ? 'opacity-80 z-5 translate-x-1/4 scale-90' :
                    position === 'prev' ? 'opacity-80 z-5 -translate-x-1/4 scale-90' :
                    'opacity-0 z-0'
                  }`}
                >
                  <img
                    src={slide}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-contain p-4" 
                  />
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 shadow-md"
          >
            <ChevronLeftIcon className="w-5 h-5 text-orange-600" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 shadow-md"
          >
            <ChevronRightIcon className="w-5 h-5 text-orange-600" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index, index > currentSlide ? 'next' : 'prev')}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  index === currentSlide ? 'bg-orange-300 w-4' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
        {/* Right Section - Login Form */}
        <div className="w-full md:w-[50%] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-xl shadow-2xl w-auto max-w-md p-6 md:p-8 ml-32">
            <div className="flex flex-col items-center mb-6">
              <img 
                src={logo} 
                alt="Logo" 
                className="h-16 md:h-20 w-auto mb-4" 
              />
              <h2 className="text-2xl font-bold text-gray-800">
  {loginType === "staff" 
    ? (isLogin ? "Staff Login" : "Staff Registration") 
    : "Parent/Student Login"}
</h2>
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
          Student's Date of Birth (DD-MM-YYYY)
        </label>
        <input
          type="text"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          placeholder="DD-MM-YYYY"
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
      />
      <label htmlFor="rememberMe" className="ml-2 block text-sm font-semibold text-orange-500 underline">
        Remember my login (uses cookies)
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
  
        {/* Mobile Slideshow */}
      <div className="md:hidden w-full py-4 px-4">
        <div className="relative w-full max-w-md mx-auto h-64 bg-opacity-20 rounded-xl overflow-hidden">
          <div className="relative w-full h-full">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={slide}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-contain p-4" 
                />
              </div>
            ))}
          </div>
          
          {/* Mobile Controls */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            <button
              onClick={goToPrev}
              className="bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-1 shadow-md"
            >
              <ChevronLeftIcon className="w-5 h-5 text-orange-600" />
            </button>
            <button
              onClick={goToNext}
              className="bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-1 shadow-md"
            >
              <ChevronRightIcon className="w-5 h-5 text-orange-600" />
            </button>
          </div>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index, index > currentSlide ? 'next' : 'prev')}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  index === currentSlide ? 'bg-orange-300 w-3' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}

export default Login;