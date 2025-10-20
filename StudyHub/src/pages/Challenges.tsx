import { useEffect, useState } from "react";
import "../css/Challenges.css";

interface Challenge {
  id: number;
  title: string;
  description: string;
  level: string;
  creator_name: string;
  participants: number;
}

function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/challenges")
      .then((res) => res.json())
      .then((data) => setChallenges(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="challenges-page">
      <h1 className="ch-title">Your Challenges</h1>
      <div className="challenge-grid">
        {challenges.length === 0 ? (
          <p>No challenges available.</p>
        ) : (
          challenges.map((c) => (
            <div className="challenge-card" key={c.id}>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
              <p><strong>Level:</strong> {c.level}</p>
              <p><strong>Participants:</strong> {c.participants}</p>
              <button className="view-btn">View Challenge</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Challenges;
