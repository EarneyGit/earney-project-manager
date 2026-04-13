import React, { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Company } from "@/types/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, MoreHorizontal, Pencil, Trash2, ArrowRight, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CompanyInitial({ name }: { name: string }) {
  const colors = [
    "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white text-2xl font-bold shadow-md`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function Companies() {
  const { companies, activeCompany, setActiveCompany, createCompany, updateCompany, deleteCompany } = useCompany();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access restricted to admins.</p>
      </div>
    );
  }

  const openCreate = () => {
    setFormData({ name: "", description: "" });
    setEditTarget(null);
    setShowCreate(true);
  };

  const openEdit = (company: Company) => {
    setFormData({ name: company.name, description: company.description || "" });
    setEditTarget(company);
    setShowCreate(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateCompany(editTarget.id, formData);
        toast({ title: "Company updated" });
      } else {
        const c = await createCompany(formData);
        toast({ title: "Company created", description: `"${c.name}" is ready.` });
      }
      setShowCreate(false);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to save company." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCompany(id);
      toast({ title: "Company deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete company." });
    } finally {
      setDeletingId(null);
    }
  };

  const enterDashboard = (company: Company) => {
    setActiveCompany(company);
    navigate("/dashboard");
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            My Companies
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your companies. Each company has its own projects, financials, and AI insights.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-black text-white hover:bg-gray-800 gap-2">
          <Plus className="h-4 w-4" /> New Company
        </Button>
      </div>

      {/* Company Grid */}
      {companies.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-gray-200 rounded-2xl">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">No companies yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first company to get started</p>
          <Button onClick={openCreate} className="mt-4 bg-black text-white hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-1" /> Create Company
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((company) => {
            const isActive = activeCompany?.id === company.id;
            return (
              <Card
                key={company.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg border-2 ${
                  isActive ? "border-black shadow-md" : "border-transparent"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black rounded-t-xl" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CompanyInitial name={company.name} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(company)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(company.id)}
                          disabled={deletingId === company.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingId === company.id ? "Deleting…" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    {company.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{company.description}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mt-1">
                    {isActive ? (
                      <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full font-medium">
                        Active Dashboard
                      </span>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => enterDashboard(company)}
                    variant={isActive ? "default" : "outline"}
                    className={`w-full mt-4 gap-2 ${isActive ? "bg-black text-white hover:bg-gray-800" : ""}`}
                    size="sm"
                  >
                    <Briefcase className="h-4 w-4" />
                    {isActive ? "View Dashboard" : "Open Dashboard"}
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Company" : "New Company"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Earney Technologies"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this company…"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-black text-white" disabled={saving}>
                {saving ? "Saving…" : editTarget ? "Update" : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
