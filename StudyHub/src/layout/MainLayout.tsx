import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import "../css/Sidebar.css";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "20px", backgroundColor: "#f9f8f7" }}>
        {children}
      </main>
    </div>
  );
}