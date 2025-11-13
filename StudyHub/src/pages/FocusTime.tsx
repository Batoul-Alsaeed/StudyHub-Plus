import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import {createSession, startSession, pauseSession, resumeSession, completeSession,} from "../api/focusApi";
import "../css/FocusTime.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function FocusTimer() {
  const [session, setSession] = useState<any>(null);
  const [phase, setPhase] = useState< "initial" | "setup" | "running" | "paused" | "break" | "done" >("initial");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(20);
  const [timeLeft, setTimeLeft] = useState(0);
  const [audio] = useState(() => new Audio("/sounds/ding.mp3"));
  const [savedFocusTime, setSavedFocusTime] = useState<number | null>(null);
  const [breaksTaken, setBreaksTaken] = useState(0);
  const [paused, setPaused] = useState(false);




  // countdown for both focus and break
  useEffect(() => {
    if ((phase !== "running" && phase !== "break") || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  // handle timer reaching 0
  useEffect(() => {
    if (timeLeft === 0) {
      if (phase === "running") handleComplete();
      if (phase === "break") handleBreakEnd();
    }
  }, [timeLeft]);

  // play soft notification sound
  const playSound = () => {
    audio.currentTime = 0; 
    audio.volume = 0.7;
    audio.play().catch((err) => console.warn("Audio play blocked:", err));
  };

  // start a short break
  const handleBreak = () => {
    if (phase === "break") return;
    setBreaksTaken((prev) => prev + 1);
    setSavedFocusTime(timeLeft);
    setPhase("break");
    setTimeLeft(1 * 60); 
  };

  // when break ends
  const handleBreakEnd = () => {
    setTimeout(() => {
      playSound();
    }, 300);
    

    // browser notification
    if ("Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification("Break’s over!", {
            body: "Time to refocus and continue your session 🌱",
          });
        }
      });
    }

    // fallback alert
    toast.info("Break’s over! Let’s refocus 🌟", {
      position: "bottom-center",
      autoClose: 4000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      style: { background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(12px)", color: "#000000ff", fontSize: "16px", borderRadius: "12px", padding: "12px 20px", textAlign: "center", },
    });
    
    if (savedFocusTime !== null && savedFocusTime > 0) {
      setTimeLeft(savedFocusTime);
      setSavedFocusTime(null);
      setPhase("running");   
    } else {
      setPhase("done");
    }
  };

  // format timer as mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  // setup & start new session
  const handleStartNew = () => setPhase("setup");

  const handleConfirmStart = async () => {
    
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      console.warn("Audio unlock failed", e);
    }
    
    const newSession = await createSession(title, duration);
    await startSession(newSession.id);
    setSession(newSession);
    setTimeLeft(duration * 60);

    localStorage.setItem("plantGrowth", "0");
    setPhase("running");

  };

  // pause / resume / complete
  const handlePause = async () => {
    await pauseSession(session.id, duration * 60 - timeLeft);
    setPaused(true);
    setPhase("paused");
  };

  const handleResume = async () => {
    await resumeSession(session.id);
    setPhase("running");
  };

const handleReset = () => {
  if (window.confirm("Restart your focus session?")) {
    // Reset timer
    setTimeLeft(duration * 60);
    setPhase("running");
    setPaused(false);
    setBreaksTaken(0);

    //Play restart sound
    const restartSound = new Audio("/sounds/restart.mp3");
    restartSound.volume = 0.7;
    restartSound.play().catch(() => console.warn("Audio play blocked"));

    //Show confirmation toast
    toast.info("Focus timer restarted 🔄", {
      position: "bottom-center",
      autoClose: 2000,
      hideProgressBar: true,
      style: { background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: "#000000ff", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "12px", textAlign: "center", },
    });
  }
};


  const handleComplete = async () => {
    await completeSession(session.id, duration * 60);
    
    let growthScore = 0;
    
    if (!paused && breaksTaken === 0) {
      growthScore = 3; 
    
    } else if (breaksTaken === 1 && !paused) {
      growthScore = 2; 
    
    } else if (breaksTaken > 1 || paused) {
      growthScore = 1; 

    } else {
      growthScore = 0; 
}

localStorage.setItem("plantGrowth", growthScore.toString());
    setPhase("done");
  };

  return (
    <MainLayout>
      <div className="focus-page">
        <div className="focus-header">
          <h2>Start Your Focus Mode</h2>
          {phase === "initial" && (
            <button className="start-btn" onClick={handleStartNew}>
              Start New
            </button>
          )}
        </div>

        {/* SETUP */}
        {phase === "setup" && (
          <div className="focus-setup-card">
            <h3>Create Focus Session</h3>
            <input
              type="text"
              placeholder="Session Title (e.g., Finalize Presentation)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              min={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
            <button className="confirm-btn" onClick={handleConfirmStart}> Start Focus </button>
            <button className="back-btn" onClick={() => setPhase("initial")}> ← Back </button>
          </div>
        )}

        {/* TIMER VIEW */}
        {(phase === "running" || phase === "paused" || phase === "done" || phase === "break") && (
          <div
            className={`focus-timer-card ${phase === "break" ? "break" : ""}`}>

            <h3>{phase === "break"? "Take a Short Break ☕": title || "Focus Session"}</h3>

            <h1 className="timer-display">{formatTime(timeLeft)}</h1>

            {phase === "break" && (
              <p style={{ fontSize: "18px", marginBottom: "25px",}}> Relax your mind — stretch, drink water, or look away from the screen</p>
            )}

            <div className="timer-buttons">
              {phase === "running" && (
                <>
                  <button className="pause-btn" onClick={handlePause}>
                    Pause
                  </button>
                  <button className="break-btn" onClick={handleBreak}>
                    Break
                  </button>
                  <button className="reset-btn" onClick={handleReset}>
                    ⟳
                  </button>
                </>
              )}

              {phase === "paused" && (
                <>
                  <button className="resume-btn" onClick={handleResume}>
                    Resume
                  </button>
                  <button className="reset-btn" onClick={handleComplete}>
                    ⟳
                  </button>
                </>
              )}

              {phase === "done" && (
                <p className="done-message">✅ Session Completed!</p>
              )}
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="bottom-center" autoClose={3000} hideProgressBar={true} />
    </MainLayout>
  );
}
