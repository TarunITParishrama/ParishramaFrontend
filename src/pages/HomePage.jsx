import React, { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Dashboard from "./Dashboard";
import logo from "../assets/logo_kannada.png";
import mdlogo from "../assets/MDPhoto.png";
// import slide1 from "../assets/slides/slide1.png";
// import slide2 from "../assets/slides/slide2.png";
// import slide3 from "../assets/slides/slide3.png";
// import slide4 from "../assets/slides/slide4.png";

function ParishramaHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [userRole, setUserRole] = useState("");
  // const [showSlideshow, setShowSlideshow] = useState(true);
  // const [currentSlide, setCurrentSlide] = useState(0);

  // const slides = [
  //   { image: slide1, alt: "Slide 1" },
  //   { image: slide2, alt: "Slide 2" },
  //   { image: slide3, alt: "Slide 3" },
  //   { image: slide4, alt: "Slide 4" }
  // ];

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const regNumber = localStorage.getItem("studentRegNumber");

    if (!role) {
      navigate("/");
      return;
    }
    setUserRole(role);

    // Auto-advance slides every 3 seconds if slideshow is visible
    // let slideInterval;
    // if (showSlideshow) {
    //   slideInterval = setInterval(() => {
    //     setCurrentSlide((prev) => (prev + 1) % slides.length);
    //   }, 3000);
    // }

    // return () => clearInterval(slideInterval);
  // }, [navigate, showSlideshow, slides.length]);
},[navigate]);
  const activeTab = location.pathname === "/home" ? "dashboard" : location.pathname.split('/').pop();

  if (!userRole) return null;

  const shouldShowNavigation = userRole !== "parent";
  const isParent = userRole === "parent";

  return (
    <div className="flex min-h-screen bg-white relative">
      {/* Slideshow Overlay */}
      {/* {showSlideshow && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-3/4 overflow-hidden rounded-xl shadow-2xl">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 flex items-center justify-center ${
                  index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentSlide ? "bg-white w-6" : "bg-white bg-opacity-50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={() => setShowSlideshow(false)}
            className="mt-6 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md transition-colors duration-300"
          >
            Close Slideshow
          </button>
        </div>
      )} */}

      {/* Navigation Sidebar - only show if userRole is not "parent" */}
      {shouldShowNavigation && (
        <div className={`fixed inset-y-0 left-0 transform ${
          isNavOpen ? "translate-x-0" : "-translate-x-full"
        } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-40`}>
          <Navigation 
            userRole={userRole} 
            activeTab={activeTab}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${
        isNavOpen && shouldShowNavigation ? "ml-64" : "ml-0"
      }`}>
        {/* Top Navigation Bar */}
        <header className="bg-gradient-to-b from-red-600 via-orange-500 to-yellow-400 shadow-sm h-48">
          <div className="flex items-center justify-between h-full px-4">
            {/* Menu Button (left) - only show if navigation is available */}
            {shouldShowNavigation && (
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="p-2 rounded-md text-white hover:bg-white hover:text-yellow-400 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            {/* Center Logo + Bubbles */}
            <div className="flex flex-col items-center">
              <div className="h-20 w-auto">
                <img src={logo} alt="LOGO" className="h-full object-contain" />
              </div>
              {/* <div className="flex space-x-2 -mt-3">
                <div className="flex flex-col items-end ml-8">
                  <div className="w-3 h-3 bg-black rounded-full"></div>
                  <span className="text-sm font-semibold  text-gray-800">Creativity</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-3 h-3 bg-red-700 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-800">Honesty</span>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-3 h-3 bg-yellow-300 rounded-full"></div>
                  <span className="text-sm font-semibold text-gray-800">Trust</span>
                </div>
              </div> */}
            </div>

            {/* MD Info + MD Image + Logout (right) */}
            <div className="flex items-center">
              {isParent ? (
                <div className="absolute right-4 top-8">
                  <img 
                    src={mdlogo} 
                    alt="MDPic" 
                    className="w-20 h-18 object-cover rounded-full  shadow-md" 
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center">
                    <img src={mdlogo} alt="MDPic" className="w-32 h-34 object-cover" />
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem("token");
                      localStorage.removeItem("userRole");
                      localStorage.removeItem("loginType");
                      localStorage.removeItem("rememberRegNumber");
                      navigate("/");
                    }}
                    className="text-white hover:text-red-600 hover:bg-white px-3 py-1 rounded transition"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="p-2 bg-white">
          {activeTab === "dashboard" ? (
            <Dashboard userRole={userRole} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

export default ParishramaHomePage;