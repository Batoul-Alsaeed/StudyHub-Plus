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
      <main style={{ flex: 1, padding: "20px", backgroundColor: "#f5f2ec", marginLeft: "290px", minHeight: "100vh", overflow: "auto", }}>
        {children}
      </main>
    </div>
  );
}
