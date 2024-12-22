import { createContext } from "react";
import { User } from "firebase/auth";

export const AuthContext = createContext<{
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}>({ user: null, login: () => new Promise(() => {}), logout: () => {} });
