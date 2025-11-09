import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCommentDots, FaArrowUp } from "react-icons/fa";

const GoToTop = () => {
  const [visible, setVisible] = useState(false);
  const [showIntro, setShowIntro] = useState(false);     // controls initial rectangle visibility
  const [morphed, setMorphed] = useState(false);         // when true, shows circular button
  const navigate = useNavigate();

  const isParent = typeof window !== "undefined" &&
    localStorage.getItem("token") &&
    localStorage.getItem("userRole") === "parent";

  useEffect(() => {
    // Scroll visibility for non-parents
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intro morph sequence for parents on first mount
  useEffect(() => {
    if (!isParent) return;
    setShowIntro(true);               
    const morphTimer = setTimeout(() => setMorphed(true), 2000); 
    const hideIntro = setTimeout(() => setShowIntro(false), 1200); 
    return () => {
      clearTimeout(morphTimer);
      clearTimeout(hideIntro);
    };
  }, [isParent]);

  const goFeedback = () => navigate("/home/parents-feedback");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isParent) {
    return (
      <>
        {/* Initial rectangular dialogue box */}
        {showIntro && (
          <button
            onClick={goFeedback}
            className="fixed right-4 sm:right-6 bottom-20 sm:bottom-6 z-50 bg-orange-500 text-white shadow-lg flex items-center gap-2 px-4 py-3"
            aria-label="Any feedbacks"
            style={{
              borderRadius: morphed ? "9999px" : "14px",
              width: morphed ? 56 : undefined,
              height: 56,
              transition: "all 800ms ease-in-out",
              overflow: "hidden",
              whiteSpace: "nowrap",
              animation: "introFade 600ms ease-out",
            }}
          >
            <FaCommentDots className="text-lg" />
            {!morphed && <span>Any feedbacks?</span>}
            <style>{`
              @keyframes introFade {
                from { opacity: 0; transform: translateY(8px) }
                to { opacity: 1; transform: translateY(0) }
              }
            `}</style>
          </button>
        )}

        {/* Settled circular FAB after morph */}
        {!showIntro && (
          <button
            onClick={goFeedback}
            className="fixed right-4 sm:right-6 bottom-20 sm:bottom-6 z-50 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center"
            aria-label="Any feedbacks"
            style={{
              width: 56,
              height: 56,
              animation: "popIn 600ms ease-out",
            }}
          >
            <FaCommentDots className="text-xl" />
            <style>{`
              @keyframes popIn {
                from { transform: scale(0.8); opacity: 0 }
                to { transform: scale(1); opacity: 1 }
              }
            `}</style>
          </button>
        )}
      </>
    );
  }

  // Default non-parent scroll-to-top
  return (
    <button
      onClick={scrollToTop}
      className={`fixed right-4 sm:right-6 bottom-20 sm:bottom-6 z-50 bg-blue-600 text-white p-3 sm:p-4 rounded-full shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-label="Go to top"
    >
      <FaArrowUp className="text-base sm:text-xl" />
    </button>
  );
};

export default GoToTop;
