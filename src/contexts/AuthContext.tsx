import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

// ─── User Roles ───────────────────────────────────────────────
export enum UserRole {
  ADMIN    = "admin",
  MANAGER  = "manager",
  EMPLOYEE = "employee"
}

// ─── Types ────────────────────────────────────────────────────
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
  /** @deprecated use isManager */
  isEditor: boolean;
  isLoading: boolean;
  authError: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helper: transform Supabase user → AuthUser ───────────────
const transformUser = async (user: User | null): Promise<AuthUser | null> => {
  if (!user) return null;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return {
      id: user.id,
      email: user.email || "",
      name: profile?.full_name || "",
      role: (profile?.role as UserRole) || UserRole.EMPLOYEE,
    };
  } catch {
    return {
      id: user.id,
      email: user.email || "",
      name: "",
      role: UserRole.EMPLOYEE,
    };
  }
};

// ─── Provider ─────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) {
          const authUser = await transformUser(session.user);
          setCurrentUser(authUser);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error : new Error("Failed to load session"));
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setIsLoading(true);
        try {
          const authUser = session ? await transformUser(session.user) : null;
          setCurrentUser(authUser);
          setAuthError(null);
        } catch (error) {
          setAuthError(error instanceof Error ? error : new Error("Auth state error"));
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const authUser = await transformUser(data.user);
      setCurrentUser(authUser);
      setAuthError(null);
    } catch (error: any) {
      setAuthError(error instanceof Error ? error : new Error(error.message || "Login failed"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setAuthError(null);
      toast({ title: "Logged out", description: "You have been successfully logged out" });
    } catch (error: any) {
      setAuthError(error instanceof Error ? error : new Error("Logout failed"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register (admin creates users — not self-registration)
  const register = async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, role } },
      });
      if (error) throw error;

      // Upsert profile immediately so role is set even if email confirmation is off
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: name,
          role,
        });
      }

      setAuthError(null);
    } catch (error: any) {
      setAuthError(error instanceof Error ? error : new Error(error.message || "Registration failed"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin:    currentUser?.role === UserRole.ADMIN,
    isManager:  currentUser?.role === UserRole.MANAGER,
    isEmployee: currentUser?.role === UserRole.EMPLOYEE,
    isEditor:   currentUser?.role === UserRole.MANAGER, // backwards compat
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

// ─── Hook ─────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
