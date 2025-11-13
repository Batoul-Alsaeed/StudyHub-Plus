import logo from '../assets/images/StudyHub Logo.png';
import "../css/Sidebar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  /*const { user } = useAuth();*/

  const activePath = location.pathname;

  const handleLogout = () => {
    setUser(null); 
    navigate("/"); 
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <Link to="/landing">
        <img src={logo} alt="StudyHub+" className="logo-img" />
        </Link>
      </div>

      <nav className="nav-links">
        <Link
          to="/dashboard"
          className={`nav-item ${activePath === "/dashboard" ? "active" : ""}`}
        >
          <span className="material-icons">grid_view</span>
          <p>Dashboard</p>
        </Link>

        <Link
          to="/focuestime"
          className={`nav-item ${activePath === "/focuestime" ? "active" : ""}`}
        >
          <span className="material-icons">timer</span>
          <p>Focus Timer</p>
        </Link>

        <Link
          to="/challenges"
          className={`nav-item ${activePath === "/challenges" ? "active" : ""}`}
        >
          <span className="material-icons">groups</span>
          <p>Group Challenge</p>
        </Link>
        
        <div className="divider-logout">
          <span className="line-logout"></span>
        </div>
        
        <div className="logout" onClick={handleLogout}>
          <span className="material-icons">logout</span>
          <p>Logout</p>
        </div>
      </nav>
    </div>
  );
}