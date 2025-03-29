import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import studData from "../../assets/data/studentsdetails.xlsx";
import AllReports from "../stud/AllReports"; 

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("students"); // 'students' or 'reports'

  useEffect(() => {
    const fetchExcelData = async () => {
      try {
        const response = await fetch(studData);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        const firstRow = range.s.r;

        // Extract headers from the first two rows
        let headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress1 = XLSX.utils.encode_cell({ r: firstRow, c: col });
          const cellAddress2 = XLSX.utils.encode_cell({ r: firstRow + 1, c: col });

          let headerValue = sheet[cellAddress1]?.v || "";
          const secondRowValue = sheet[cellAddress2]?.v || "";

          if (!headerValue || headerValue === "N/A") {
            headerValue = secondRowValue;
          }

          headers.push(headerValue || `Column_${col}`);
        }

        console.log("Extracted Headers:", headers);

        // Convert sheet data into JSON format
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: headers });

        // Create student list
        const studentList = jsonData.slice(2).map((row) => {
          return {
            name: row["Name"] || "Unknown",
            regNo: row["RollNo"] || "N/A",
            profilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(row["Name"])}&background=random`          
          };
        });

        setStudents(studentList);
      } catch (error) {
        console.error("Error loading Excel file:", error);
      }
    };

    fetchExcelData();
  }, []);

  // Tab navigation component
  const TabNavigation = () => (
    <div className="flex">
      <button
        className={`py-2 px-4 text-md focus:outline-none ${
          activeTab === "students"
            ? "text-white border-b-2 border-white font-medium"
            : "text-white hover:text-white"
        }`}
        onClick={() => setActiveTab("students")}
      >
        Students
      </button>
      <button
        className={`py-2 px-4 text-md focus:outline-none ${
          activeTab === "reports"
            ? "text-white border-b-2 border-white font-medium"
            : "text-white hover:text-white"
        }`}
        onClick={() => setActiveTab("reports")}
      >
        Students Report
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold">
          {activeTab === "students" ? "Students" : "Students Report"}
        </h1>
        <TabNavigation />
      </div>

      <div className="max-w-4xl mx-auto mt-6 bg-white rounded-lg shadow-md overflow-hidden">
       
        
        <div className="p-6">
          {activeTab === "students" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student, index) => (
                <div
                  key={index}
                  className="bg-white shadow-md rounded-lg flex items-center p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/student/${student.regNo}`)}
                >
                  <img
                    src={student.profilePic}
                    alt="Profile"
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h2 className="text-lg font-semibold">{student.name}</h2>
                    <p className="text-gray-600">Roll Number: {student.regNo}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AllReports /> // Render the AllReports component when reports tab is active
          )}
        </div>
      </div>
    </div>
  );
}