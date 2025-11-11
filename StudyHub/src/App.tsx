import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login"; 
import Register from "./pages/Register"; 
import Challenges from "./pages/Challenges";
import ChallengeDetails from "./pages/ChallengeDetails";
import Dashboard from "./pages/Dashboard";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/challenges" element={<Challenges />} />
      <Route path="/challenges/:id" element={<ChallengeDetails />} />
      <Route path="/dashboard" element={<Dashboard />} />

    </Routes>
  );
}

/*import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Challenges from "./pages/Challenges";
import ChallengeDetails from "./pages/ChallengeDetails";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layout/MainLayout";

export default function App() {
  return (
    <Routes>
      /* صفحات الدخول خارج الهيكل */
      /*<Route path="/" element={<Login />} />
      /*<Route path="/register" element={<Register />} />

      /* الصفحات الداخلية داخل MainLayout *
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/challenges/:id" element={<ChallengeDetails />} />
      </Route>
    </Routes>
  );
}*/