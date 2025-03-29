import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Classes() {
  const navigate = useNavigate();

  // State to track active tab
  const [activeTab, setActiveTab] = useState("all");

  // State to store the class list
  const [classes, setClasses] = useState([
    {
      id: 1,
      title: "10th - PCB - Chikkaballapura English Medium",
      campus: "Chikkaballapura English Medium",
      teacher: "Hanumantharao Y",
      students: 31,
    },
    {
      id: 2,
      title: "10th - PCMB - Chikkaballapur Boys Campus",
      campus: "Chikkaballapur Boys Campus",
      teacher: "Hanumantharao Y",
      students: 15,
    },
    {
      id: 3,
      title: "10th - PCMB - Chikkaballapur Girls Campus",
      campus: "Chikkaballapur Girls Campus",
      teacher: "Hanumantharao Y",
      students: 17,
    },
  ]);

  // State to store new class form data
  const [newClass, setNewClass] = useState({
    title: "",
    campus: "",
    teacher: "",
    students: "",
  });

  // Handle form input change
  const handleInputChange = (e) => {
    setNewClass({ ...newClass, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!newClass.title || !newClass.campus || !newClass.teacher || !newClass.students) {
      alert("Please fill all fields.");
      return;
    }

    // Add the new class to the list
    setClasses([
      ...classes,
      {
        id: classes.length + 1,
        title: newClass.title,
        campus: newClass.campus,
        teacher: newClass.teacher,
        students: parseInt(newClass.students),
      },
    ]);

    // Reset the form
    setNewClass({ title: "", campus: "", teacher: "", students: "" });

    // Switch to "All Classes" tab
    setActiveTab("all");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Section with Gradient */}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button
          onClick={() => navigate(-1)}
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Classes</h1>

        {/* Tab Navigation */}
        <div className="mt-4 flex space-x-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-1 ${activeTab === "all" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            All Classes
          </button>
          <button
            onClick={() => setActiveTab("new")}
            className={`pb-1 ${activeTab === "new" ? "border-b-2 border-white" : "text-gray-200 hover:text-white"}`}
          >
            New Class
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {activeTab === "all" ? (
          <>
            {/* Class List Section */}
            <h2 className="text-xl font-semibold text-gray-700">10th - Standard</h2>
            <p className="text-gray-500 mb-4">📚 {classes.length} Classes · 👥 {classes.reduce((sum, c) => sum + c.students, 0)} Students</p>

            <div className="space-y-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="bg-white shadow-md rounded-lg p-4 flex flex-col"
                >
                  <h3 className="text-lg font-semibold">{classItem.title}</h3>
                  <p className="text-gray-600">{classItem.campus}</p>
                  <div className="flex items-center mt-2">
                    <img
                      src="https://via.placeholder.com/40"
                      alt="Teacher"
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <p className="font-medium">{classItem.teacher}</p>
                      <p className="text-gray-500 text-sm">Total students: {classItem.students}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* New Class Form */}
            <h2 className="text-xl font-semibold text-gray-700">Add a New Class</h2>
            <form onSubmit={handleFormSubmit} className="bg-white p-6 rounded-lg shadow-md mt-4 space-y-4">
              <div>
                <label className="block text-gray-700">Class Title</label>
                <input
                  type="text"
                  name="title"
                  value={newClass.title}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  placeholder="e.g. 10th - PCB - Chikkaballapura English Medium"
                />
              </div>
              <div>
                <label className="block text-gray-700">Campus</label>
                <input
                  type="text"
                  name="campus"
                  value={newClass.campus}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  placeholder="e.g. Chikkaballapura English Medium"
                />
              </div>
              <div>
                <label className="block text-gray-700">Teacher</label>
                <input
                  type="text"
                  name="teacher"
                  value={newClass.teacher}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  placeholder="e.g. Hanumantharao Y"
                />
              </div>
              <div>
                <label className="block text-gray-700">Total Students</label>
                <input
                  type="number"
                  name="students"
                  value={newClass.students}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  placeholder="e.g. 31"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Add Class
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
