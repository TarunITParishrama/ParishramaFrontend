import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/LoginPage';
import HomePage from './pages/HomePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import SuperAdminDashboard from './pages/super_admin/SuperAdminDashboard';
import CampusDashboard from './pages/campus/CampusDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import Staffs from './pages/tab_pages/Staffs';
import Students from './pages/tab_pages/Students';
import Classes from './pages/tab_pages/Classes';
import Batches from './pages/tab_pages/Batches';
import Tests from './pages/tab_pages/Tests';
import ReportsByMonth from './pages/reports_related/ReportsByMonth';
import Questions from './pages/tab_pages/Questions';
import Marks from './pages/tab_pages/Marks';
import Reports from './pages/tab_pages/Reports';
import Attendance from './pages/tab_pages/Attendance';
import SMS from './pages/tab_pages/SMS';
import Noticeboard from './pages/tab_pages/Noticeboard';
import Hospital from './pages/tab_pages/Hospital';
import Hostel from './pages/tab_pages/Hostel';
import GatePass from './pages/tab_pages/GatePass';
import Admission from './pages/tab_pages/Admission';
import Feedback from './pages/tab_pages/Feedback';
import Leaderboard from './pages/tab_pages/Leaderboard';
import Settings from './pages/tab_pages/Settings';
import StudentData from './pages/stud/StudentData';
import StudentReport from './pages/stud/StudentReport';

function App() {
  return (
    <div className='h-screen'>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/super_admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/campus/dashboard" element={<CampusDashboard />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staffs" element={<Staffs />} />
        <Route path="/students" element={<Students />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/reportsbymonth" element={<ReportsByMonth />} />
        <Route path="/questions" element={<Questions />} />
        <Route path="/marks" element={<Marks />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/sms" element={<SMS />} />
        <Route path="/noticeboard" element={<Noticeboard />} />
        <Route path="/hospital" element={<Hospital />} />
        <Route path="/hostel" element={<Hostel />} />
        <Route path="/gatepass" element={<GatePass />} />
        <Route path="/admission" element={<Admission />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/student/:rollno" element={<StudentData />}/>
        <Route path="/studentreport/:rollNo" element={<StudentReport />}/>
      </Routes>
    </Router>
    </div>
  );
}

export default App;
