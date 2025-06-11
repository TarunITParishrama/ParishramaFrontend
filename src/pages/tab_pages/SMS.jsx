//import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import onit from '../../assets/imonit.gif';

export default function SMS() {
  const navigate = useNavigate();
  //const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">SMS Notification</h1>
      </div>
      <img src={onit} alt="" className="w-auto h-auto"></img>

      {/* SMS Form 
      <div className="max-w-2xl bg-white shadow-md rounded-lg mx-auto mt-6 p-6">
        <h2 className="text-lg font-semibold">📩 Send an SMS</h2>
        <textarea
          className="w-full border p-3 mt-2 rounded-md"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="mt-4 bg-red-600 text-white py-2 px-6 rounded-lg w-full hover:bg-red-700 transition">
          Send SMS
        </button>
      </div>
      */}
    </div>
  );
}
