import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export enum UserRole {
  ADMIN    = "admin",
  MANAGER  = "manager",
  EMPLOYEE = "employee"
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isEditor: boolean;
  isLoading: boolean;
  authError: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------- helpers ----------

/** Built-in accounts (password checked at login time) */
const BUILTIN_ACCOUNTS: { email: string; password: string; user: AuthUser }[] = [
  {
    email: "admin@earney.com",
    password: "Admin@2026!",
    user: {
      id: "b1ceaf2c-0ce7-461c-a075-50854a8ab68d",
      email: "admin@earney.com",
      name: "Admin User",
      role: UserRole.ADMIN,
    },
  },
];

const STORAGE_KEY_USER = "earney_auth_user";
const STORAGE_KEY_ACCOUNTS = "earney_registered_accounts";

function getRegisteredAccounts(): { email: string; password: string; user: AuthUser }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredAccounts(accounts: { email: string; password: string; user: AuthUser }[]) {
  localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
}

function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------- provider ----------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check built-in accounts first
      const builtin = BUILTIN_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === normalizedEmail && a.password === password
      );

      if (builtin) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(builtin.user));
        setCurrentUser(builtin.user);
        setAuthError(null);
        return;
      }

      // Check registered accounts
      const registered = getRegisteredAccounts().find(
        (a) => a.email.toLowerCase() === normalizedEmail && a.password === password
      );

      if (registered) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(registered.user));
        setCurrentUser(registered.user);
        setAuthError(null);
        return;
      }

      throw new Error("Invalid email or password");
    } catch (error: any) {
      setAuthError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setCurrentUser(null);
    setAuthError(null);
    toast({ title: "Logged out", description: "You have been successfully logged out" });
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if already exists
      const allAccounts = [...BUILTIN_ACCOUNTS, ...getRegisteredAccounts()];
      if (allAccounts.some((a) => a.email.toLowerCase() === normalizedEmail)) {
        throw new Error("An account with this email already exists");
      }

      const newAccount = {
        email: normalizedEmail,
        password,
        user: { id: generateId(), email: normalizedEmail, name, role },
      };

      const accounts = getRegisteredAccounts();
      accounts.push(newAccount);
      saveRegisteredAccounts(accounts);
      setAuthError(null);
    } catch (error: any) {
      setAuthError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin:    currentUser?.role === UserRole.ADMIN,
    isManager:  currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN,
    isEmployee: currentUser?.role === UserRole.EMPLOYEE,
    isEditor:   currentUser?.role === UserRole.MANAGER || currentUser?.role === UserRole.ADMIN,
    isLoading,
    authError,
    login,
    logout,
    register,
  };

  if (isLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4 mx-auto"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
