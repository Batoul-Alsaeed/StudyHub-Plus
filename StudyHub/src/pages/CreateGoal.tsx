import { useState } from "react";
import { useGoals } from "../contexts/GoalContext";
import { useAuth } from "../contexts/AuthContext";
import "../css/NewGoal.css";
import { useNavigate } from "react-router-dom";

export default function CreateGoal() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { addGoal } = useGoals();
  // @ts-ignore
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a goal title.");
      return;
    }

    try {
      await addGoal(title);
      alert("Goal added successfully!");
      setTitle("");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to create goal.");
    }
  };

  return (
    <div className="new-goal-container">
      <h2>Create New Goal</h2>
      <form className="goal-form" onSubmit={handleSubmit}>
        <label>Goal Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Study for 2 hours"
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Add Goal</button>
      </form>
    </div>
  );
}
