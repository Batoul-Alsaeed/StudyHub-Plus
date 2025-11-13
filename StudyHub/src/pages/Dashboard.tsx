import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import "../css/Dashboard.css";
import study_illustration from "../assets/images/study_illustration.png";
import streak_illustration from "../assets/images/streak_illustration.png";
import { useAuth } from "../contexts/AuthContext";
import { useGoals } from "../contexts/GoalContext";
import { Link } from "react-router-dom";
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,} from "recharts";
import { Cell } from "recharts";
import { getSummary } from "../api/focusApi";
import PlantGrowth from "../components/PlantGrowth";



export default function Dashboard() {
  const { user } = useAuth(); 
  const [streak, setStreak] = useState(0);
  const {getTodayGoals, getProgressStats, getWeeklyProgress, toggleGoal } = useGoals();
  const todayGoals = getTodayGoals();
  const { overall } = getProgressStats();
  const weeklyData = getWeeklyProgress();
  const [summary, setSummary] = useState<any>(null);





    useEffect(() => {
      if (!user) return;
    // Load streak from localStorage
    const userKey = `streak_${user.email}`;
    const lastLoginKey = `lastLogin_${user.email}`;
    const lastLogin = localStorage.getItem(lastLoginKey);
    const streakCount = localStorage.getItem(userKey);

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
      localStorage.setItem(userKey, newStreak.toString());
      localStorage.setItem(lastLoginKey, today);
      setStreak(newStreak);
    } else {
      // Missed a day → reset
      localStorage.setItem(userKey, "1");
      localStorage.setItem(lastLoginKey, today);
      setStreak(1);
    }
    
    const loadSummary = async () => {
      try {
      const data = await getSummary();
      setSummary(data);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };
  loadSummary();

  }, []);


  return (
    <MainLayout>
      <div className="dashboard-container">
        <div className="top-section">
          <div className="card welcome-card">
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

          <div className="card streak-card">
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

        {/* Progress Section */}
        <div className="progress-section">
          <div className="card weekly-progress">
            <h3>Weekly Progress</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barCategoryGap="35%">
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#555", fontSize: 14}} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="completed" barSize={10} radius={[6, 6, 0, 0]} animationDuration={1200}>
                  {weeklyData.map((entry, index) => {
                    const colors = ["#F36B80", "#F9CF62", "#3140C4", "#80B3A2", "#FAE0DC", "#E37E68", "#8A80C9",];
                    return (
                    <Cell key={`cell-${index}`} fill={entry.completed > 0 ? colors[index % colors.length] : "#e5e7eb"}/>);
                  })}

                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>


          <div className="card overall-progress">
            <h3>Progress Overall</h3>
            <div className="circle">
              <div className="circle-progress" style={{background: `conic-gradient(#3140C4 ${overall * 3.6}deg, #6b728035 0deg)`,}}>
                <div className="circle-inner">
                  <p className="percent">{overall.toFixed(0)}%</p>
                  <p className="text">Complete</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card focus-progress">
            <h3>Focus Progress</h3>
            <p className="time">
              {summary ? `${Math.floor(summary.total_elapsed_sec / 60)}m ${summary.total_elapsed_sec % 60}s` : "00:00"}</p>
              <PlantGrowth growthValue={summary?.daily_plant_growth ?? 0} />

          </div>
        </div>

        {/*Today’s Goals */}
        <div className="goal-section">
          <div className="goal-card">
            <div className="goal-top">
              <p>Today’s Goals</p>
              <Link to="/creategoal">Create New</Link>
            </div>

            <div className="bottom-section">
              {todayGoals.length > 0 ? (
                todayGoals.map((goal) => (
                  <div
                  key={goal.id}
                  className={`goal-item ${goal.completed ? "completed" : ""}`}
                  onClick={() => toggleGoal(goal.id)} >
                    <p>{goal.completed ? "✅ " : "🕓 "} {goal.title}</p>
                    <div className="progress-bar">
                      <div className="progress-fill"
                      style={{
                        width: "100%", 
                        backgroundColor: goal.completed ? goal.color : "#e5e7eb",
                        transition: "background-color 0.4s ease, width 0.4s ease, filter 0.4s ease",
                        filter: goal.completed ? "none" : "grayscale(0.2)",}} 
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">No goals for today yet 🌱</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}