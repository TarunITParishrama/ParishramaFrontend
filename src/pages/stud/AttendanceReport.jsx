import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const localizer = momentLocalizer(moment);

export default function AttendanceReport() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const regNumber = localStorage.getItem('regNumber');

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("You are not logged in");
          navigate("/");
          return;
        }

        setLoading(true);
        console.log("Fetching attendance for:", regNumber); // Debug log
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/getattendance/${regNumber}`,
          { 
            headers: { 
              Authorization: `Bearer ${token}` 
            } 
          }
        );
        
        console.log("API Response:", response.data); // Debug log
        
        const formattedData = response.data.data.map(item => ({
          ...item,
          date: new Date(item.date),
          status: item.present ? 'Present' : item.absent ? 'Absent' : item.forgiven ? 'Permitted' : 'Unknown'
        }));
        
        setAttendanceData(formattedData);
        filterDataByDate(selectedDate, formattedData);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("userRole");
          navigate("/");
        } else {
          toast.error("Failed to fetch attendance data");
        }
      } finally {
        setLoading(false);
      }
    };

    if (regNumber) {
      fetchAttendance();
    } else {
      console.error("No regNumber found in localStorage"); // Debug log
      toast.error("Student information not found");
      setLoading(false);
    }
  }, [regNumber, navigate]);

  const filterDataByDate = (date, data = attendanceData) => {
    const filtered = data.filter(item => 
      moment(item.date).isSame(date, 'day'))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setFilteredData(filtered);
    setSelectedDate(date);
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#e0e0e0';
    if (event.present) {
      backgroundColor = '#4CAF50';
    } else if (event.absent) {
      backgroundColor = '#F44336';
    } else if (event.forgiven) {
      backgroundColor = '#FFC107';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const handleNavigate = (date) => {
    filterDataByDate(date);
  };

  const handleSelectEvent = (event) => {
    filterDataByDate(event.date);
  };

  // Custom date cell wrapper
  const dateCellWrapper = ({ children, value }) => {
    const isSelected = moment(value).isSame(selectedDate, 'day');
    const hasAttendance = attendanceData.some(item => 
      moment(item.date).isSame(value, 'day'));
    const isToday = moment(value).isSame(new Date(), 'day');
    const isPast = moment(value).isBefore(new Date(), 'day');

    let backgroundColor = 'white';
    if (isSelected) {
      backgroundColor = '#2563eb'; // blue-600
    } else if (isToday) {
      backgroundColor = '#dbeafe'; // blue-100
    } else if (hasAttendance) {
      backgroundColor = isPast ? '#dcfce7' : '#bbf7d0'; // green-100/green-200 for past with attendance
    } else if (isPast) {
      backgroundColor = '#f3f4f6'; // gray-100
    }

    return (
      <div 
        style={{ 
          backgroundColor,
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: isSelected ? '2px solid #1d4ed8' : '1px solid #e5e7eb',
          borderRadius: '4px',
        }}
        onClick={() => filterDataByDate(value)}
      >
        {children}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Attendance Report</h2>
      
      <div className="mb-8">
        <Calendar
          localizer={localizer}
          events={attendanceData}
          startAccessor="date"
          endAccessor="date"
          defaultView="month"
          views={['month']}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={(slotInfo) => filterDataByDate(slotInfo.start)}
          selectable
          eventPropGetter={eventStyleGetter}
          style={{ 
            height: 500,
            backgroundColor: '#f9fafb', // gray-50 background
            borderRadius: '0.5rem',
            padding: '0.5rem',
          }}
          selected={selectedDate}
          date={selectedDate}
          components={{
            dateCellWrapper: dateCellWrapper
          }}
          dayPropGetter={(date) => {
            const isSelected = moment(date).isSame(selectedDate, 'day');
            return {
              style: {
                fontWeight: isSelected ? 'bold' : 'normal',
              },
            };
          }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              Attendance for {moment(selectedDate).format('MMMM Do, YYYY')}
            </h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => filterDataByDate(moment(selectedDate).subtract(1, 'day').toDate())}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Previous Day
              </button>
              <button 
                onClick={() => filterDataByDate(new Date())}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Today
              </button>
              <button 
                onClick={() => filterDataByDate(moment(selectedDate).add(1, 'day').toDate())}
                className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Next Day
              </button>
            </div>
          </div>
          
          {filteredData.length > 0 ? (
            <div className="space-y-4">
              {filteredData.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-lg">{item.subject?.subjectName || 'Unknown Subject'}</h4>
                      <p className="text-gray-600">{item.period}</p>
                    </div>
                    <span 
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.present ? 'bg-green-100 text-green-800' :
                        item.absent ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.forgiven && (
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Note:</span> This absence has been Permitted
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No attendance records found for this date</p>
            </div>
          )}

          {/* Monthly Summary */}
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Monthly Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Total Present</p>
                <p className="text-2xl font-bold text-green-800">
                  {attendanceData.filter(a => a.present && moment(a.date).isSame(selectedDate, 'month')).length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">Total Absent</p>
                <p className="text-2xl font-bold text-red-800">
                  {attendanceData.filter(a => a.absent && moment(a.date).isSame(selectedDate, 'month')).length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-600">Total Permitted</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {attendanceData.filter(a => a.forgiven && moment(a.date).isSame(selectedDate, 'month')).length}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}