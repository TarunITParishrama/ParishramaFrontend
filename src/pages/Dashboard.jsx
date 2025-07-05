import React from "react";
import { useNavigate } from "react-router-dom";
import batchesIcon from "../assets/batches.png";
import admissionicon from "../assets/admission.png";
import feedbackicon from "../assets/feedback.png";
import attendanceicon from "../assets/attendance.png";
import gatepassicon from "../assets/gatepass.png";
import hospitalIcon from "../assets/hospital.png";
import hostelIcon from "../assets/hostel.png";
import leaderboardIcon from "../assets/leaderboard.png";
import noticeboardIcon from "../assets/noticeboard.gif";
import reportIcon from "../assets/reports.png";
import testsIcon from "../assets/tests.png";
import settingsIcon from "../assets/settings.png";
import smsIcon from "../assets/sms.png";
import staffIcon from "../assets/staff.png";
import studentIcon from "../assets/students.png";
import powerIcon from "../assets/power.png";

const getDashboardItems = (role) => {
  const commonItems = [
    {
      name: "E-Pass",
      icon: <img src={gatepassicon} alt="" className="w-10 h-12 inline" />,
      path: "gatepass",
      show: true,
    },
    {
      name: "Attendance",
      icon: <img src={attendanceicon} alt="" className="w-12 h-10 inline" />,
      path: "attendance",
      show: true,
    },
  ];

  const adminItems = [
    {
      name: "Student Profile",
      icon: <img src={studentIcon} alt="" className="w-10 h-12 inline" />,
      path: "studentprofile",
      show: ["parent"].includes(role),
    },
    {
      name: "Progress Report",
      icon: <img src={reportIcon} alt="" className="w-10 h-12 inline" />,
      path: "singlereport",
      show: ["parent"].includes(role),
    },
    {
      name: "Create Profile",
      icon: "😊",
      path: "createprofile",
      show: ["admin"].includes(role),
    },
    {
      name: "Students",
      icon: <img src={studentIcon} alt="" className="w-10 h-12 inline" />,
      path: "students",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Questions",
      icon: "🔢",
      path: "questions",
      show: ["super_admin", "admin", "staff"].includes(role),
    },
    {
      name: "Feedback",
      icon: <img src={feedbackicon} alt="" className="w-12 h-10 inline" />,
      path: "feedback",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Leaderboard",
      icon: <img src={leaderboardIcon} alt="" className="w-10 h-12 inline" />,
      path: "leaderboard",
      show: ["super_admin", "admin", "staff"].includes(role),
    },
    {
      name: "Noticeboard",
      icon: <img src={noticeboardIcon} alt="" className="w-10 h-12 inline" />,
      path: "noticeboard",
      show: ["super_admin", "admin", "parent"].includes(role),
    },
    {
      name: "Campus",
      icon: <img src={batchesIcon} alt="" className="w-10 h-10 inline" />,
      path: "batches",
      show: ["super_admin", "admin", "IT"].includes(role),
    },
    {
      name: "Tests",
      icon: <img src={testsIcon} alt="" className="w-12 h-12 inline" />,
      path: "tests",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Reports",
      icon: <img src={reportIcon} alt="" className="w-12 h-10 inline" />,
      path: "reports",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "SMS",
      icon: <img src={smsIcon} alt="" className="w-12 h-10 inline" />,
      path: "sms",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Hospital",
      icon: <img src={hospitalIcon} alt="" className="w-12 h-10 inline" />,
      path: "hospital",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Hostel",
      icon: <img src={hostelIcon} alt="" className="w-12 h-10 inline" />,
      path: "hostel",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Solutions",
      icon: "🔠",
      path: "marks",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Admission",
      icon: <img src={admissionicon} alt="" className="w-12 h-10 inline" />,
      path: "admission",
      show: ["super_admin", "admin"].includes(role),
    },
    {
      name: "Settings",
      icon: <img src={settingsIcon} alt="" className="w-12 h-12 inline" />,
      path: "settings",
      show: ["super_admin"].includes(role),
    },
    {
      name: "Staffs",
      icon: <img src={staffIcon} alt="" className="w-10 h-12 inline" />,
      path: "staffs",
      show: ["super_admin", "admin"].includes(role),
    },
  ];

  // Add Logout item only for parent role
  const logoutItem =
    role === "parent"
      ? [
          {
            name: "Logout",
            icon: <img src={powerIcon} alt="" className="w-12 h-12 inline" />,
            path: "logout",
            show: true,
            isLogout: true,
          },
        ]
      : [];

  return [...commonItems, ...adminItems, ...logoutItem]
    .filter((item) => item.show === true || item.show)
    .sort((a, b) => {
      // Always put logout at the end
      if (a.isLogout) return 1;
      if (b.isLogout) return -1;
      return a.name.localeCompare(b.name);
    });
};

export default function Dashboard({ userRole }) {
  const navigate = useNavigate();
  const items = getDashboardItems(userRole);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("loginType");
    localStorage.removeItem("rememberRegNumber");
    localStorage.removeItem("studentData");
    navigate("/");
  };

  return (
    <div className="p-6 rounded-lg">
      <h1 className="text-2xl font-bold text-white mb-6">
        {userRole
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")}{" "}
        Dashboard
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.name}
            onClick={() => {
              if (item.isLogout) {
                handleLogout();
                return;
              }
              if (item.path === "studentprofile" && userRole === "parent") {
                const studentData = JSON.parse(
                  localStorage.getItem("studentData")
                );
                if (studentData?.regNumber) {
                  navigate(`studentprofile/${studentData.regNumber}`);
                  return;
                }
              }
              if (item.path === "singlereport" && userRole === "parent") {
                navigate("singlereport");
                return;
              }
              navigate(item.path);
            }}
            className={`bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-transform transform hover:-translate-y-1 ${
              item.isLogout ? "hover:bg-red-50" : ""
            }`}
          >
            <span className="text-4xl">{item.icon}</span>
            <p
              className={`text-lg font-medium mt-2 ${
                item.isLogout ? "text-red-600" : "text-gray-700"
              }`}
            >
              {item.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
