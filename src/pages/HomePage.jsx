import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const phone = params.get("phone");

  useEffect(() => {
    if (!phone) {
      navigate("/login"); // Redirect to login if no phone number is present
      return;
    }

    // Define user roles and respective dashboards
    const userRoutes = {
      "9353980418": "/admin/dashboard",
      "9880371211": "/super_admin/dashboard",
      "8970321392": "/campus/dashboard",
      "9087654321": "/staff/dashboard",
    };
    const targetRoute = userRoutes[phone];

    if (targetRoute) {
      navigate(targetRoute);
    } else {
      navigate("/login"); // Redirect back to login if an invalid user
    }
  }, [phone, navigate]);

  return null; // No UI needed since it auto-redirects
}

export default HomePage;
