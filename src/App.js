import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react"
import Login from "./pages/LoginPage";
import ParishramaHomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import Staffs from "./pages/tab_pages/Staffs";
import Students from "./pages/tab_pages/Students";
import Batches from "./pages/tab_pages/Batches";
import Tests from "./pages/tab_pages/Tests";
import ReportsByMonth from "./pages/reports_related/ReportsByMonth";
import Questions from "./pages/tab_pages/Questions";
import Marks from "./pages/tab_pages/Marks";
import Reports from "./pages/tab_pages/Reports";
import Attendance from "./pages/tab_pages/Attendance";
import SMS from "./pages/tab_pages/SMS";
import Noticeboard from "./pages/tab_pages/Noticeboard";
import Hospital from "./pages/tab_pages/Hospital";
import Hostel from "./pages/tab_pages/Hostel";
import GatePass from "./pages/tab_pages/GatePass";
import Admission from "./pages/tab_pages/Admission";
import Feedback from "./pages/tab_pages/Feedback";
import Leaderboard from "./pages/tab_pages/Leaderboard";
import Settings from "./pages/admin/Settings.jsx";
import StudentData from "./pages/stud/StudentData";
import StudentReport from "./pages/stud/StudentReport";
import SingleReport from "./pages/stud/SingleReport.jsx";
import StudentProfile from "./pages/stud/StudentProfile.jsx";
import { ToastContainer } from "react-toastify";
import GoToTop from "./utils/GoToTop.jsx";
import ScrollDown from "./utils/ScrollDown.jsx";
import DownloadReports from "./pages/stud/DownloadReports.jsx";
import CreateProfile from "./pages/admin/CreateProfile.jsx";
import ViewProfile from "./pages/tab_pages/ViewProfile.jsx";
import ParentsFeedback from "./pages/parents/ParentFeedback.jsx";

function App() {

  function FloatingControlsGuard() {
  const { pathname } = useLocation();
  const show = pathname.startsWith("/home"); // only inside homepage
  if (!show) return null;
  return (
    <>
      <GoToTop />
      <ScrollDown />
    </>
  );
}
  return (
    <div className="h-screen">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <ParishramaHomePage />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="staffs" element={<Staffs />} />
            <Route
              path="studentprofile/:regNumber"
              element={<StudentProfile />}
            />
            <Route path="viewprofile" element={<ViewProfile />} />
            <Route path="createprofile" element={<CreateProfile />} />
            <Route path="singlereport" element={<SingleReport />} />
            <Route path="singlereport/:regNumber" element={<SingleReport />} />
            <Route path="downloadreports" element={<DownloadReports />} />
            <Route path="students/:regNumber" element={<Students />} />
            <Route path="batches" element={<Batches />} />
            <Route path="tests" element={<Tests />} />
            <Route path="reportsbymonth" element={<ReportsByMonth />} />
            <Route path="questions" element={<Questions />} />
            <Route path="marks" element={<Marks />} />
            <Route path="reports" element={<Reports />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="sms" element={<SMS />} />
            <Route path="noticeboard" element={<Noticeboard />} />
            <Route path="hospital" element={<Hospital />} />
            <Route path="hostel" element={<Hostel />} />
            <Route path="gatepass" element={<GatePass />} />
            <Route path="admission" element={<Admission />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="student/:rollno" element={<StudentData />} />
            <Route path="studentreport/:rollNo" element={<StudentReport />} />
            <Route path="parents-feedback" element={<ParentsFeedback />} />
          </Route>
        </Routes>
        <FloatingControlsGuard />
      </Router>
      <SpeedInsights />
    </div>
  );
  function PrivateRoute({ children }) {
    const token = localStorage.getItem("token");
    return token ? children : <Navigate to="/login" />;
  }
}

export default App;
