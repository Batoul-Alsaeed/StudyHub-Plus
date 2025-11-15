// src/pages/ChallengeDetails.tsx
import "../css/ChallengeDetails.css";
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Task = { title: string; done?: boolean };
type LeaderRow = { user_id: number; user_name: string; progress: number };
type CommentRow = { id: number; user_name: string; content: string; timestamp: string };

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

// Generic fetcher for lists
async function fetchList<T>(
  path: string,
  setData: React.Dispatch<React.SetStateAction<T[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  setLoading(true);
  try {
    const data = await safeFetch<T[]>(`${API_BASE}${path}`);
    setData(Array.isArray(data) ? data : []);
  } finally {
    setLoading(false);
  }
}

export default function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const currentUserId =
    (user as any)?.id ?? Number(localStorage.getItem("user_id")) ?? 0;
  const currentUserName =
    (user as any)?.name ?? localStorage.getItem("username") ?? "Guest";

  const joinedFromList = (location.state as any)?.joined || false;

  const [isJoined, setIsJoined] = React.useState(joinedFromList);
  const [challenge, setChallenge] = React.useState<any | null>(null);
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

  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [editContent, setEditContent] = React.useState("");

  const [toast, setToast] = React.useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Fetch challenge details
  async function fetchChallengeSafe() {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      let url = `${API_BASE}/challenges/${id}?current_user_id=${currentUserId}`;
      let res = await fetch(url);

      if (!res.ok) res = await fetch(`${API_BASE}/challenges/${id}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Request failed");

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
  }, [id, currentUserId]);

  // Leaderboard
  function handleFetchLeaderboard() {
    if (!id) return;
    fetchList<LeaderRow>(
      `/challenges/${id}/leaderboard`,
      setLeaderboard,
      setLoadingLeaderboard
    );
  }

  // Comments
  function handleFetchComments() {
    if (!id) return;
    fetchList<CommentRow>(
      `/challenges/${id}/comments`,
      setComments,
      setLoadingComments
    );
  }

  async function handleAddComment() {
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
    if (!window.confirm("Delete this comment?")) return;

    try {
      await safeFetch(`${API_BASE}/comments/${commentId}?user_id=${currentUserId}`, {
        method: "DELETE",
      });
      handleFetchComments();
      showToast("Comment deleted");
    } catch (e: any) {
      showToast(e.message);
    }
  }

  async function handleSaveEditedComment(commentId: number) {
    if (!editContent.trim()) return;

    try {
      await safeFetch(
        `${API_BASE}/comments/${commentId}?user_id=${currentUserId}&content=${encodeURIComponent(
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

  // Join / Leave
  async function updateJoinState(action: "join" | "leave") {
    if (!challenge) return;

    setUpdating(true);

    try {
      await safeFetch(
        `${API_BASE}/challenges/${challenge.id}/${action}?user_id=${currentUserId}`,
        { method: action === "join" ? "POST" : "DELETE" }
      );

      await fetchChallengeSafe();
      setIsJoined(action === "join");

      showToast(action === "join" ? "Joined!" : "Left challenge");
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setUpdating(false);
    }
  }

  function handleJoin() {
    if (!challenge || updating) return;
    updateJoinState("join");
  }

  function handleLeave() {
    if (!challenge || updating) return;
    updateJoinState("leave");
  }

  // Toggle task
  async function handleToggleTask(index: number) {
    if (!challenge || !isJoined) return;

    setUpdating(true);

    try {
      await safeFetch(
        `${API_BASE}/challenges/${challenge.id}/task-toggle?user_id=${currentUserId}&task_index=${index}`,
        { method: "PATCH" }
      );

      await fetchChallengeSafe();
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setUpdating(false);
    }
  }

  // Handle loading UI
  if (loading)
    return (
      <div className="challenge-container">
        <button className="challenge-back-btn" onClick={() => navigate(-1)}>
          ← Back to Challenges
        </button>
        <div className="challenge-spinner"></div>
      </div>
    );

  if (error || !challenge)
    return (
      <div className="challenge-container">
        <button className="challenge-back-btn" onClick={() => navigate(-1)}>
          ← Back to Challenges
        </button>
        <p style={{ color: "#c0392b" }}>{error}</p>
      </div>
    );

  // Convert tasks
  const tasks: Task[] = Array.isArray(challenge.tasks)
    ? challenge.tasks.map((t: any) =>
        typeof t === "string" ? { title: t, done: false } : t
      )
    : [];

  // Progress
  const progressMap = challenge.progress || {};
  const userProgress = progressMap[String(currentUserId)] ?? 0;
  const groupProgress = challenge.group_progress ?? 0;

  const isFull =
    challenge.max_participants &&
    challenge.participants_count >= challenge.max_participants;

  // Dates & Status
  const today = new Date();
  const start = new Date(challenge.start_date);
  const end = new Date(challenge.end_date);

  let status: "Upcoming" | "Active" | "Ended" = "Upcoming";
  if (today < start) status = "Upcoming";
  else if (today > end) status = "Ended";
  else status = "Active";

  return (
    <div className="challenge-container">
      <button className="challenge-back-btn" onClick={() => navigate(-1)}>
        ← Back to Challenges
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
          className={`challenge-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("leaderboard");
            handleFetchLeaderboard();
          }}
        >
          Leaderboard
        </button>

        <button
          className={`challenge-tab-btn ${activeTab === "comments" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("comments");
            handleFetchComments();
          }}
        >
          Comments ({comments.length})
        </button>
      </div>

      {/* DETAILS */}
      {activeTab === "details" && (
        <>
          <div className="challenge-info">
            <p className="challenge-creator">By {challenge.creator_name}</p>
            <div className="challenge-level">
              <span className="material-icons">bar_chart</span>
              {challenge.level} Level
            </div>
            <p className="challenge-dates">
              {challenge.start_date} → {challenge.end_date}
            </p>
          </div>

          <div className="challenge-progress-section">
            {isJoined && (
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
            <h3>
              <span className="material-icons">list_alt</span> Requirements
            </h3>

            {tasks.length > 0 ? (
              <ul>
                {tasks.map((t, i) => (
                  <li
                    key={i}
                    className={`challenge-task-item ${t.done ? "done" : ""}`}
                    onClick={() => handleToggleTask(i)}
                    style={{ cursor: isJoined ? "pointer" : "default" }}
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
            {status === "Ended" ? (
              <button className="challenge-cancel-btn" disabled>
                Challenge Ended
              </button>
            ) : !isJoined ? (
              <button
                className="challenge-save-btn"
                onClick={handleJoin}
                disabled={isFull || updating}
              >
                {isFull ? "Full" : updating ? "Joining..." : "Join Challenge"}
              </button>
            ) : (
              <button
                className="challenge-cancel-btn"
                onClick={handleLeave}
                disabled={updating}
              >
                {updating ? "Leaving..." : "Leave Challenge"}
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
            <p>Loading...</p>
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
      {activeTab === "comments" && (
        <div className="challenge-comments">
          <h3>
            <span className="material-icons">chat</span> Comments
          </h3>

          {loadingComments ? (
            <p>Loading comments...</p>
          ) : comments.length > 0 ? (
            <ul className="challenge-comments-list">
              {comments.map((c) => (
                <li key={c.id} className="challenge-comment-item">
                  <div className="comment-header">
                    <strong>{c.user_name}</strong>

                    <div className="comment-actions">
                      <span className="timestamp">
                        {new Date(c.timestamp).toISOString().slice(0, 10)}{" "}
                        {new Date(c.timestamp).toISOString().slice(11, 16)}
                      </span>

                      {c.user_name === currentUserName && (
                        <>
                          <button
                            className="challenge-icon-btn"
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditContent(c.content);
                            }}
                          >
                            <span className="material-icons">edit</span>
                          </button>

                          <button
                            className="challenge-icon-btn"
                            onClick={() => handleDeleteComment(c.id)}
                          >
                            <span className="material-icons">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingCommentId === c.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
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
                  ) : (
                    <p>{c.content}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No comments yet.</p>
          )}

          {status === "Ended" ? (
            <p className="comments-closed">Comments closed (challenge ended)</p>
          ) : isJoined ? (
            <div className="challenge-comment-form">
              <textarea
                placeholder="Write your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button onClick={handleAddComment}>Send</button>
            </div>
          ) : (
            <p className="comments-closed">Join the challenge to comment</p>
          )}
        </div>
      )}

      {toast && <div className="challenge-toast">{toast}</div>}
    </div>
  );
}
