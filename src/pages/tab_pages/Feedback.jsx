import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, Tab, Box } from "@mui/material";
import FeedbackForm from "../../Forms/FeedbackForm";
import FeedbackAdmin from "../Feedback/FeedbackAdmin";
import FeedbackData from "../Feedback/FeedbackData";

export default function Feedback() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <FeedbackForm />;
      case 1:
        return <FeedbackAdmin />;
      case 2:
        return <FeedbackData />;
      default:
        return <FeedbackForm />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 text-white py-6 px-8 flex flex-col">
        <button 
          onClick={() => navigate('/home')} 
          className="text-white text-sm flex items-center mb-2"
        >
          ◀ Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Feedback Management</h1>
      </div>

      <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          centered
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#f97316', // orange-500
            },
            '& .Mui-selected': {
              color: '#f97316 !important', // orange-500
            }
          }}
        >
          <Tab 
            label="Feedback Form" 
            sx={{
              fontWeight: 'bold',
              '&:hover': {
                color: '#ea580c', // orange-600
              }
            }}
          />
          <Tab 
            label="Feedback" 
            sx={{
              fontWeight: 'bold',
              '&:hover': {
                color: '#ea580c', // orange-600
              }
            }}
          />
          <Tab 
            label="Feedback Data" 
            sx={{
              fontWeight: 'bold',
              '&:hover': {
                color: '#ea580c', // orange-600
              }
            }}
          />
        </Tabs>
      </Box>

      <div className="container mx-auto px-4 py-6">
        {renderTabContent()}
      </div>
    </div>
  );
}