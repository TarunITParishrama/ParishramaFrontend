import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import studData from "../../assets/data/studentsdetails.xlsx";
import boy from '../../assets/boy.png';
import girl from '../../assets/girl.png';

export default function StudentData() {
  const { rollno } = useParams();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("Analytics");


  useEffect(() => {
    const fetchExcelData = async () => {
      try {
        const response = await fetch(studData);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet["!ref"]); 
        const firstRow = range.s.r; // First row index

        let headers = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress1 = XLSX.utils.encode_cell({ r: firstRow, c: col });
          const cellAddress2 = XLSX.utils.encode_cell({ r: firstRow + 1, c: col });

          let headerValue = sheet[cellAddress1]?.v || ""; // First row value
          const secondRowValue = sheet[cellAddress2]?.v || ""; // Second row value

          if (!headerValue || headerValue === "N/A") {
            headerValue = secondRowValue; // Use second row if first is empty
          }

          headers.push(headerValue || `Column_${col}`); // Assign default name if empty
        }

        console.log("Extracted Headers:", headers);

        // Find column indexes for required fields
        const columnIndexes = {
          RollNo: headers.indexOf("RollNo"),
          Combination: headers.indexOf("Combination"),
          Class_Section: headers.indexOf("Class/Section"),
          Day_Hosteler: headers.indexOf("Day/Hosteler"),
          Gender: headers.indexOf("Gender"),
          Caste_Category: headers.indexOf("Cast Category"),
          Mother_Tongue: headers.indexOf("Mother Tongue"),
          Date_of_Birth: headers.indexOf("Date of Birth"),
          Board: headers.indexOf("Board"),
          // Height: headers.indexOf("Height"),
          // Weight: headers.indexOf("Weight"),
          Father_Occupation: headers.indexOf("FOccupation"),
          Mother_Occupation: headers.indexOf("MOccupation"),
          Contact: headers.indexOf("FMobile"),
        };

        console.log("Mapped Column Indexes:", columnIndexes);

        if (columnIndexes.RollNo === -1) {
          console.error("⚠ Roll Number column not found!");
          return;
        }
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: headers });
        const studentData = jsonData.find((row) => row[headers[columnIndexes.RollNo]]?.toString() === rollno);

        if (!studentData) {
          console.error(`⚠ No student found with RollNo: ${rollno}`);
          return;
        }

        console.log("Raw Student Data:", studentData);

        const finalStudentData = {
          name: studentData["Name"] || "Unknown",
          rollNo: studentData[headers[columnIndexes.RollNo]] || "N/A",
          combination: studentData[headers[columnIndexes.Combination]] || "N/A",
          classSection: studentData[headers[columnIndexes.Class_Section]] || "N/A",
          dayHosteler: studentData[headers[columnIndexes.Day_Hosteler]] || "N/A",
          gender: studentData[headers[columnIndexes.Gender]] || "N/A",
          casteCategory: studentData[headers[columnIndexes.Caste_Category]] || "N/A",
          motherTongue: studentData[headers[columnIndexes.Mother_Tongue]] || "N/A",
          dob: studentData[headers[columnIndexes.Date_of_Birth]] || "N/A",
          board: studentData[headers[columnIndexes.Board]] || "N/A",
          // height: studentData[headers[columnIndexes.Height]] || "N/A",
          // weight: studentData[headers[columnIndexes.Weight]] || "N/A",
          fatherOccupation: studentData[headers[columnIndexes.Father_Occupation]] || "N/A",
          motherOccupation: studentData[headers[columnIndexes.Mother_Occupation]] || "N/A",
          contactNo: studentData[headers[columnIndexes.Contact]] || "N/A",
          profilePic: studentData[headers[columnIndexes.Gender]] === "Male" ? boy : girl,

        };

        console.log("Final Extracted Student Data:", finalStudentData);
        setStudentInfo(finalStudentData);
      } catch (error) {
        console.error("Error loading Excel file:", error);
      }
    };

    fetchExcelData();
  }, [rollno]);
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if(tab === "Reports" && studentInfo.rollNo){
      navigate(`/studentreport/${studentInfo.rollNo}`);
    }
  }

  return (

    <div className="min-h-screen bg-gray-100">
      {/* Top Bar Section with Student Details*/}
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 ">
        <button onClick={() => navigate(-1)} className="text-white text-sm flex items-center mb-2">
          ◀ Back to Students
        </button>

      <div className="max-w-4xl mx-auto flex items-start gap-8 text-lg">
        {studentInfo ? (
          
          <div className="flex gap-20 items-start">
          <div className="flex-1">
            <p className="text-3xl mb-6">
              <span className="font-bold">Details of </span>
              {studentInfo.name}:
            </p>
            
            
            <p className="mt-1">
              <span className="font-semibold">Roll Number: </span>
               {studentInfo.rollNo} 
               <span className="font-semibold ml-8">Section: </span>
               {studentInfo.classSection}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Combination: </span>
               {studentInfo.combination} 
               <span className="font-semibold ml-8">Day Scholar/Hosteler: </span>
               {studentInfo.dayHosteler}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Gender: </span>
               {studentInfo.gender}
               <span className="font-semibold ml-8">Date of Birth: </span>
               {studentInfo.dob}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Reservation: </span>
               {studentInfo.casteCategory} 
               <span className="font-semibold ml-8">Mother Tongue: </span>
               {studentInfo.motherTongue}
            </p>            
            <p className="mt-1">
              <span className="font-semibold">SSLC Board: </span>
               {studentInfo.board}
            </p> 
            {/* <p className="mt-1">
              <span className="font-semibold">Height: </span>
               {studentInfo.height}ft
               <span className="font-semibold ml-8">Weight: </span>
               {studentInfo.weight}kg
            </p>  */}
            <p className="mt-1">
              <span className="font-semibold">Father's Occupation: </span>
               {studentInfo.fatherOccupation} 

            </p> 
            <p className="mt-1">
            <span className="font-semibold">Mother's Occupation: </span>
            {studentInfo.motherOccupation}
            </p> 
            <p className="mt-1">
              <span className="font-semibold">Contact: </span>
              {studentInfo.contactNo}
            </p>
            </div>
            <div className="mt-10">
            <img
              src={studentInfo.profilePic}
              alt="Profile"
              className="w-56 h-56 rounded-full border-4 border-white shadow-lg"
            />
              </div>
          </div>          
        ) : (
          <p className="text-gray-500">Loading student data...</p>
        )}
        
      </div>
      </div>
      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto mt-6">
        <div className="flex space-x-8 pb-2 border-b border-gray-300">
          {["Analytics", "Reports"].map((tab) => (
            <button
              key={tab}
              className={`text-lg font-semibold ${
                activeTab === tab ? "border-b-4 border-red-600 pb-1" : "opacity-70"
              }`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Below Top Bar */}
        <div className="mt-4">
          {activeTab === "Analytics" && (
            <p className="text-gray-500">📊 Analytics content coming soon...</p>
          )}
          {activeTab === "Reports" && (
            <p className="text-gray-500">📄 Reports content coming soon...</p>
          )}
        </div>
      </div>
    </div>
  );
}
