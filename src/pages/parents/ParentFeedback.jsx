// src/pages/parents/ParentsFeedback.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ImSpinner2 } from "react-icons/im";

export default function ParentsFeedback() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [mobile, setMobile] = useState("");
  const [campusName, setcampusname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const regNumber = localStorage.getItem("regNumber");
  const token = localStorage.getItem("token");
  const API = process.env.REACT_APP_URL || "";

  useEffect(() => {
    if (!regNumber) {
      console.warn("ParentsFeedback: regNumber missing");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const url = `${API}/api/byreg/${encodeURIComponent(regNumber)}`;
        console.log("Prefill GET:", url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Prefill status:", res.status);
        const json = await res.json();
        if (res.ok && json?.data) {
          const s = json.data;
          setStudentName(s.studentName || "");
          setMobile(s.fatherMobile || s.contact || "");
          setcampusname(s.campusName || "");
        } else {
          console.warn("Prefill failed:", json?.message);
        }
      } catch (e) {
        console.error("Prefill error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [regNumber, token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = `${API}/api/createparentfeedback`;
      console.log("POST:", url);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ regNumber, studentName,campusName, mobile, message }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Feedback sent successfully");
        navigate("/home");
      } else {
        toast.error(json?.message || "Failed to send feedback");
      }
    } catch (err) {
      toast.error("Network error while sending feedback");
    }
  };
  const isValid =
    studentName.trim() &&
    /^\d{10}$/.test(mobile) &&
    message.trim().length >= 200;

  if (loading) {
    return <div className="p-6 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Parents Feedback</h2>
        <button
          onClick={() => navigate("/home")}
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          Back to Dashboard
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white shadow rounded p-4 space-y-4"
      >
        <div>
          <label className="block text-sm mb-1">Student Name</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-50"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Student name"
            required
            disabled
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Mobile Number</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-50"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="10-digit mobile"
            inputMode="numeric"
            pattern="\d{10}"
            required
            disabled
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Campus Name</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-50"
            value={campusName}
            onChange={(e) => setcampusname(e.target.value)}
            placeholder="campus name"
            required
            disabled
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Message (min 200 chars)</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-40"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your feedback…"
            minLength={200}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{message.length} / 200</p>
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className={`px-4 py-2 rounded text-white ${
            !isValid || submitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-orange-600 hover:bg-orange-700"
          }`}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <ImSpinner2 className="animate-spin" />
              Sending…
            </span>
          ) : (
            "Submit"
          )}
        </button>
      </form>
    </div>
  );
}
