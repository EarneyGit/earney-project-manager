
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!email || !password) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!", description: "Logged in successfully." });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Invalid credentials";
      setLoginError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
        <p className="text-gray-500 text-sm mt-1">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {loginError && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{loginError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            autoComplete="email"
            className="h-11 border-gray-200 focus:border-gray-400 bg-gray-50 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="h-11 pr-11 border-gray-200 focus:border-gray-400 bg-gray-50 rounded-xl"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium text-sm mt-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
          ) : "Sign In"}
        </Button>

        <p className="text-center text-xs text-gray-400 pt-1">
          Contact your administrator to get an account
        </p>
      </form>
    </div>
  );
}
