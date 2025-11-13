import { useState } from 'react';
import '../css/Login.css';
import illustration from '../assets/images/Login Image.png';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from "../contexts/AuthContext";

const API_URL = "https://studyhub-backend-81w7.onrender.com";

function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        alert('Welcome Back!');
        setUser({ id: data.id, name: data.user || data.name || "User", email: data.email });
        setError('');
        navigate('/dashboard'); // redirect to dashboard
      } else {
        setError(data.detail || data.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Unable to connect to the server.');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left side - Form */}
      <div className="login-left">
        <h1>Login</h1>
        <p className="subtitle">Continue your learning journey</p>

        <form onSubmit={handleLogin}>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="login-btn">Login</button>
        </form>

        <div className="register-section">
          <div className="divider">
            <span className="line"></span>
            <p>Not a Member?</p>
            <span className="line"></span>
          </div>

          <div className="register-link">
            <Link to="/register">Register</Link>
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

export default Login;