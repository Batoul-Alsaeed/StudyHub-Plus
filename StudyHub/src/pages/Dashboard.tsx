import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import "../css/Dashboard.css";
import study_illustration from "../assets/images/study_illustration.png";
import streak_illustration from "../assets/images/streak_illustration.png";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth(); 
  const [streak, setStreak] = useState(0);

    useEffect(() => {
    // Load streak from localStorage
    const lastLogin = localStorage.getItem("lastLogin");
    const streakCount = localStorage.getItem("streakCount");

    const today = new Date().toDateString();

    if (!lastLogin) {
      localStorage.setItem("lastLogin", today);
      localStorage.setItem("streakCount", "1");
      setStreak(1);
      return;
    }

    const lastLoginDate = new Date(lastLogin);
    const difference =
      (new Date(today).getTime() - lastLoginDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (difference < 1) {
      // Already logged in today → streak unchanged
      setStreak(Number(streakCount));
    } else if (difference === 1) {
      // Consecutive day → increase streak
      const newStreak = Number(streakCount) + 1;
      localStorage.setItem("streakCount", newStreak.toString());
      localStorage.setItem("lastLogin", today);
      setStreak(newStreak);
    } else {
      // Missed a day → reset
      localStorage.setItem("streakCount", "1");
      localStorage.setItem("lastLogin", today);
      setStreak(1);
    }
  }, []);


  return (
    <MainLayout>
      <div className="dashboard-container">
        <div className="top-section">
          <div className="welcome-card">
            <div className="welcome-text">
              <h2>Welcome</h2>
              <h3>{user ? user.name : "Guest"}</h3>
            </div>
            <img
              src={study_illustration}
              alt="Study Illustration"
              className="welcome-img"
            />
          </div>

          <div className="streak-card">
            <h3>Streak</h3>
            <p>
              <span>{streak} {streak === 1 ? "Day" : "Days"}</span>
            </p>
            <img
              src={streak_illustration}
              alt="Streak Runner"
              className="streak-img"
            />
          </div>
        </div>

        <div className="progress-section">
          <div className="card weekly-progress">
            <h3>Weekly Progress</h3>
          </div>

          <div className="card overall-progress">
            <h3>Progress Overall</h3>
            <div className="circle">
            </div>
          </div>

          <div className="card focus-progress">
            <h3>Focus Progress</h3>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}