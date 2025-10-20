import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login"; 
import Register from "./pages/Register"; 
import Challenges from "./pages/Challenges";
import Dashboard from "./pages/Dashboard";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/challenges" element={<Challenges />} />
      <Route path="/dashboard" element={<Dashboard />} />

    </Routes>
  );
}
