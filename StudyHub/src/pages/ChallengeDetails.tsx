// src/pages/ChallengeDetails.tsx
import "../css/ChallengeDetails.css";
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Task = { id?: number; title?: string; done?: boolean };
type LeaderRow = { user_id: number; user_name: string; progress: number };
type CommentRow = {
  id: number;
  user_name: string;
  content: string;
  timestamp: string;
};

const API_BASE = "https://studyhub-backend-81w7.onrender.com/api";

// Safe fetch wrapper

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  let data: any = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`);
  return data as T;
}

function getChallengeStatus(
  startDate: string,
  endDate: string
): "Upcoming" | "Active" | "Ended" {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return "Upcoming";
  if (now > end) return "Ended";
  return "Active";
}

export default function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const challengeFromState = (location.state as any)?.challenge;

  const currentUserId =
    (user as any)?.id ?? Number(localStorage.getItem("user_id")) ?? 0;
  const currentUserName =
    (user as any)?.name ?? localStorage.getItem("username") ?? "Guest";

  const joinedFromList = (location.state as any)?.joined || false;

  const [isJoined, setIsJoined] = React.useState(joinedFromList);
  const [challenge, setChallenge] = React.useState<any | null>(
    challengeFromState || null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [updating, setUpdating] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState<
    "details" | "leaderboard" | "comments"
  >("details");

  const [leaderboard, setLeaderboard] = React.useState<LeaderRow[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = React.useState(false);

  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [loadingComments, setLoadingComments] = React.useState(false);

  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");

  const [toast, setToast] = React.useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // ===== Fetch challenge =====
  async function fetchChallengeSafe() {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const url = `${API_BASE}/challenges/${id}?current_user_id=${currentUserId}`;
      const data = await safeFetch<any>(url);

      setChallenge(data);
      setIsJoined(data.is_joined === true);
    } catch (err: any) {
      setError(err.message || "Error loading challenge");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchChallengeSafe();
  }, [id]);

  // ===== STATUS =====
  const status: "Upcoming" | "Active" | "Ended" = challenge
    ? getChallengeStatus(challenge.start_date, challenge.end_date)
    : "Upcoming";

  const challengeEnded = status === "Ended";

  // ===== Progress Mapping =====
  const rawProgressMap = (challenge?.progress || {}) as Record<
    string,
    number[]
  >;

  const userArray = rawProgressMap[String(currentUserId)] || [];

  const userProgress =
    userArray.length > 0
      ? Math.round(
          (userArray.reduce((sum, v) => sum + (v ? 1 : 0), 0) /
            userArray.length) *
            100
        )
      : 0;

  const groupProgress: number = challenge?.group_progress ?? 0;

  // ===== TASKS =====
  const tasks: Task[] = Array.isArray(challenge?.tasks)
    ? challenge.tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        done: !!t.done,
      }))
    : [];

        //const doneFlag =
          //(rawProgressMap[String(currentUserId)] || [])[t.id] === 1;
        //return { id: t.id, title: t.title, done: doneFlag };
      //})
    //: [];

  // ====== JOIN / LEAVE ======
  async function updateJoinState(action: "join" | "leave") {
    if (!challengeEnded && challenge) {
      setUpdating(true);
      try {
        await safeFetch(
          `${API_BASE}/challenges/${challenge.id}/${action}?user_id=${currentUserId}`,
          { method: action === "join" ? "POST" : "DELETE" }
        );
        await fetchChallengeSafe();
        setIsJoined(action === "join");
      } catch (e: any) {
        showToast(e.message);
      } finally {
        setUpdating(false);
      }
    }
  }

  function handleJoin() {
    if (!challengeEnded) updateJoinState("join");
  }

  function handleLeave() {
    if (!challengeEnded) updateJoinState("leave");
  }

  // ===== TOGGLE TASK =====
  async function handleToggleTask(taskId: number) {
    if (challengeEnded || !isJoined) return;

    setUpdating(true);

    try {
      await safeFetch(
        `${API_BASE}/challenges/${challenge.id}/task-toggle?user_id=${currentUserId}&task_id=${taskId}`,
        { method: "PATCH" }
      );
      await fetchChallengeSafe();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setUpdating(false);
    }
  }

  // ===== COMMENTS =====
   function handleFetchComments() {
  if (!id) return;

  setLoadingComments(true);

  fetch(`${API_BASE}/challenges/${id}/comments`)
    .then((res) => res.json())
    .then((data) => {
      setComments(Array.isArray(data) ? data : []);
    })
    .finally(() => setLoadingComments(false));
  }

  async function handleAddComment() {
    if (challengeEnded) return;
    if (!newComment.trim() || !id) return;

    try {
      await safeFetch(
        `${API_BASE}/challenges/${id}/comments?user_id=${currentUserId}&content=${encodeURIComponent(
          newComment.trim()
        )}`,
        { method: "POST" }
      );

      setNewComment("");
      handleFetchComments();
      showToast("Comment added");
    } catch (e: any) {
      showToast(e.message);
    }
  }

  async function handleDeleteComment(commentId: number) {
  if (challengeEnded) return;
    try {
      await safeFetch(
        `${API_BASE}/challenges/comments/${commentId}?user_id=${currentUserId}`,
        { method: "DELETE" }
      );

      handleFetchComments();
      showToast("Comment deleted");
    } catch (e: any) {
      showToast(e.message);
    }
  }

  async function handleSaveEditedComment(commentId: number) {
  if (challengeEnded) return;
  if (!editContent.trim()) return;

    try {
      await safeFetch(
        `${API_BASE}/challenges/comments/${commentId}?user_id=${currentUserId}&content=${encodeURIComponent(
          editContent.trim()
        )}`,
        { method: "PATCH" }
      );

      setEditingCommentId(null);
      handleFetchComments();
      showToast("Updated");
    } catch (e: any) {
      showToast(e.message);
    }
  }

  function Avatar({ name }: { name: string }) {
    const letter = name ? name.trim().charAt(0).toUpperCase() : "?";

    const colors = [
      "#8b7cd3", "#f36b80", "#4aa3df",
      "#f9cf62", "#7b89f3", "#56c596"
    ];

    const index = letter.charCodeAt(0) % colors.length;
    const bg = colors[index];

    return (
      <div
        className="comment-avatar"
        style={{ backgroundColor: bg }}
      >
        {letter}
      </div>
    );
  }

  // ===== Loading UI =====
  if (loading)
    return (
      <div className="challenge-container">
        <button className="challenge-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="challenge-spinner"></div>
      </div>
    );

  if (error || !challenge)
    return (
      <div className="challenge-container">
        <button className="challenge-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p style={{ color: "#c0392b" }}>{error}</p>
      </div>
    );

  return (
    <div className="challenge-container">
      <button className="challenge-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h1 className="challenge-title">{challenge.title}</h1>

      {/* TABS */}
      <div className="challenge-tabs">
        <button
          className={`challenge-tab-btn ${activeTab === "details" ? "active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>

        <button
          className={`challenge-tab-btn ${
            activeTab === "leaderboard" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("leaderboard");
            setLoadingLeaderboard(true);
            fetch(`${API_BASE}/challenges/${id}/leaderboard`)
              .then((res) => res.json())
              .then((data) => setLeaderboard(data))
              .finally(() => setLoadingLeaderboard(false));
          }}
        >
          Leaderboard
        </button>

        <button
          className={`challenge-tab-btn ${
            activeTab === "comments" ? "active" : ""
          }`}
          onClick={() => {
            setActiveTab("comments");
            handleFetchComments();
          }}
        >
          Comments ({loadingComments ? "..." : comments.length})
        </button>
      </div>

      {/* DETAILS */}
      {activeTab === "details" && (
        <>
          <div className="challenge-info">
            <p className="challenge-creator">
              <span className="material-icons">person</span>
              {challenge.creator_name}
            </p>

            <div className="challenge-level">
              <span className="material-icons">bar_chart</span>
              {challenge.level} Level
            </div>

            <p className="challenge-dates">
              <span className="material-icons">calendar_month</span>
              {challenge.start_date}

              <span style={{ margin: "0 8px" }}>→</span>

              <span className="material-icons">event</span>
              {challenge.end_date}
            </p>
          </div>

          {/* PROGRESS */}
          <div className="challenge-progress-section">
            {isJoined && !challengeEnded && (
              <>
                <div className="challenge-progress-label">
                  <span>Your Progress</span>
                  <span>{userProgress}%</span>
                </div>
                <div className="challenge-progress-bar">
                  <div
                    className="challenge-progress-fill user"
                    style={{ width: `${userProgress}%` }}
                  ></div>
                </div>
              </>
            )}

            <div className="challenge-progress-label">
              <span>Group Progress</span>
              <span>{groupProgress}%</span>
            </div>

            <div className="challenge-progress-bar">
              <div
                className="challenge-progress-fill group"
                style={{ width: `${groupProgress}%` }}
              ></div>
            </div>
          </div>

          {/* TASKS */}
          <div className="challenge-requirements">
            <h4>
              <span className="material-icons">list_alt</span> Requirements
            </h4>

            {tasks.length > 0 ? (
              <ul>
                {tasks.map((t) => (
                  <li
                    key={t.id}
                    className={`challenge-task-item ${t.done ? "done" : ""}`}
                    onClick={() => handleToggleTask(t.id!)}
                    style={{
                      cursor: challengeEnded ? "not-allowed" : "pointer",
                      opacity: challengeEnded ? 0.5 : 1,
                    }}
                  >
                    <span className="material-icons">
                      {t.done ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span>{t.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tasks defined.</p>
            )}
          </div>

          {/* JOIN / LEAVE */}
          <div style={{ marginTop: 24 }}>
            {challengeEnded ? (
              <button className="challenge-cancel-btn" disabled>
                Challenge Ended
              </button>
            ) : !isJoined ? (
              <button
                className="challenge-save-btn"
                onClick={handleJoin}
                disabled={updating || challenge.participants_count >= challenge.max_participants}
              >
                Join
              </button>
            ) : (
              <button
                className="challenge-cancel-btn"
                onClick={handleLeave}
                disabled={updating}
              >
                Leave
              </button>
            )}
          </div>
        </>
      )}

      {/* LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="challenge-leaderboard">
          <h3>
            <span className="material-icons">emoji_events</span> Leaderboard
          </h3>

          {loadingLeaderboard ? (
            <p>Loading leaderboard...</p>
          ) : leaderboard.length > 0 ? (
            <ul>
              {leaderboard.map((row, index) => (
                <li key={row.user_id} className="challenge-leaderboard-item">
                  <span className="material-icons">
                    {index === 0
                      ? "emoji_events"
                      : index === 1
                      ? "military_tech"
                      : index === 2
                      ? "workspace_premium"
                      : "person"}
                  </span>

                  <span>{row.user_name}</span>
                  <span>{row.progress}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No participants yet.</p>
          )}
        </div>
      )}

      {/* COMMENTS */}
      {/* COMMENTS */}
      {activeTab === "comments" && (
        <div className="challenge-comments">
          <h3 className="comments-title">
            <span className="material-icons">chat</span> Comments
          </h3>

          {loadingComments ? (
            <p>Loading comments...</p>
          ) : comments.length > 0 ? (
            <ul className="comments-list">
              {comments.map((c) => {
                const dateObj = new Date(c.timestamp);
                const d = dateObj.toISOString().slice(0, 10);
                const t = dateObj.toISOString().slice(11, 16);

                return (
                  <li key={c.id} className="comment-card">

                    <div style={{ display: "flex", gap: "14px" }}>
                      
                      {/* AVATAR */}
                      <Avatar name={c.user_name} />

                      {/* RIGHT SIDE */}
                      <div style={{ flex: 1 }}>

                        {/* HEADER */}
                        <div className="comment-header-line">
                          {/* LEFT: Avatar + Name */}
                          <div className="comment-left">
                            <strong className="comment-username">{c.user_name}</strong>
                          </div>

                          <div className="comment-meta-right">
                            <span className="material-icons meta-icon">calendar_month</span>
                            <span className="comment-meta-text">{d}</span>

                            <span className="material-icons meta-icon">schedule</span>
                            <span className="comment-meta-text">{t}</span>
                          </div>
                        </div>

                        {/* COMMENT TEXT */}
                        <p className="comment-text">{c.content}</p>

                        {/* FOOTER - ACTION BUTTONS — BELOW */}
                        <div className="comment-footer-line">
                          {!challengeEnded && c.user_name === currentUserName && (
                            <div className="comment-actions-row">
                              <button
                                className="action-btn blue"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditContent(c.content);
                                }}
                              >
                                <span className="material-icons">edit</span>
                              </button>

                              <button
                                className="action-btn red"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                <span className="material-icons delete-icon">delete</span>
                              </button>
                            </div>
                           )}
                        </div>

                        {/* EDIT BOX */}
                        {editingCommentId === c.id && !challengeEnded && (
                          <div className="edit-box">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                            />

                            <div className="edit-actions">
                              <button
                                className="challenge-save-btn"
                                onClick={() => handleSaveEditedComment(c.id)}
                              >
                                Save
                              </button>

                              <button
                                className="challenge-cancel-btn"
                                onClick={() => setEditingCommentId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>

                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No comments yet.</p>
          )}

          {/* INPUT */}
          {challengeEnded ? (
            <p className="comments-closed">Comments closed (challenge ended)</p>
          ) : isJoined ? (
            <div className="comment-input-box">
              <textarea
                placeholder="Write your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="send-btn" onClick={handleAddComment}>Send</button>
            </div>
          ) : (
            <p className="comments-closed">Join the challenge to comment</p>
          )}
        </div>
      )}

      {toast && <div className="toast-box">{toast}</div>}
    </div>
  );
}