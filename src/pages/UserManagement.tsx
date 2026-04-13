
import React, { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, EyeOff, UserPlus, Copy, CheckCircle2, Users, ShieldCheck, Pencil } from "lucide-react";

interface CreatedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export default function UserManagement() {
  const { isAdmin, register } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Access Restricted</h2>
          <p className="text-gray-400 mt-2">Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "All fields are required." });
      return;
    }

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Validation Error", description: "Password must be at least 6 characters." });
      return;
    }

    setIsLoading(true);
    try {
      await register(email.trim(), password, name.trim(), role);
      // Save user details so admin can share them
      setCreatedUser({ name: name.trim(), email: email.trim(), password, role });
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole(UserRole.EMPLOYEE);
      toast({ title: "User Created", description: `${name} has been successfully created.` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create user.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const copyAll = () => {
    if (!createdUser) return;
    const text = `Login Details for ${createdUser.name}\n\nURL: ${window.location.origin}/auth\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\nRole: ${createdUser.role}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField("all");
      setTimeout(() => setCopiedField(null), 2000);
      toast({ title: "Copied!", description: "Login details copied to clipboard." });
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          User Management
        </h1>
        <p className="text-gray-500 mt-1">Create accounts and share login details with your team members.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
          <CardDescription>
            Fill in the details below. You will see the login credentials after creation to share with the user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Full Name</Label>
              <Input
                id="new-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email Address</Label>
              <Input
                id="new-user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-user-password">Password</Label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-xs text-blue-600 hover:underline"
                  disabled={isLoading}
                >
                  Generate random password
                </button>
              </div>
              <div className="relative">
                <Input
                  id="new-user-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  disabled={isLoading}
                  className="pr-10 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-black" />
                      Admin — Full access &amp; financials
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.MANAGER}>
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-blue-600" />
                      Manager — Manages projects &amp; assigns tasks
                    </div>
                  </SelectItem>
                  <SelectItem value={UserRole.EMPLOYEE}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      Employee — Views &amp; updates assigned tasks
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Creating User..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Credentials Modal — appears after successful creation */}
      <Dialog open={!!createdUser} onOpenChange={() => setCreatedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              Share these login details with <strong>{createdUser?.name}</strong>. Make sure to save the password — it won't be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Login URL */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              <CredentialRow
                label="Login URL"
                value={`${window.location.origin}/auth`}
                onCopy={() => copyToClipboard(`${window.location.origin}/auth`, "url")}
                copied={copiedField === "url"}
              />
              <CredentialRow
                label="Email"
                value={createdUser?.email || ""}
                onCopy={() => copyToClipboard(createdUser?.email || "", "email")}
                copied={copiedField === "email"}
              />
              <CredentialRow
                label="Password"
                value={createdUser?.password || ""}
                onCopy={() => copyToClipboard(createdUser?.password || "", "password")}
                copied={copiedField === "password"}
                mono
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Role</span>
                <Badge variant={createdUser?.role === UserRole.ADMIN ? "default" : "outline"}>
                  {createdUser?.role}
                </Badge>
              </div>
            </div>

            <Button onClick={copyAll} variant="outline" className="w-full gap-2">
              {copiedField === "all" ? (
                <><CheckCircle2 className="h-4 w-4 text-green-600" /> Copied!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copy All Details</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for credential display row
function CredentialRow({
  label,
  value,
  onCopy,
  copied,
  mono = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className={`text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        onClick={onCopy}
      >
        {copied ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </Button>
    </div>
  );
}
