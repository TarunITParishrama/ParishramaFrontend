import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReportCard from './ReportCard';

const ReportCardPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { studentData } = location.state || {};

  useEffect(() => {
    if (!studentData) {
      navigate('/');
      return;
    }

    ReportCard.generatePDF(studentData);
    navigate(-1); // Go back after generating PDF
  }, [studentData, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Generating PDF report...</p>
    </div>
  );
};

export default ReportCardPage;