// src/contexts/GoalContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import type { Goal } from "../models/goal";

const API_URL = "https://studyhub-backend-81w7.onrender.com"; ; 

interface GoalContextType {
  goals: Goal[];
  addGoal: (title: string) => Promise<void>;
  toggleGoal: (id: number) => Promise<void>;
  getTodayGoals: () => Goal[];
  getProgressStats: () => { weekly: number; overall: number };
  getWeeklyProgress: () => { day: string; completed: number }[];
}

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export const GoalProvider = ({ children }: { children: React.ReactNode }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const { user } = useAuth();

  //Load user goals from backend
  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API_URL}/api/goals/${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch goals: ${res.status}`);
        return res.json();
      })
      .then((data) => setGoals(data))
      .catch((err) => console.error("Error fetching goals:", err));
  }, [user?.id]);

  // 🔹 Add a new goal
  const addGoal = async (title: string) => {
    if (!user) return;

    const colors = ["#f87171", "#3b82f6", "#fbbf24", "#52a35a", "#8b7cd3"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newGoal = {
      title,
      completed: false,
      date: new Date().toISOString().split("T")[0],
      user_id: user.id,
      color: randomColor,
    };

    try {
      const res = await fetch(`${API_URL}/api/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGoal),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Add goal failed:", text);
        throw new Error("Failed to create goal");
      }

      const data = await res.json();
      data.color = data.color || randomColor; 
      setGoals((prev) => [...prev, data]);
    } catch (err) {
      console.error("Error adding goal:", err);
    }
  };

  //Toggle goal completed / not completed
  const toggleGoal = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/goals/${id}`, {
        method: "PUT",
      });

      if (!res.ok) throw new Error("Failed to update goal");

      const updated = await res.json();
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      console.error("Error updating goal:", err);
    }
  };

  //Filter today's goals
  const getTodayGoals = () => {
    const today = new Date().toISOString().split("T")[0];
    return goals.filter((g) => g.date === today);
  };

  //Compute weekly / overall progress
  const getProgressStats = () => {
    const today = new Date();
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 7);

    const completed = goals.filter((g) => g.completed);
    const weekly = completed.filter((g) => new Date(g.date) >= past7).length;
    const overall = goals.length ? (completed.length / goals.length) * 100 : 0;

    return { weekly, overall };
  };

  //Generate weekly chart data (Sun–Sat)
  const getWeeklyProgress = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = days.map((day) => ({ day, completed: 0 }));

    goals.forEach((goal) => {
      const goalDate = new Date(goal.date);
      if (goal.completed) weeklyData[goalDate.getDay()].completed += 1;
    });

    return weeklyData;
  };

  return (
    <GoalContext.Provider
      value={{
        goals,
        addGoal,
        toggleGoal,
        getTodayGoals,
        getProgressStats,
        getWeeklyProgress,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalContext);
  if (!context) throw new Error("useGoals must be used within GoalProvider");
  return context;
};