// src/pages/Challenges.tsx
import { useEffect, useMemo, useState } from "react";
import "../css/Challenges.css";
import { useAuth } from "../contexts/AuthContext";
import ChallengeModal from "../components/ChallengeModal";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

type AnyObj = Record<string, any>;
type Challenge = AnyObj;

type Normalized = Challenge & {
  _participantIds: number[];
  _participantsCount: number;
  _status: "Upcoming" | "Active" | "Ended";
};

export default function Challenges() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentUserId =
    Number((user as any)?.id) || Number(localStorage.getItem("user_id")) || 0;
  const currentUserName =
    (user as any)?.name || localStorage.getItem("username") || "Guest";

  const [_raw, setRaw] = useState<Challenge[]>([]);
  const [list, setList] = useState<Normalized[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "my">("browse");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string>("");

  /** ===== Toast ===== **/
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  /** ===== Fetch Helpers ===== **/
  const safeJSON = async (res: Response) => {
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return await res.json();
    } catch {}
    return null;
  };

  /** ===== Compute Status ===== **/
  const computeStatus = (start: string, end: string) => {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (now < s) return "Upcoming";
    if (now > e) return "Ended";
    return "Active";
  };

  /** ===== Normalize ===== **/
  const extractParticipantIds = (c: Challenge): number[] => {
    const src = c?.participants;
    if (!src) return [];

    if (Array.isArray(src) && src.length > 0) {
      const first = src[0];

      if (typeof first === "number") return Array.from(new Set(src));

      if (typeof first === "object" && first) {
        return Array.from(
          new Set(
            (src as AnyObj[])
              .map((p) =>
                Number(p?.id ?? p?.user_id ?? (typeof p === "string" ? p : NaN))
              )
              .filter((n) => Number.isFinite(n))
          )
        );
      }
    }
    return [];
  };

  const normalizeOne = (c: Challenge): Normalized => {
    const ids = extractParticipantIds(c);

    const pc =
      typeof c?.participants_count === "number"
        ? c.participants_count
        : ids.length;

    const status =
      typeof c?.status === "string"
        ? (c.status as any)
        : computeStatus(c.start_date, c.end_date);

    return {
      ...c,
      _participantIds: ids,
      _participantsCount: pc,
      _status: status,
    };
  };

  const normalizeAll = (arr: Challenge[]) =>
    (Array.isArray(arr) ? arr : []).map(normalizeOne);

  /** ===== Fetch ===== **/
  const fetchChallenges = () => {
    setLoading(true);
    fetch(`https://studyhub-backend-81w7.onrender.com/api/challenges`)
      .then(async (res) => (await safeJSON(res)) ?? [])
      .then((data) => {
        setRaw(data);
        setList(normalizeAll(data));
      })
      .catch(() => showToast("Failed to load challenges"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchChallenges();
  }, [activeTab]);

  /** ===== Derived Lists ===== **/
  const filtered = useMemo(
    () =>
      activeTab === "my"
        ? list.filter(
            (c) =>
              Number(c.creator_id) === Number(currentUserId) ||
              c._participantIds.includes(Number(currentUserId))
          )
        : list,
    [activeTab, list, currentUserId]
  );

  /** ===== Modal ===== **/
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingChallenge(null);
  };

  /** ===== CRUD ===== **/
  const handleSaveChallenge = (data: AnyObj) => {
    const method = editingChallenge ? "PUT" : "POST";
    const url = editingChallenge
      ? `https://studyhub-backend-81w7.onrender.com/api/challenges/${editingChallenge.id}`
      : "https://studyhub-backend-81w7.onrender.com/api/challenges";

    const payload = {
      ...data,
      creator_id: currentUserId,
      creator_name: currentUserName,
    };

    setLoading(true);
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = (await safeJSON(res)) || {};
          throw new Error(err.detail || err.message || "Save failed");
        }
        return safeJSON(res);
      })
      .then(() => {
        fetchChallenges();
        closeModal();
        showToast("Saved");
      })
      .catch((e: any) => showToast(String(e.message || e)))
      .finally(() => setLoading(false));
  };

  /** ===== Helpers ===== **/
  const isOwner = (c: Normalized) =>
    Number(c.creator_id) === Number(currentUserId);

  const isMember = (c: Normalized) =>
    c._participantIds.includes(Number(currentUserId));

  const isFull = (c: Normalized) =>
    typeof c.max_participants === "number" &&
    c._participantsCount >= c.max_participants;

  /** ===== Join / Leave ===== **/
  const handleJoin = async (id: number) => {
    if (!currentUserId) {
      showToast("Please login first");
      return;
    }

    setList((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              _participantIds: [...c._participantIds, currentUserId],
              _participantsCount: c._participantsCount + 1,
            }
          : c
      )
    );

    setLoading(true);

    try {
      const res = await fetch(
        `https://studyhub-backend-81w7.onrender.com/api/challenges/${id}/join?user_id=${currentUserId}`,
        { method: "POST" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to join");

      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                _participantIds: Array.isArray(data.participants)
                  ? data.participants.map((p: any) => Number(p))
                  : [],
                _participantsCount: Array.isArray(data.participants)
                  ? data.participants.length
                  : c._participantsCount,
              }
            : c
        )
      );

      setActiveTab("my");
      showToast("Joined successfully!");
    } catch (e: any) {
      showToast(e.message || "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async (id: number) => {
    if (!currentUserId) {
      showToast("Please login first");
      return;
    }

    setList((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              _participantIds: c._participantIds.filter(
                (pid) => pid !== currentUserId
              ),
              _participantsCount: Math.max(0, c._participantsCount - 1),
            }
          : c
      )
    );

    setLoading(true);
    try {
      const res = await fetch(
        `https://studyhub-backend-81w7.onrender.com/api/challenges/${id}/leave?user_id=${currentUserId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to leave");

      setList((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                _participantIds: Array.isArray(data.participants)
                  ? data.participants.map((p: any) => Number(p))
                  : [],
                _participantsCount: Array.isArray(data.participants)
                  ? data.participants.length
                  : c._participantsCount,
              }
            : c
        )
      );

      showToast("Left challenge");
    } catch (e: any) {
      showToast(e.message || "Failed to leave");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setIsModalOpen(true);
  };

  /** ===== Delete Challenge ===== **/
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this challenge?")) return;

    setLoading(true);
    try {
      const res = await fetch(
        `https://studyhub-backend-81w7.onrender.com/api/challenges/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");

      showToast("Challenge deleted");
      fetchChallenges();
    } catch (e: any) {
      showToast(e.message || "Error deleting challenge");
    } finally {
      setLoading(false);
    }
  };

  /** ===== UI ===== **/
  return (
    <MainLayout>
      <div className="challenges-container">

        {/* HEADER */}
        <div className="challenges-header">
          <h1>Challenges</h1>
          <button className="challenges-create-btn" onClick={openModal}>
            + Create New
          </button>
        </div>

        {/* TABS */}
        <div className="challenges-tabs">
          <button
            className={
              activeTab === "browse" ? "challenges-tab active" : "challenges-tab"
            }
            onClick={() => setActiveTab("browse")}
          >
            Browse All
          </button>

          <button
            className={
              activeTab === "my" ? "challenges-tab active" : "challenges-tab"
            }
            onClick={() => setActiveTab("my")}
          >
            My Challenges
          </button>
        </div>

        {loading && <div className="spinner" />}

        {/* GRID */}
        <div className="challenges-grid">
          {filtered.map((c) => {
            const owner = isOwner(c);
            const member = isMember(c);
            const full = isFull(c);
            const isEnded = new Date(c.end_date) < new Date();

            return (
              <div
                key={c.id}
                className={`challenge-card-wrapper level-${c.level?.toLowerCase?.()}`}
                onClick={() =>
                  !loading &&
                  navigate(`/challenges/${c.id}`, {
                    state: { joined: member, challenge: c },
                  })
                }
              >
                {/* Title */}
                <h2 className="challenge-title">{c.title}</h2>

            
                {/* Creator + Level*/}
                <div className="challenge-info-row">
                  <p className="challenge-by">By {c.creator_name}</p>

                  <div className="challenge-level">
                    <span className="material-icons">bar_chart</span>
                    <span>{c.level} Level</span>
                  </div>
                </div>

                {/* Status */}
                <div className="challenge-status-row-top">
                  <span
                    className={`challenge-status-badge ${
                      isEnded ? "ended" : c._status.toLowerCase()
                    }`}
                  >
                    {isEnded ? "Ended" : c._status}
                  </span>
                </div>

                {/* Description */}
                <p className="challenge-desc">{c.description}</p>

                {/* Participants */}
                <div className="challenge-part-row">
                  <span className="material-icons">groups</span>
                  <span className="participants-text"> 
                  <strong>{c._participantsCount}</strong> / {c.max_participants} Members</span>
                </div>

                {/* Progress */}
                <div className="progress-section">

                  {/* User Progress */}
                  <div className="progress-header-row">
                    <span className="progress-label">Your Progress</span>
                    <span className="progress-value">{c.user_progress || 0}%</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${c.user_progress || 0}%` }}
                    ></div>
                  </div>

                  {/* Group Progress */}
                  <div className="progress-header-row">
                    <span className="progress-label">Group Progress</span>
                    <span className="progress-value">{c.group_progress || 0}%</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${c.group_progress || 0}%` }}
                    ></div>
                  </div>

                </div>

                {/* Tasks Preview */}
                <div className="tasks-preview">
                  <label className="tasks-title">Requirements</label>

                  {/* Show max 3 tasks */}
                  {c.tasks.slice(0, 3).map((t: any) => (
                  <div key={t.id} className="task-preview-item">
                    <span className="task-check-icon">✔</span>
                    <span>{t.title}</span>
                  </div>
                  ))}
                  
                  {/* If more tasks exist */}
                  {c.tasks.length > 3 && (
                    <div className="task-preview-more">
                      +{c.tasks.length - 3} more...
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div
                  className="challenge-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isEnded ? (
                    <button className="challenge-btn ended" disabled>
                      Ended
                    </button>
                  ) : owner ? (
                    <>
                      <button
                        className="challenge-btn edit"
                        onClick={() => handleEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        className="challenge-btn delete"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </button>
                    </>
                  ) : member ? (
                    <button
                      className="challenge-btn leave"
                      onClick={() => handleLeave(c.id)}
                    >
                      Leave
                    </button>
                  ) : full ? (
                    <button className="challenge-btn full" disabled>
                      Full
                    </button>
                  ) : (
                    <button
                      className="challenge-btn join"
                      onClick={() => handleJoin(c.id)}
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ==== Modal ==== */}
        <ChallengeModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleSaveChallenge}
          {...(editingChallenge ? { initialData: editingChallenge } : {})}
        />

        {/* ==== Toast ==== */}
        {toast && <div className="toast">{toast}</div>}

      </div>
    </MainLayout>
  );
}