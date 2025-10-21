import React, { useState } from "react";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../css/Challenges.css";

Modal.setAppElement("#root");

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (challenge: any) => void;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    if (!title || !description || !startDate || !endDate) {
      alert("Please fill in all fields.");
      return;
    }

    const newChallenge = {
      title,
      description,
      difficulty,
      start_date: startDate,
      end_date: endDate,
    };

    onSave(newChallenge);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
      resetForm();
    }, 2000);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDifficulty("Easy");
    setStartDate(new Date());
    setEndDate(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="challenge-modal"
      overlayClassName="challenge-overlay"
    >
      <h2 style={{ textAlign: "center", color: "#001b44", marginBottom: "15px" }}>
        Create New Challenge
      </h2>

      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter challenge title"
        />
      </div>

      <div className="form-group">
        <label>Description / Requirements</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the challenge requirements"
        />
      </div>

      <div className="form-group">
        <label>Difficulty Level</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="Easy">🟢 Easy</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Hard">🔴 Hard</option>
        </select>
      </div>

      <div className="form-group">
        <label>Start Date</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          className="date-input"
          dateFormat="yyyy-MM-dd"
        />
      </div>

      <div className="form-group">
        <label>End Date</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          className="date-input"
          dateFormat="yyyy-MM-dd"
        />
      </div>

      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="save-btn" onClick={handleSave}>
          Save
        </button>
      </div>

      {success && <p className="success">✅ Challenge Created Successfully!</p>}
    </Modal>
  );
};

export default ChallengeModal;
