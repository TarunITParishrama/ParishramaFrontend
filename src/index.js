import React from "react";
import ReactDOM from "react-dom/client"; // Correct way in React 18
import App from "./App";
import "./index.css"; // Make sure Tailwind is imported

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
