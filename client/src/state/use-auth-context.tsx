import { useContext } from "react";
import { AuthContext } from "./auth-context.tsx";

export const useAuthContext = () => useContext(AuthContext);
