import React, { useEffect, useState } from "react";
import "../css/Challenges.css";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ChallengeModal from "../components/ChallengeModal";

export default function Challenges() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("browse");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ جلب التحديات من الباك
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/challenges")
      .then((res) => res.json())
      .then((data) => setChallenges(data))
      .catch((err) => console.error("Error fetching challenges:", err));
  }, []);

  // فتح واغلاق المودال
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // ✅ إنشاء تحدي جديد
  const handleCreateChallenge = (newChallenge: any) => {
    const challengeData = {
      ...newChallenge,
      creator_name: user?.name || "Guest",
    };

    fetch("http://127.0.0.1:8000/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(challengeData),
    })
      .then((res) => res.json())
      .then((data) => {
        setChallenges((prev) => [data, ...prev]); // يضيف التحدي الجديد أول القائمة
        setNotification("✅ Challenge created successfully!");
        setTimeout(() => setNotification(""), 2500); // يخفي التنبيه بعد ثانيتين ونصف
        closeModal(); // يغلق المودال بعد الحفظ
      })
      .catch((err) => console.error("Error creating challenge:", err));
  };

  const filteredChallenges =
    activeTab === "my"
      ? challenges.filter((c) => c.creator_name === (user?.name || "Guest"))
      : challenges;

  const handleJoinChallenge = (id: number) => {
    alert(`Joined Challenge ID: ${id}`);
  };

  return (
    <div className="challenges-container">
      {/* -------- HEADER -------- */}
      <div className="challenges-header">
        <h1>Challenges</h1>
        <button className="create-btn" onClick={openModal}>
          Create New
        </button>
      </div>

      {/* -------- TABS -------- */}
      <div className="tabs">
        <button
          className={activeTab === "browse" ? "tab active" : "tab"}
          onClick={() => setActiveTab("browse")}
        >
          Browse All
        </button>
        <button
          className={activeTab === "my" ? "tab active" : "tab"}
          onClick={() => setActiveTab("my")}
        >
          My Challenges
        </button>
      </div>

      {/* -------- CHALLENGE CARDS -------- */}
      <div className="challenge-grid">
        {filteredChallenges.map((c) => (
          <div className="challenge-card" key={c.id}>
            <h2>{c.title}</h2>
            <p className="creator">By: {c.creator_name}</p>
            <p>{c.description}</p>
            <p className="participants">{c.participants} Participants</p>
            <button
              className="join-btn"
              onClick={() => handleJoinChallenge(c.id)}
            >
              Join Challenge
            </button>
          </div>
        ))}
      </div>

      {/* -------- MODAL -------- */}
      <ChallengeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleCreateChallenge}
      />

      {/* -------- Notification -------- */}
      {notification && <div className="notification">{notification}</div>}
    </div>
  );
}
