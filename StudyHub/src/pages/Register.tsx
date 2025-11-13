import { useState } from 'react';
import '../css/Login.css';
import illustration from '../assets/images/Register Image.png';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "../contexts/AuthContext";

const API_URL = "http://127.0.0.1:8000";


function Register() {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();



  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      setLoading(false);


      if (response.ok) {
        alert(`Welcome, ${data.name}! Registration successful.`);
        setName('');
        setEmail('');
        setPassword('');
        setUser({ id: data.id, name: data.name, email: data.email });
        navigate('/dashboard'); // redirect to dashboard
      } else {
        setError(data.detail || data.message || 'Registration failed.');
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError('Unable to connect to the server.');
      setLoading(false);

    }
  };

  return (
    <div className="login-wrapper">
      {/* Left side - Form */}
      <div className="login-left">
        <h1>Register</h1>
        <p className="subtitle">Start your learning journey</p>

        <form onSubmit={handleRegister}>
          <input type="text" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full Name" />
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" />
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button type="submit" className="login-btn">Register</button>
        </form>

        <div className="register-section">
          <div className="divider">
            <span className="line"></span>
            <p>Already a Member?</p>
            <span className="line"></span>
          </div>

          <div className="register-link">
            <Link to="/">Login</Link>
          </div>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="login-right">
        <img src={illustration} alt="Study illustration" />
      </div>
    </div>
  );
}

export default Register;