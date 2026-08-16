import React, { useEffect, useState } from "react";
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

import biologyTestPoster from "../assets/biology-test-poster.png";

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
      icon: (
        <img src={leaderboardIcon} alt="" className="w-10 h-12 inline" />
      ),
      path: "leaderboard",
      show: ["super_admin", "admin", "staff"].includes(role),
    },
    {
      name: "Noticeboard",
      icon: (
        <img
          src={noticeboardIcon}
          alt=""
          className="w-10 h-12 inline rounded-full"
        />
      ),
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
      show: ["super_admin", "admin", "parent"].includes(role),
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
      show: ["super_admin", "admin", "staff"].includes(role),
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
      if (a.isLogout) return 1;
      if (b.isLogout) return -1;
      return a.name.localeCompare(b.name);
    });
};

export default function Dashboard({ userRole }) {
  const navigate = useNavigate();
  const items = getDashboardItems(userRole);

  // -----------------------------------------
  // TEST POSTER STATE
  // -----------------------------------------
  const [showTestPoster, setShowTestPoster] = useState(true);

  // Prevent background scrolling while poster is open
  useEffect(() => {
    if (showTestPoster) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showTestPoster]);

  const handleTestPosterClick = () => {
    window.open(
      "https://parishramaneetacademy.in/online-test/",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("loginType");
    localStorage.removeItem("rememberRegNumber");
    localStorage.removeItem("studentData");
    navigate("/");
  };

  return (
    <>
      {/* =====================================================
          REGULAR DASHBOARD
      ===================================================== */}
      <div className="p-6 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-6">
          {userRole
            .split("_")
            .map(
              (word) => word.charAt(0).toUpperCase() + word.slice(1)
            )
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

                if (
                  item.path === "studentprofile" &&
                  userRole === "parent"
                ) {
                  const studentData = JSON.parse(
                    localStorage.getItem("studentData")
                  );

                  if (studentData?.regNumber) {
                    navigate(`studentprofile/${studentData.regNumber}`);
                    return;
                  }
                }

                if (
                  item.path === "singlereport" &&
                  userRole === "parent"
                ) {
                  navigate("singlereport");
                  return;
                }

                navigate(item.path);
              }}
              className={`bg-white shadow-lg rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-transform transform hover:-translate-y-1
                ${item.isLogout ? "hover:bg-red-50" : ""}
                ${item.name === "Noticeboard" ? "bg-yellow-100" : ""}
              `}
            >
              <span className="text-4xl">{item.icon}</span>

              <p
                className={`text-lg font-medium mt-2 ${
                  item.isLogout
                    ? "text-red-600"
                    : "text-gray-700"
                }`}
              >
                {item.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================
          BIOLOGY TEST POSTER POPUP
      ===================================================== */}
      {showTestPoster && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/60
            backdrop-blur-[2px]
            p-3
            sm:p-5
          "
        >
          {/* Poster Window */}
          <div
            className="
              relative
              flex
              items-center
              justify-center
              max-h-[96vh]
              max-w-[95vw]
              sm:max-w-[500px]
              md:max-w-[560px]
              lg:max-w-[600px]
              animate-test-poster
            "
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowTestPoster(false)}
              aria-label="Close test poster"
              className="
                absolute
                -top-2
                -right-2
                sm:-top-4
                sm:-right-4
                z-20
                w-9
                h-9
                sm:w-11
                sm:h-11
                rounded-full
                bg-white
                text-gray-800
                text-xl
                sm:text-2xl
                font-bold
                shadow-xl
                border
                border-gray-200
                flex
                items-center
                justify-center
                hover:bg-red-500
                hover:text-white
                transition-all
                duration-200
                hover:scale-110
              "
            >
              ×
            </button>

            {/* Clickable Poster */}
            <button
              type="button"
              onClick={handleTestPosterClick}
              aria-label="Open Biology Test"
              className="
                block
                cursor-pointer
                rounded-xl
                overflow-hidden
                shadow-2xl
                focus:outline-none
                focus:ring-4
                focus:ring-yellow-400/70
              "
            >
              <img
                src={biologyTestPoster}
                alt="Parishrama Biology Test"
                className="
                  block
                  w-auto
                  h-auto
                  max-h-[96vh]
                  max-w-[95vw]
                  sm:max-w-[500px]
                  md:max-w-[560px]
                  lg:max-w-[600px]
                  object-contain
                "
              />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          POSTER ANIMATION
      ===================================================== */}
      <style>{`
        @keyframes testPosterSlideIn {
          0% {
            opacity: 0;
            transform: translateX(100vw) scale(0.92);
          }

          70% {
            opacity: 1;
            transform: translateX(-20px) scale(1);
          }

          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .animate-test-poster {
          animation: testPosterSlideIn 0.7s cubic-bezier(0.22, 1, 0.36, 1)
            forwards;
        }

        @media (max-width: 640px) {
          @keyframes testPosterSlideIn {
            0% {
              opacity: 0;
              transform: translateX(100vw) scale(0.9);
            }

            70% {
              opacity: 1;
              transform: translateX(-10px) scale(1);
            }

            100% {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
        }
      `}</style>
    </>
  );
}
