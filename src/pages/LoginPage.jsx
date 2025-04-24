import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo_kannada.png";
import mdlogo from "../assets/MDPhoto.png";
import titlelogo from "../assets/loginpagelogo.png";
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
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [slide1, slide2, slide3, slide4, slide5, slide6];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      // Login logic
      try {
        const response = await axios.post(`${process.env.REACT_APP_URL}/api/user/login`, {
          phonenumber: phone,
          password
        });

        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userRole", response.data.data.user.role);
        
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
  };

  return (
    <div className="h-screen flex bg-gradient-br from-red-600 via-orange-500 to-yellow-400">
      {/* Left Section */}
      <div className="w-[60%] relative p-4 pl-10">
        {/* Title logo at top left corner */}
        <img 
          src={titlelogo} 
          alt="title logo" 
          className="absolute top-4 left-4 h-20 w-80" 
        />

      <div className="flex items-center h-full mt-2">
  {/* MD Logo */}
  <div className="h-[450px] flex items-center mr-12">
    <img 
      src={mdlogo} 
      alt="md logo" 
      className="h-full w-auto object-contain" 
    />
  </div>

  {/* Improved Slideshow section */}
  <div className="flex-1 h-[450px] relative ml-6">
  <div className="relative h-full w-full overflow-hidden rounded-lg shadow-xl bg-gradient-br from-red-600 via-orange-500 to-yellow-400">
  {/* Left Vertical Text */}
  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
    <div className="flex flex-col items-center">
      {'TOPPERS'.split('').map((letter, i) => (
        <span 
          key={`left-${i}`}
          className="text-2xl font-bold text-red-600 font-serif"
        >
          {letter}
        </span>
      ))}
    </div>
  </div>

  {/* Right Vertical Text */}
  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
    <div className="flex flex-col items-center">
      {'TOPPERS'.split('').map((letter, i) => (
        <span 
          key={`right-${i}`}
          className="text-2xl font-bold text-yellow-400 font-serif"
        >
          {letter}
        </span>
      ))}
    </div>
  </div>

  {/* Slides */}
  {slides.map((slide, index) => (
    <div 
      key={index}
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
    >
      <img
        src={slide}
        alt={`Slide ${index + 1}`}
        className="max-h-full max-w-full object-contain p-2"
      />
    </div>
  ))}
</div>

    {/* Slide indicators */}
    <div className="absolute -bottom-1 left-0 right-0 flex justify-center space-x-2">
      {slides.map((_, index) => (
        <button
          key={index}
          onClick={() => setCurrentSlide(index)}
          className={`h-3 w-3 rounded-full transition-all ${index === currentSlide ? 'bg-orange-300 w-2' : 'bg-white bg-opacity-50'}`}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  </div>
</div>
      </div>

      {/* Right Section */}
      <div className="w-[40%] relative flex justify-end items-center pr-28">
        {/* Overlapping images in top-right corner */}
        <div className="absolute top-4 right-4 flex items-center">
          <div className="relative mr-4" style={{ width: '120px', height: '80px' }}>
            <img src={creativity} alt="Creativity" className="h-14 w-14 absolute top-0 left-0 z-10 transform hover:scale-110 transition-transform" />
            <img src={honesty} alt="Honesty" className="h-14 w-14 absolute top-1 left-8 z-20 transform hover:scale-110 transition-transform" />
            <img src={trust} alt="Trust" className="h-14 w-14 absolute top-1 left-16 z-30 transform hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col space-y-1">
            <span className="font-bold text-black">Creativity</span>
            <span className="font-bold text-red-400">Honesty</span>
            <span className="font-bold text-yellow-400">Trust</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-white p-8 rounded-lg shadow-lg shadow-gray-700 w-80 text-gray-900">
          <img src={logo} alt="Parishrama Neet Academy Logo" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-center">
            {isLogin ? "Login" : "Register"}
          </h2>

          {message.text && (
            <div className={`text-center p-2 mb-4 rounded ${
              message.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-1">Phone Number</label>
              <input
                type="tel"
                className="w-full p-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                pattern="\d{10}"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block mb-1">Password</label>
              <input
                type="password"
                className="w-full p-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength="6"
              />
            </div>

            {!isLogin && (
              <div className="mb-4">
                <label className="block mb-1">Confirm Password</label>
                <input
                  type="password"
                  className="w-full p-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  required
                  minLength="6"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 p-2 rounded shadow-gray-700 shadow-md font-bold text-white mb-4"
            >
              {isLogin ? "Login" : "Register"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage({ text: "", type: "" });
              }}
              className="w-full text-orange-500 hover:text-orange-700 p-2 rounded font-bold"
            >
              {isLogin ? "Need an account? Register" : "Already have an account? Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;