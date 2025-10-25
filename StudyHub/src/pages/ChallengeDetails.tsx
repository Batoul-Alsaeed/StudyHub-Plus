import "../css/ChallengeDetails.css";
import { useParams, useNavigate } from "react-router-dom";

export default function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // هنا لاحقًا تقدر تجيب بيانات التحدي من الـ API باستخدام الـ id
  // مؤقتًا بنستخدم مثال بسيط
  const challenge = {
    title: "Math Week",
    creator: "Khulood Ghazi",
    level: "Easy",
    start_date: "2025-10-25",
    end_date: "2025-10-31",
    description: "This challenge focuses on solving math problems for a whole week.",
    user_progress: 40,
    group_progress: 70,
    requirements: ["Solve 4 problems a day", "Learn algorithms", "Exercise with %"],
  };

  return (
    <div className={`challenge-details ${challenge.level.toLowerCase()}`}>
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back to Challenges
      </button>

      <h1>{challenge.title}</h1>

      <div className="details-info">
        <p className="creator">By {challenge.creator}</p>
        <div className="level">
          <span className="material-icons">bar_chart</span>
          {challenge.level} Level
        </div>
        <p className="dates">
          {challenge.start_date} → {challenge.end_date}
        </p>
      </div>

      <p className="challenge-description">{challenge.description}</p>

      <div className="progress-section">
        <div className="progress-label">
          <span>You Progress</span>
          <span>{challenge.user_progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${challenge.user_progress}%` }}
          ></div>
        </div>

        <div className="progress-label" style={{ marginTop: "15px" }}>
          <span>Group Progress</span>
          <span>{challenge.group_progress}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${challenge.group_progress}%` }}
          ></div>
        </div>
      </div>

      <div className="requirements">
        <h3>Requirements</h3>
        <ul>
          {challenge.requirements.map((req, index) => (
            <li key={index}>
              <span className="material-icons">check_circle</span>
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
