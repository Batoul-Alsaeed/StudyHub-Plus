import React, { useEffect, useState } from "react";
import "../css/Challenges.css";
import { useAuth } from "../contexts/AuthContext";
import ChallengeModal from "../components/ChallengeModal";
import { useNavigate } from "react-router-dom";

export default function Challenges() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("browse");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const fetchChallenges = () => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/api/challenges")
      .then((res) => res.json())
      .then((data) => setChallenges(data))
      .catch(() => showToast("Failed to load challenges"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingChallenge(null);
  };

  const handleSaveChallenge = (data: any) => {
    const method = editingChallenge ? "PUT" : "POST";
    const url = editingChallenge
      ? `http://127.0.0.1:8000/api/challenges/${editingChallenge.id}`
      : "http://127.0.0.1:8000/api/challenges";

    setLoading(true);
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then(() => {
        fetchChallenges();
        closeModal();
        showToast("Saved");
      })
      .catch(() => showToast("Save failed"))
      .finally(() => setLoading(false));
  };

  const handleJoin = (id: number) => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/challenges/${id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_name: user?.name || "Guest" }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).detail || "Join failed");
        return res.json();
      })
      .then(() => {
        fetchChallenges();
        showToast("Joined");
      })
      .catch((e) => showToast(`${e.message}`))
      .finally(() => setLoading(false));
  };

  const handleLeave = (id: number) => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/challenges/${id}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_name: user?.name || "Guest" }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).detail || "Leave failed");
        return res.json();
      })
      .then(() => {
        fetchChallenges();
        showToast("Left");
      })
      .catch((e) => showToast(`${e.message}`))
      .finally(() => setLoading(false));
  };

  const handleEdit = (c: any) => {
    setEditingChallenge(c);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this challenge?")) return;
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/challenges/${id}`, { method: "DELETE" })
      .then(() => {
        fetchChallenges();
        showToast("Deleted");
      })
      .catch(() => showToast("Delete failed"))
      .finally(() => setLoading(false));
  };

  const filtered =
    activeTab === "my"
      ? challenges.filter((c) => c.creator_name === (user?.name || "Guest"))
      : challenges;

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <h1>Challenges</h1>
        <button className="create-btn" onClick={openModal}>
          + Create New
        </button>
      </div>

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

      {loading && <div className="spinner" />}

      <div className="challenge-grid">
        {filtered.map((c) => {
          const isOwner = c.creator_name === (user?.name || "Guest");
          const isFull = c.participants >= c.max_participants;

          const userProgress = c.user_progress || 40; // مؤقت للتجربة
          const groupProgress = c.group_progress || 70; // مؤقت للتجربة

          return (
            <div
              className={`challenge-card ${c.level?.toLowerCase()}`}
              key={c.id}
              onClick={() => navigate(`/challenges/${c.id}`)}
              style={{ cursor: "pointer" }}
            >
              <h2>{c.title}</h2>
              <div className="creator-level-row">
  <p className="creator">By {c.creator_name}</p>
  <div className="level-row">
    <span className="material-icons level-icon">bar_chart</span>
    <p>{c.level} Level</p>
  </div>
</div>

<p className="desc">{c.description}</p>


              <div className="participants-row">
                <span className="material-icons">group</span>
                <p>Total {c.max_participants} Participants</p>
              </div>

              <div className="awards-row">
                <span className="material-icons">emoji_events</span>
                <p>There are awards when you’re done</p>
              </div>

              {/* ===== شريط التقدم الفردي والجماعي (منسق مثل تصميم Figma) ===== */}
              <div className="progress-section">
                {/* التقدم الفردي */}
                <div className="progress-row">
                  <div className="progress-label">
                    <span>You Progress</span>
                    <span className="progress-percent">{userProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill user"
                      style={{ width: `${userProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* التقدم الجماعي */}
                <div className="progress-row">
                  <div className="progress-label">
                    <span>Group Progress</span>
                    <span className="progress-percent">{groupProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill group"
                      style={{ width: `${groupProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
<div className="requirements-section">
  <h4>Requirements</h4>
  <ul className="requirements-list">
    {c.tasks?.map((task, index) => (
      <li key={index}>
        <span className="material-icons">check_circle</span>
        <span>{task}</span>
      </li>
    ))}
  </ul>
</div>

              {/* ===== الأزرار ===== */}
              <div className="card-actions" onClick={(e) => e.stopPropagation()}>
  {isOwner ? (
    <>
      <button className="edit-btn" onClick={() => handleEdit(c)}>
        Edit
      </button>
      <button
        className="delete-btn"
        onClick={() => handleDelete(c.id)}
      >
        Delete
      </button>
    </>
  ) : (
    <>
      {/* إذا المستخدم منضم → يظهر فقط زر Leave */}
      {c.participants?.includes(user?.name || "Guest") ? (
        <button
          className={`leave-btn ${c.level?.toLowerCase()}`}
          onClick={() => handleLeave(c.id)}
        >
          Leave Challenge
        </button>
      ) : isFull ? (
        <button className="join-btn full" disabled>
          Full
        </button>
      ) : (
        <button
          className="join-btn"
          onClick={() => handleJoin(c.id)}
        >
          Join Challenge
        </button>
      )}
    </>
  )}
</div>

            </div>
          );
        })}
      </div>

      <ChallengeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveChallenge}
        {...(editingChallenge ? { initialData: editingChallenge } : {})}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
