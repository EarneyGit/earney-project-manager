import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { authApi } from "@/services/api-client";

// Define user roles
export enum UserRole {
  ADMIN = "admin",
  EDITOR = "editor"
}

// User type definition
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Auth context type
interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  authError: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // On mount, check for token and fetch user
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage?.getItem(AUTH_TOKEN_KEY);
      if (token) {
        try {
          setIsLoading(true);
          const data = await authApi.getCurrentUser();
          setCurrentUser(data?.data?.user || null);
        } catch (error) {
          setCurrentUser(null);
          localStorage?.removeItem(AUTH_TOKEN_KEY);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const { data } = await authApi.login({ email, password });
      const { token, user } = data || {};
      console.log("token", data);
      await localStorage?.setItem(AUTH_TOKEN_KEY, token);
      setCurrentUser(user || null);
      toast({
        title: "Login Successful",
        description: `Welcome, ${user?.name || 'User'}!`
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error: any) {
      setAuthError(error instanceof Error ? error : new Error(error?.message || "Login failed"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setCurrentUser(null);
      await localStorage?.removeItem(AUTH_TOKEN_KEY);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error: any) {
      setAuthError(error instanceof Error ? error : new Error('Logout failed'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const response = await authApi.register({ email, password, name });
      const { token, user } = response || {};
      await localStorage?.setItem(AUTH_TOKEN_KEY, token);
      setCurrentUser(user || null);
      toast({
        title: "Registration Successful",
        description: "Your account has been created successfully!"
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error: any) {
      setAuthError(error instanceof Error ? error : new Error(error?.message || "Registration failed"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === UserRole.ADMIN,
    isEditor: currentUser?.role === UserRole.EDITOR,
    isLoading,
    authError,
    login,
    logout,
    register
  };

  console.log("AuthProvider rendering, authenticated:", !!currentUser, "loading:", isLoading);

  // Show loading indicator during initialization
  if (isLoading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4 mx-auto"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
