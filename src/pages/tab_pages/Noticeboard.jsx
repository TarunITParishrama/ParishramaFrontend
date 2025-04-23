import React from "react";
import { useNavigate } from "react-router-dom";

export default function Noticeboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate('/home')} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Notice Board</h1>
      </div>

      <div className="max-w-2xl bg-white shadow-lg rounded-lg mx-auto mt-6 p-6 relative overflow-hidden">
  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
    <span className="mr-2">📜</span> Latest Notices
  </h2>
  
  {/* Good to go section */}
  <div className="relative mb-6 group">
    <div className="bg-green-600 text-white rounded-lg p-4 pr-12 relative z-10">
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-green-600 to-transparent"></div>
      <h3 className="font-bold text-lg mb-2">✅ Good to go with:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li>Marks Tab</li>
        <li>Reports Tab</li>
        <li>Tests Tab</li>
        <li>Students Tab</li>
      </ul>
    </div>
    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-green-100 to-transparent z-0"></div>
  </div>

  {/* Work in progress section */}
  <div className="relative group">
    <div className="bg-yellow-600 text-white rounded-lg p-4 pl-12 text-right relative z-10">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-yellow-600 to-transparent"></div>
      <h3 className="font-bold text-lg mb-2">🛠️ Work under progress:</h3>
      <ul className="list-disc list-inside space-y-1 inline-block text-left">
        <li>Admission Tab</li>
        <li>Batches Tab</li>
        <li>Classes Tab</li>
        <li>Feedback Tab</li>
        <li>Gatepass Tab</li>
        <li>Hostel</li>
        <li>Hospital Tab</li>
        <li>Leaderboard Tab</li>
        <li>SMS Tab</li>
        <li>Staff Tab</li>
      </ul>
    </div>
    <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-yellow-100 to-transparent z-0"></div>
  </div>

  {/* Footer */}
  <div className="mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
    For any technical glitches/errors kindly contact: 
    <a href="mailto:it35.parishrama@gmail.com" className="text-blue-600 hover:underline ml-1">
      it35.parishrama@gmail.com
    </a>
  </div>
</div>
    </div>
  );
}
