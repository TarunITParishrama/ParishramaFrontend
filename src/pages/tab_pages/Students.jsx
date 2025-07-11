import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function Students() {
  const { regNumber } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStudent = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_URL}/api/getstudentbyreg/${regNumber}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudent(response.data.data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load student data"
      );
    } finally {
      setLoading(false);
    }
  }, [regNumber]);

  useEffect(() => {
    if (regNumber) {
      fetchStudent();
    }
  }, [regNumber, fetchStudent]);

  if (loading) return <p className="p-4">Loading...</p>;
  if (!student) return <p className="p-4">No student data found.</p>;

  return (
    <div className="p-6 bg-white shadow rounded-lg max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{student.studentName}</h2>
      <img
        src={
          student.studentImageURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            student.studentName
          )}&background=random`
        }
        alt=""
        className="h-24 w-24 rounded-full mb-4"
      />
      <p>
        <strong>Reg Number:</strong> {student.regNumber}
      </p>
      <p>
        <strong>Date of Birth:</strong>{" "}
        {new Date(student.dateOfBirth).toLocaleDateString()}
      </p>
      <p>
        <strong>Campus:</strong> {student.campus?.name}
      </p>
      {/* Add more fields as needed */}
    </div>
  );
}
