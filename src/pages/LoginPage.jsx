import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../assets/logo_kannada.png";
import slide1 from "../assets/slides/slide1.jpg";
import slide2 from "../assets/slides/slide2.jpg";
import slide3 from "../assets/slides/slide3.jpg";
import slide4 from "../assets/slides/slide1.jpg";
import slide5 from "../assets/slides/slide2.jpg";
import slide6 from "../assets/slides/slide3.jpg";
import slide7 from "../assets/slides/slide1.jpg";
import slide8 from "../assets/slides/slide2.jpg";
import slide9 from "../assets/slides/slide3.jpg";
import slide10 from "../assets/slides/slide1.jpg";

const slides = [slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8, slide9, slide10];

function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slide auto-transition
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      
      {/* Left Section: Slideshow */}
      <div className="w-[60%] relative overflow-hidden p-4 mt-28 ml-10">
  {/* Floating balloons background - now positioned fixed to cover full viewport height */}
  <div className="fixed top-0 left-0 w-[60%] h-screen overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <div 
        key={i}
        className="absolute balloon"
        style={{
          left: `${10 + Math.random() * 80}%`,  // Keep balloons within container
          bottom: '-100px',  // Start below the visible area
          width: `${30 + Math.random() * 30}px`,  // Random size between 30-60px
          height: `${40 + Math.random() * 40}px`,  // Random size between 40-80px
          background: `hsl(${Math.random() * 60 + 20}, 80%, 70%)`,  // Warm colors (20-80° hue)
          borderRadius: '50%',
          animation: `floatUp ${10 + Math.random() * 15}s linear infinite`,
          animationDelay: `${Math.random() * 8}s`,
          opacity: '0.7',
          filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.1))'
        }}
      />
    ))}
  </div>
  
  <img
    src={slides[currentSlide]}
    alt={`Slide ${currentSlide + 1}`}
    className="relative z-10 object-cover w-fit h-fit rounded-xl transition-opacity duration-500 ease-in-out shadow-lg shadow-orange-500"
  />
</div>

      {/* Right Section: Login Box */}
      <div className="w-[40%] flex justify-end items-center pr-28 ">
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