import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

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

// Specific user accounts
const ADMIN_USER: AuthUser = {
  id: 'admin-id',
  email: 'hello@earney.in',
  name: 'Admin User',
  role: UserRole.ADMIN
};

const EDITOR_USER: AuthUser = {
  id: 'editor-id',
  email: 'earneyworks@gmail.com',
  name: 'Editor User',
  role: UserRole.EDITOR
};

// Local storage key for user data
const USER_STORAGE_KEY = 'earney_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  // Check for stored user on initial load
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
          console.log('User loaded from storage');
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Helper to store user in localStorage
  const storeUser = (user: AuthUser | null) => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error storing user:', error);
    }
  };

  // Update currentUser and store in localStorage
  const updateUser = (user: AuthUser | null) => {
    setCurrentUser(user);
    storeUser(user);
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for:", email);
      setIsLoading(true);
      
      // Specific predefined users
      if (email === 'hello@earney.in' && password === 'Lokkav@0321$') {
        console.log("Admin login successful");
        updateUser(ADMIN_USER);
        setAuthError(null);
        toast({
          title: "Login Successful",
          description: "Welcome, Admin!"
        });
        return;
      } else if (email === 'earneyworks@gmail.com' && password === 'Earneypro@123') {
        console.log("Editor login successful");
        updateUser(EDITOR_USER);
        setAuthError(null);
        toast({
          title: "Login Successful",
          description: "Welcome, Editor!"
        });
        return;
      }
      
      // If not a predefined user, authentication fails
      throw new Error("Invalid email or password");
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(error instanceof Error ? error : new Error(error.message || "Login failed"));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log("Logging out user");
      setIsLoading(true);
      updateUser(null);
      setAuthError(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      setAuthError(error instanceof Error ? error : new Error('Logout failed'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string, role: UserRole) => {
    try {
      console.log("Registration is disabled");
      throw new Error("Registration is not allowed. Please use the provided login credentials.");
    } catch (error: any) {
      console.error("Registration error:", error);
      setAuthError(error instanceof Error ? error : new Error(error.message || "Registration failed"));
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
