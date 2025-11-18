import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login"; 
import Register from "./pages/Register"; 
import Challenges from "./pages/Challenges";
import ChallengeDetails from "./pages/ChallengeDetails";
import Dashboard from "./pages/Dashboard";
import CreateGoal from "./pages/CreateGoal";
import Focuestime from "./pages/FocusTime";
import LandingPage from "./pages/LandingPage";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/challenges" element={<Challenges />} />
      <Route path="/challenges/:id" element={<ChallengeDetails />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/creategoal" element={<CreateGoal />} />
      <Route path="/focuestime" element={<Focuestime />} />
      <Route path="/landing" element={<LandingPage />} />


    </Routes>
  );
}
