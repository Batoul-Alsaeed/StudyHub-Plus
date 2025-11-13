import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "./contexts/AuthContext";
import { GoalProvider } from "./contexts/GoalContext";



createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
  <AuthProvider>
    <GoalProvider>
      <App />
    </GoalProvider>
  </AuthProvider>
  </BrowserRouter>,
)
