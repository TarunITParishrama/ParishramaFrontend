import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import titlelogo from "../assets/loginpagelogo.jpg";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Login() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Determine login type based on input patterns
    const isPotentialParentLogin =
      /^\d{6}$/.test(username) &&
      (/^\d{2}-\d{2}-\d{4}$/.test(password) ||
        /^\d{2}\/\d{2}\/\d{4}$/.test(password));

    if (!isLogin) {
      // Signup logic (only for staff)
      if (password !== confirmPassword) {
        setMessage({ text: "Passwords don't match", type: "error" });
        return;
      }

      if (!/^\d{10}$/.test(username)) {
        setMessage({
          text: "Please enter a valid 10-digit phone number for staff registration",
          type: "error",
        });
        return;
      }

      try {
        await axios.post(`${process.env.REACT_APP_URL}/api/user/signup`, {
          phonenumber: username,
          password,
          role: "staff", // Default role for new signups
        });

        setMessage({
          text: "Registration successful! Contact admin for approval.",
          type: "success",
        });
        setIsLogin(true); // Switch back to login after successful registration
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Registration failed";
        setMessage({ text: errorMessage, type: "error" });
      }
      return;
    }

    // Login logic
    if (isPotentialParentLogin) {
      // Try parent login first
      try {
        const formattedDob = password.includes("-")
          ? password
          : password.replace(/\//g, "-");
        const response = await axios.post(
          `${process.env.REACT_APP_URL}/api/parent/login`,
          {
            regNumber: username,
            dob: formattedDob,
          }
        );

        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userRole", "parent");
        localStorage.setItem("loginType", "parent");
        localStorage.setItem("regNumber", response.data.data.student.regNumber);
        localStorage.setItem(
          "studentData",
          JSON.stringify({
            ...response.data.data,
            regNumber: response.data.data.student.regNumber,
          })
        );

        if (rememberMe) {
          localStorage.setItem("rememberedRegNumber", username);
        } else {
          localStorage.removeItem("rememberedRegNumber");
        }

        setMessage({ text: "Login Successful!", type: "success" });
        setTimeout(() => navigate("/home"), 1500);
        return;
      } catch (parentError) {
        // If parent login fails, try staff login if username is 10 digits
        if (username.length === 10) {
          tryStaffLogin();
        } else {
          const errorMessage =
            parentError.response?.data?.message || "Invalid credentials";
          setMessage({ text: errorMessage, type: "error" });
        }
      }
    } else {
      // Try staff login
      tryStaffLogin();
    }
  };

  const tryStaffLogin = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/user/login`,
        {
          phonenumber: username,
          password,
        }
      );

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userRole", response.data.data.user.role);
      localStorage.setItem("loginType", "staff");

      setMessage({ text: "Login Successful!", type: "success" });
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Login failed(Server Error)";
      setMessage({ text: errorMessage, type: "error" });
    }
  };

  useEffect(() => {
    const rememberedRegNumber = localStorage.getItem("rememberedRegNumber");
    if (rememberedRegNumber) {
      setUsername(rememberedRegNumber);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 md:p-8">
        <div className="flex flex-col items-center mb-6">
          <img
            src={titlelogo}
            alt="Logo"
            className="h-16 md:h-20 w-auto mb-4"
          />
        </div>

        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg text-center ${
              message.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the Password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                required
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 block text-sm font-semibold text-orange-500 underline"
              >
                Remember Me (uses cookies)
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md transition-colors duration-300"
          >
            {isLogin ? "Login" : "Register"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage({ text: "", type: "" });
            }}
            className="w-full text-center text-orange-500 hover:text-orange-700 font-medium text-sm mt-2"
          >
            {isLogin
              ? "Need an account? Register"
              : "Already have an account? Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
