import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import SyncStatusBar from "./SyncStatusBar";

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-6 bg-background">
        <Outlet />
      </main>
      <SyncStatusBar />
    </div>
  );
}
