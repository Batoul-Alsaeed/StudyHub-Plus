// src/pages/ChallengeDetails.tsx
import "../css/ChallengeDetails.css";
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type Task = string | { title?: string; done?: boolean };
type LeaderRow = { id: number; name: string; progress: number };
type CommentRow = {
  id: number;
  user_name: string;
  content: string;
  timestamp: string;
};

const API_BASE = "https://studyhub-backend-81w7.onrender.com/api";

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok)
    throw new Error(data?.detail || `Request failed (status ${res.status})`);
  return data as T;
}

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

function computeUserProgress(arr: { title?: string; done?: boolean }[]) {
  const total = arr.length;
  if (total === 0) return 0;
  const done = arr.filter((t) => t && t.done === true).length;
  return Math.round((done / total) * 100);
}

export default function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const joinedFromList = (location.state as any)?.joined || false;
  const [isJoined, setIsJoined] = React.useState<boolean>(joinedFromList);

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
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(
    null
  );
  const [editContent, setEditContent] = React.useState("");
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [toast, setToast] = React.useState("");

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const currentUserId =
    (user as any)?.id ?? Number(localStorage.getItem("user_id")) ?? 0;
  const currentUserName =
    (user as any)?.name ?? localStorage.getItem("username") ?? "Guest";

  // ===== Fetch challenge details =====
  async function fetchChallengeSafe() {
    if (!id) return;
    setLoading(true);
    setError("");

    try {
      let url = `${API_BASE}/challenges/${id}?user_id=${currentUserId}&user_name=${encodeURIComponent(
        currentUserName
      )}`;
      let res = await fetch(url);
      if (!res.ok) res = await fetch(`${API_BASE}/challenges/${id}`);

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || `Failed (status ${res.status})`);
      setChallenge(data);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchChallengeSafe();
  }, [id, currentUserId, currentUserName]);

  // ===== Auto-refresh comments every 10 seconds =====
  React.useEffect(() => {
    if (activeTab === "comments") {
      const interval = setInterval(() => handleFetchComments(), 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // ===== Participants =====
  const participantsArray: any[] = Array.isArray(challenge?.participants)
    ? challenge.participants
    : [];

  // @ts-ignore
  const participantIds = participantsArray
    .map((p) =>
      typeof p === "object" && p !== null ? (p as any).id : Number(p)
    )
    .filter(Boolean) as number[];
    
  // @ts-ignore
    const participantNames = participantsArray
    .map((p) => (typeof p === "object" && p !== null ? (p as any).name : p))
    .filter(Boolean) as string[];

  React.useEffect(() => {
    if (!challenge) return;
     const participantIds = [];
  const participantNames = [];

  if (Array.isArray(challenge.participants)) {
    for (const p of challenge.participants) {
      if (typeof p === "number") participantIds.push(p);
      else if (p && typeof p === "object") {
        if (p.id) participantIds.push(Number(p.id));
        if (p.name) participantNames.push(p.name);
      }
    }
  }

  const joined =
    participantIds.includes(Number(currentUserId)) ||
    participantNames.includes(String(currentUserName)) ||
    challenge.is_joined === true;

  setIsJoined(joined);
}, [challenge, currentUserId, currentUserName]);

  // ===== Tasks =====
  const rawTasks: Task[] = Array.isArray(challenge?.tasks)
    ? challenge.tasks
    : [];
  const tasks = rawTasks.map((t) =>
    typeof t === "string"
      ? { title: t, done: false }
      : t || { title: "", done: false }
  );

  const progressMap =
    (typeof challenge?.progress === "object" && challenge?.progress) || {};
  const userProgress =
    progressMap[String(currentUserId)] ??
    (typeof challenge?.user_progress === "number"
      ? challenge.user_progress
      : 0);
  const groupProgress = Number.isFinite(challenge?.group_progress)
    ? challenge.group_progress
    : 0;

  const currentCount =
    challenge?.participants_count ?? participantsArray.length ?? 0;
  const maxCount = challenge?.max_participants ?? 0;
  const isFull = maxCount > 0 && currentCount >= maxCount;

  // ===== Challenge status =====
  const today = new Date();
  const start = challenge?.start_date ? new Date(challenge.start_date) : null;
  const end = challenge?.end_date ? new Date(challenge.end_date) : null;

  let challengeStatus: "Upcoming" | "Active" | "Ended" = "Upcoming";
  if (start && today >= start && end && today <= end) challengeStatus = "Active";
  else if (end && today > end) challengeStatus = "Ended";
  else if (start && today < start) challengeStatus = "Upcoming";

  // ===== Leaderboard =====
  function handleFetchLeaderboard() {
    if (!id) return;
    fetchList<LeaderRow>(
      `/challenges/${id}/leaderboard`,
      setLeaderboard,
      setLoadingLeaderboard
    );
  }

  // ===== Comments =====
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
      await handleFetchComments();
      showToast("Comment added");
    } catch (e: any) {
      showToast(e.message || "Failed to add comment");
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await safeFetch(`${API_BASE}/comments/${commentId}`, {
        method: "DELETE",
      });
      await handleFetchComments();
      showToast("Comment deleted");
    } catch (e: any) {
      showToast(e.message || "Failed to delete comment");
    }
  }

  function handleEditComment(commentId: number, currentText: string) {
    setEditingCommentId(commentId);
    setEditContent(currentText);
  }

  async function handleSaveEditedComment(commentId: number) {
    if (!editContent.trim()) return;
    try {
      await safeFetch(`${API_BASE}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      await handleFetchComments();
      showToast("Comment updated");
      setEditingCommentId(null);
    } catch (e: any) {
      showToast(e.message || "Failed to update comment");
    }
  }

  // ===== Join / Leave =====
  async function updateJoinState(action: "join" | "leave") {
    if (!challenge) return;
    setUpdating(true);
    const isJoin = action === "join";

    // Optimistic UI
    setChallenge((prev: any) => {
      if (!prev) return prev;
      const nextCount = Math.max(
        0,
        (prev.participants_count ?? 0) + (isJoin ? 1 : -1)
      );
      return { ...prev, is_joined: isJoin, participants_count: nextCount };
    });
    setIsJoined(isJoin);

    try {
      await safeFetch(
        `${API_BASE}/challenges/${challenge.id}/${action}?user_id=${currentUserId}`,
        {
          method: isJoin ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_name: currentUserName }),
        }
      );
      showToast(isJoin ? "Joined successfully!" : "Left challenge");
    } catch (e: any) {
      showToast(isJoin ? "Failed to join (server)" : "Failed to leave (server)");
    } finally {
      await fetchChallengeSafe();
      setUpdating(false);
    }
  }

  function handleJoin() {
    if (!challenge || isFull || updating) return;
    updateJoinState("join");
  }

  function handleLeave() {
    if (!challenge || updating) return;
    updateJoinState("leave");
  }

  // ===== Toggle task =====
  async function handleToggleTask(index: number, isDone: boolean) {
    if (!challenge || !isJoined) return;

    const today = new Date();
    const start = challenge?.start_date ? new Date(challenge.start_date) : null;
    if (start && today < start) {
      showToast("You can start tracking progress once the challenge begins!");
      return;
    }

    const newTasks = [...(challenge?.tasks || [])].map((t: any, i: number) => {
      if (typeof t === "string") t = { title: t, done: false };
      if (!t) t = { title: "", done: false };
      return i === index ? { ...t, done: !isDone } : { ...t };
    });

    const newUserProgress = computeUserProgress(
      newTasks.filter((t) => typeof t === "object")
    );

    setChallenge((prev: any) => {
      if (!prev) return prev;
      const nextProgress = { ...(prev.progress || {}) };
      nextProgress[String(currentUserId)] = newUserProgress;
      return { ...prev, tasks: newTasks, progress: nextProgress };
    });

    setUpdating(true);
    try {
      await safeFetch(
        `${API_BASE}/challenges/${challenge.id}/tasks?user_id=${currentUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTasks),
        }
      );
      await fetchChallengeSafe();
    } catch (e: any) {
      showToast(e.message || "Failed to update tasks");
    } finally {
      setUpdating(false);
    }
  }

  // ===== Loading and Error States =====
  if (loading)
    return (
      <div className="challenge-container">
        <button className="challenge-back-btn" onClick={() => navigate(-1)}>
          ← Back to Challenges
        </button>
        <div className="challenge-spinner" />
      </div>
    );

  if (error || !challenge)
    return (
      <div className="challenge-container">
        <button className="challenge-back-btn" onClick={() => navigate(-1)}>
          ← Back to Challenges
        </button>
        <p style={{ color: "#c0392b" }}>{error || "Challenge not found"}</p>
      </div>
    );

  // ===== RENDER =====
  return (
    <div className={`challenge-container ${challenge.level?.toLowerCase?.() || ""}`}>
      <button className="challenge-back-btn" onClick={() => navigate(-1)}>
        ← Back to Challenges
      </button>

      <h1 className="challenge-title">{challenge.title}</h1>

      {/* Tabs */}
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

      {/* Details */}
      {activeTab === "details" && (
        <>
          <div className="challenge-info">
            <p className="challenge-creator">By {challenge.creator_name}</p>
            <div className="challenge-level">
              <span className="material-icons">bar_chart</span>
              {challenge.level} Level
            </div>
            <p className="challenge-dates">
              {challenge.start_date || "—"} → {challenge.end_date || "—"}
            </p>
          </div>

          <p className="challenge-description">
            {challenge.description || "No description provided."}
          </p>

          {/* Progress */}
          <div className="challenge-progress-section">
            {isJoined && (
              <>
                <div className="challenge-progress-label">
                  <span>Your Progress</span>
                  <span>{userProgress}%</span>
                </div>
                <div className="challenge-progress-bar">
                  <div
                    className={`challenge-progress-fill user ${challenge.level?.toLowerCase?.() || ""}`}
                    style={{ width: `${userProgress}%` }}
                  ></div>
                </div>
              </>
            )}

            <div className="challenge-progress-label" style={{ marginTop: isJoined ? 15 : 0 }}>
              <span>Group Progress</span>
              <span>{groupProgress}%</span>
            </div>
            <div className="challenge-progress-bar">
              <div
                className={`challenge-progress-fill group ${challenge.level?.toLowerCase?.() || ""}`}
                style={{ width: `${groupProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Requirements */}
          <div className="challenge-requirements">
            <h3>
              <span className="material-icons">list_alt</span> Requirements
            </h3>
            {tasks.length > 0 ? (
              <ul>
                {tasks.map((task, i) => {
                  const done = task.done === true;
                  return (
                    <li
                      key={`${challenge.id}-task-${i}`}
                      onClick={() => handleToggleTask(i, done)}
                      className={`challenge-task-item ${done ? "done" : ""}`}
                      style={{ cursor: isJoined ? "pointer" : "default" }}
                    >
                      <span className="material-icons">
                        {done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <span>{task.title || ""}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={{ color: "#555" }}>No tasks defined for this challenge.</p>
            )}
          </div>

          {/* Join / Leave */}
          <div style={{ marginTop: 24 }}>
            {challengeStatus === "Ended" ? (
              <button
                className="challenge-cancel-btn"
                style={{
                  width: "100%",
                  backgroundColor: "#ccc",
                  cursor: "not-allowed",
                  color: "#555",
                }}
                disabled
              >
                Challenge Ended
              </button>
            ) : !isJoined ? (
              <button
                className={`challenge-save-btn ${challenge.level?.toLowerCase?.() || ""}`}
                style={{ width: "100%" }}
                onClick={handleJoin}
                disabled={isFull || updating}
              >
                {updating ? "Joining..." : isFull ? "Full" : "Join Challenge"}
              </button>
            ) : (
              <button
                className="challenge-cancel-btn"
                style={{ width: "100%" }}
                onClick={handleLeave}
                disabled={updating}
              >
                {updating ? "Leaving..." : "Leave Challenge"}
              </button>
            )}
          </div>
        </>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="challenge-leaderboard">
          <h3>
            <span className="material-icons">emoji_events</span> Leaderboard
          </h3>
          {loadingLeaderboard ? (
            <p>Loading leaderboard...</p>
          ) : leaderboard.length > 0 ? (
            <ul className="challenge-leaderboard-list">
              {leaderboard.map((row, index) => (
                <li key={row.id} className="challenge-leaderboard-item">
                  <div className="rank-icon">
                    <span className="material-icons">
                      {index === 0
                        ? "emoji_events"
                        : index === 1
                        ? "military_tech"
                        : index === 2
                        ? "workspace_premium"
                        : "person"}
                    </span>
                  </div>
                  <span className="name">{row.name}</span>
                  <span className="progress">{row.progress}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No participants yet.</p>
          )}
        </div>
      )}

      {/* Comments */}
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
                        <span className="timestamp-row">
                          <span className="material-icons date-icon">calendar_today</span>
                          {new Date(c.timestamp).toISOString().slice(0, 10)}
                        </span>
                        <span className="timestamp-row">
                          <span className="material-icons time-icon">schedule</span>
                          {new Date(c.timestamp).toISOString().slice(11, 16)}
                        </span>
                      </span>
                      {c.user_name === currentUserName && (
                        <>
                          <button
                            className="challenge-icon-btn"
                            title="Edit comment"
                            onClick={() => handleEditComment(c.id, c.content)}
                          >
                            <span className="material-icons">edit</span>
                          </button>
                          <button
                            className="challenge-icon-btn"
                            title="Delete comment"
                            onClick={() => handleDeleteComment(c.id)}
                          >
                            <span className="material-icons">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingCommentId === c.id ? (
                    <div className="challenge-edit-comment-form">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <div style={{ marginTop: 8 }}>
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
                  ) : (
                    <p>{c.content}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No comments yet. Be the first!</p>
          )}

          {challengeStatus === "Ended" ? (
            <p style={{ color: "#999", marginTop: 10 }}>
              Comments are closed. The challenge has ended.
            </p>
          ) : isJoined ? (
            <div className="challenge-comment-form">
              <textarea
                placeholder="Write your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button onClick={handleAddComment} disabled={updating}>
                Send
              </button>
            </div>
          ) : (
            <p style={{ color: "#777", marginTop: 10 }}>
              Only participants can comment. Join the challenge to chat.
            </p>
          )}
        </div>
      )}

      {toast && <div className="challenge-toast">{toast}</div>}
    </div>
  );
}