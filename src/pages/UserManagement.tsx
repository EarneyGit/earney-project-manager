import React, { useState, useEffect } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import * as api from "@/services/api";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, UserPlus, Copy, CheckCircle2, Users, ShieldCheck, Pencil, Wallet, User } from "lucide-react";

interface CreatedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface DBUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
}

export default function UserManagement() {
  const { isAdmin, register } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [monthlySalary, setMonthlySalary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [usersList, setUsersList] = useState<DBUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.fetchUsersByRole("");
      setUsersList(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

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

      setCreatedUser({ name: name.trim(), email: email.trim(), password, role });
      setName("");
      setEmail("");
      setPassword("");
      setMonthlySalary("");
      setRole(UserRole.EMPLOYEE);
      toast({ title: "User Created", description: `${name} has been successfully created.` });
      
      // Refresh user list
      loadUsers();
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

  const RoleBadge = ({ role }: { role: string }) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-black text-white hover:bg-black/80 font-normal px-2">Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-normal px-2 border-0">Manager</Badge>;
      case "employee":
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-normal px-2 border-0">Employee</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-gray-500" />
            User Management
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Create accounts and share login details with your team members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Create User Form */}
        <div className="lg:col-span-4">
          <Card className="shadow-sm border-gray-200 sticky top-6">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                <UserPlus className="h-5 w-5 text-gray-500" />
                Create New User
              </CardTitle>
              <CardDescription className="text-xs">
                Fill in the details below. You will see the login credentials after creation.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-user-name" className="text-xs font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="new-user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    disabled={isLoading}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-user-email" className="text-xs font-medium text-gray-700">Email Address</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    disabled={isLoading}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-user-password" className="text-xs font-medium text-gray-700">Password</Label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[10px] text-blue-600 hover:underline font-medium"
                      disabled={isLoading}
                    >
                      Generate Random
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
                      className="pr-9 h-9 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5 text-gray-400" /> : <Eye className="h-3.5 w-3.5 text-gray-400" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isLoading}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>
                        <div className="flex items-center gap-2 text-sm">
                          <ShieldCheck className="h-4 w-4 text-black" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value={UserRole.MANAGER}>
                        <div className="flex items-center gap-2 text-sm">
                          <Pencil className="h-4 w-4 text-blue-600" />
                          Manager
                        </div>
                      </SelectItem>
                      <SelectItem value={UserRole.EMPLOYEE}>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-gray-500" />
                          Employee
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 pt-4 mt-2">
                  <Label htmlFor="new-user-salary" className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <Wallet className="h-3.5 w-3.5 text-violet-600" />
                    Monthly Salary (₹)
                  </Label>
                  <Input
                    id="new-user-salary"
                    type="number"
                    min="0"
                    step="500"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value)}
                    placeholder="e.g. 25000"
                    disabled={isLoading}
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-gray-400 leading-tight">Only admins can see this. Used for P&L.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white mt-2 h-9 text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating User..." : "Create User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Users List */}
        <div className="lg:col-span-8">
          <Card className="shadow-sm border-gray-200 h-[calc(100vh-140px)] flex flex-col">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 px-6 flex-shrink-0">
              <CardTitle className="text-lg text-gray-800">Team Members</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingUsers ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black" />
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No users found.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {usersList.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                            <User className="h-5 w-5 opacity-50" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credentials Modal */}
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
            <div className="bg-gray-50 rounded-lg p-3 space-y-3 border border-gray-200">
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
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
                <span className="text-xs text-gray-500 font-medium">Role: <span className="uppercase">{createdUser?.role}</span></span>
                <Button variant="outline" size="sm" onClick={copyAll} className="h-7 text-xs bg-white">
                  {copiedField === "all" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" /> Copied All</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy All Details</>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setCreatedUser(null)} className="bg-black text-white">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredentialRow({ label, value, onCopy, copied, mono = false }: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={value}
          className={`h-8 text-xs bg-white ${mono ? "font-mono" : ""}`}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={onCopy}
          className="h-8 w-8 shrink-0 bg-white"
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
        </Button>
      </div>
    </div>
  );
}
