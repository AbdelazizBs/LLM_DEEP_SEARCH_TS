import { AdminPage } from "./pages/AdminPage";
import { ChatPage } from "./pages/ChatPage";

export function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");

  return isAdmin ? <AdminPage /> : <ChatPage />;
}
