import React, { useEffect, useState } from "react";
import { FaArrowDown } from "react-icons/fa";

const ScrollDown = () => {
  const [visible, setVisible] = useState(true);

  const toggleVisible = () => {
    const scrolled = window.scrollY;
    const nearBottom =
      Math.ceil(window.innerHeight + scrolled) >= document.body.scrollHeight;
    setVisible(scrolled < 100 && !nearBottom);
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  return (
    <button
      onClick={scrollToBottom}
      className={`fixed right-4 sm:right-6 bottom-36 sm:bottom-24 z-50 bg-green-600 text-white p-3 sm:p-4 rounded-full shadow-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-label="Scroll down"
    >
      <FaArrowDown className="text-base sm:text-xl" />
    </button>
  );
};

export default ScrollDown;
