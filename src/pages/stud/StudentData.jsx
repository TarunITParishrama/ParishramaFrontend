import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCallback } from "react";

export default function StudentData() {
  const [students, setStudents] = useState([]);
  const [groupedStudents, setGroupedStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCampuses, setExpandedCampuses] = useState({});
  
  // Search and filter states for each campus
  const [searchQueries, setSearchQueries] = useState({});
  const [sectionFilters, setSectionFilters] = useState({});
  const [sortOrders, setSortOrders] = useState({});
  const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const observer = useRef();


  useEffect(() => {
    fetchStudents(1);
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      groupStudentsByCampus();
      // Expand first campus by default
      const campuses = Object.keys(groupStudentsByCampus());
      if (campuses.length > 0 && Object.keys(expandedCampuses).length === 0) {
        setExpandedCampuses({ [campuses[0]]: true });
      }
    }
  }, [students, searchQueries, sectionFilters, sortOrders]);

  const fetchStudents = async (pageNum = 1) => {
  try {
    if (pageNum === 1) setLoading(true);
    else setIsLoadingMore(true);

    const token = localStorage.getItem("token");
    const response = await axios.get(
      `${process.env.REACT_APP_URL}/api/getstudents?page=${pageNum}&limit=100`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const newData = response.data.data || [];
    setStudents(prev => pageNum === 1 ? newData : [...prev, ...newData]);
    setPage(pageNum);
    setTotalPages(response.data.totalPages);
    toast.dismiss();
  } catch (error) {
    toast.error("Failed to load student data.");
    console.error("Student fetch error:", error);
  } finally {
    if (pageNum === 1) setLoading(false);
    else setIsLoadingMore(false);
  }
};

  const lastCampusRef = useCallback(
  (node) => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && page < totalPages) {
        fetchStudents(page + 1);
      }
    });

    if (node) observer.current.observe(node);
  },
  [isLoadingMore, page, totalPages]
);

  const groupStudentsByCampus = () => {
    const grouped = {};
    const campuses = [...new Set(students.map(student => student.campus?.name || 'Other'))];
    
    campuses.forEach(campus => {
      let campusStudents = students.filter(student => 
        (student.campus?.name || 'Other') === campus
      );
      
      // Apply search filter if exists for this campus
      if (searchQueries[campus]) {
        const query = searchQueries[campus].toLowerCase();
        campusStudents = campusStudents.filter(student => 
          student.regNumber.toLowerCase().includes(query) || 
          student.studentName.toLowerCase().includes(query)
        );
      }
      
      // Apply section filter if exists for this campus
      if (sectionFilters[campus]) {
        campusStudents = campusStudents.filter(student => 
          student.section === sectionFilters[campus]
        );
      }
      
      // Apply sorting if exists for this campus
      if (sortOrders[campus]) {
        campusStudents = [...campusStudents].sort((a, b) => {
          const aNum = parseInt(a.regNumber.replace(/\D/g, ''), 10) || 0;
          const bNum = parseInt(b.regNumber.replace(/\D/g, ''), 10) || 0;
          return sortOrders[campus] === 'asc' ? aNum - bNum : bNum - aNum;
        });
      }
      
      grouped[campus] = campusStudents;
    });
    
    return grouped;
  };

  const handleSearchChange = (campus, value) => {
    setSearchQueries(prev => ({ ...prev, [campus]: value }));
  };

  const handleSectionFilterChange = (campus, value) => {
    setSectionFilters(prev => ({ ...prev, [campus]: value === 'all' ? null : value }));
  };

  const toggleSortOrder = (campus) => {
    setSortOrders(prev => ({
      ...prev,
      [campus]: prev[campus] === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleCampusExpand = (campus) => {
    setExpandedCampuses(prev => ({
      ...prev,
      [campus]: !prev[campus]
    }));
  };

  const expandAllCampuses = () => {
    const campuses = Object.keys(groupStudentsByCampus());
    const allExpanded = {};
    campuses.forEach(campus => {
      allExpanded[campus] = true;
    });
    setExpandedCampuses(allExpanded);
  };

  const collapseAllCampuses = () => {
    setExpandedCampuses({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateString.split('-');
        return `${day}-${month}-${year}`;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getInitialsAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=64`;
  };

  // Get all unique sections from students
  const getAllSections = () => {
    const sections = new Set();
    students.forEach(student => {
      if (student.section) sections.add(student.section);
    });
    return Array.from(sections).sort();
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Admitted Students</h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-gray-500">No student records have been added yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={expandAllCampuses}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllCampuses}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Collapse All
            </button>
          </div>
{Object.entries(groupStudentsByCampus()).map(([campus, campusStudents], index, array) => (
  <div
    key={campus}
    ref={index === array.length - 1 ? lastCampusRef : null}
    className="border rounded-lg overflow-hidden"
  >

              <button
                className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                onClick={() => toggleCampusExpand(campus)}
              >
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-800">{campus}</h3>
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                    {campusStudents.length} students
                  </span>
                </div>
                <svg
                  className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedCampuses[campus] ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedCampuses[campus] && (
                <div className="border-t">
                  <div className="p-4 bg-white">
                    <div className="flex flex-wrap gap-4 mb-4">
                      {/* Search Input */}
                      <div className="relative flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Search by name or reg no..."
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={searchQueries[campus] || ''}
                          onChange={(e) => handleSearchChange(campus, e.target.value)}
                        />
                        <svg
                          className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      
                      {/* Section Filter */}
                      <div className="flex-1 min-w-[200px]">
                        <select
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={sectionFilters[campus] || 'all'}
                          onChange={(e) => handleSectionFilterChange(campus, e.target.value)}
                        >
                          <option value="all">All Sections</option>
                          {getAllSections().map(section => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Sort Button */}
                      <button
                        onClick={() => toggleSortOrder(campus)}
                        className="flex items-center gap-1 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                      >
                        <span>Sort by Reg No</span>
                        {sortOrders[campus] === 'asc' ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {campusStudents.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
                        No students match your filters for this campus.
                      </div>
                    ) : (
                      <div className="overflow-x-auto shadow-sm rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reg No</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Birth</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent's Name</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent's Mobile</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
  </tr>
</thead>
<tbody className="bg-white divide-y divide-gray-200">
  {campusStudents.map((student) => (
    <tr key={student._id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-14 w-14 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-300">
            {student.studentImageURL ? (
              <img
                src={student.studentImageURL}
                alt={student.studentName}
                className="h-14 w-14 object-cover rounded-full cursor-pointer"
                onClick={() => {
                  setSelectedImage(student.studentImageURL);
                  setIsModalOpen(true);
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getInitialsAvatar(student.studentName);
                }}
              />
            ) : (
              <img
                src={getInitialsAvatar(student.studentName)}
                alt={student.studentName}
                className="h-14 w-14 object-cover rounded-full"
              />
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {student.regNumber}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.studentName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(student.dateOfBirth)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.fatherName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.fatherMobile}
      </td>
      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
  {student.emailId ? (
    <a 
      href={`mailto:${student.emailId}`} 
      className="text-blue-600 hover:underline"
    >
      {student.emailId}
    </a>
  ) : (
    'N/A'
  )}
</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {student.section || 'N/A'}
      </td>
    </tr>
  ))}
</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Zoomed Student"
                  className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
                />
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {isLoadingMore && (
  <div className="text-center py-4 text-orange-600 font-semibold animate-pulse">
    Loading more students...
  </div>
)}

    </div>
  );
}