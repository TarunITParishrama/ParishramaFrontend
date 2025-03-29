import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Hardcoded login credentials for testing
    const validUsers = ["9353980418", "9880371211", "8970321392", "9087654321"];

    if (validUsers.includes(phone) && password === phone) {
      setMessage({ text: "Login Successful!", type: "success" });

      setTimeout(() => {
        navigate(`/home?phone=${phone}`); // Passing phone number in URL for testing
      }, 1500);
    } else {
      setMessage({ text: "Invalid phone or password!", type: "error" });
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 text-gray-900">
        <img src={logo} alt="Parishrama Neet Academy Logo" className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>

        {message && (
          <div
            className={`text-center p-2 mb-4 rounded ${
              message.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-1">Phone</label>
            <input
              type="tel"
              className="w-full p-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 p-2 rounded font-bold text-white"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
