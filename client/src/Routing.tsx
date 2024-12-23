import { Route, Routes, useNavigate } from "react-router-dom";
import { ReactNode, useEffect } from "react";
import { useAuthContext } from "./state/use-auth-context.tsx";
import { Typography } from "@mui/material";
import ChatPage from "./pages/Chat.tsx";
import LoginPage from "./pages/Login.tsx";

const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/pdf-rag-chatbot/login");
    }
  }, [navigate, user]);

  return <>{children}</>;
};

const Routing = () => {
  return (
    <Routes>
      <Route
        path="/pdf-rag-chatbot"
        element={
          <AuthenticatedRoute>
            <ChatPage />
          </AuthenticatedRoute>
        }
      />
      <Route path="/pdf-rag-chatbot/login" element={<LoginPage />} />
      <Route
        path="*"
        element={<Typography variant="h4">Page Not Found</Typography>}
      />
    </Routes>
  );
};
export default Routing;
