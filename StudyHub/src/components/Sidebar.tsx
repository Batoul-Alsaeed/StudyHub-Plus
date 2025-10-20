import logo from '../assets/images/StudyHub Logo.png';
import "../css/Sidebar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();


  const activePath = location.pathname;

  const handleLogout = () => {
    setUser(null); 
    navigate("/"); 
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <img src={logo} alt="StudyHub+" className="logo-img" />
      </div>

      <nav className="nav-links">
        <Link
          to="/dashboard"
          className={`nav-item ${activePath === "/" ? "active" : ""}`}
        >
          <span className="material-icons">grid_view</span>
          <p>Dashboard</p>
        </Link>

        <Link
          to="/focus"
          className={`nav-item ${activePath === "/focus" ? "active" : ""}`}
        >
          <span className="material-icons">timer</span>
          <p>Focus Timer</p>
        </Link>

        <Link
          to="/group"
          className={`nav-item ${activePath === "/group" ? "active" : ""}`}
        >
          <span className="material-icons">groups</span>
          <p>Group Challenge</p>
        </Link>
      </nav>

      <div className="logout" onClick={handleLogout}>
        <span className="material-icons">logout</span>
        <p>Logout</p>
      </div>
    </div>
  );
}