import React, { useState, useEffect } from "react";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import { useProjects } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDateForInput } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUsersByRole } from "@/services/api";

interface Manager { id: string; name: string; }

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
}

const emptyForm = (): Omit<Project, "id"> => ({
  name: "",
  clientName: "",
  startTime: new Date().toISOString(),
  assignedTo: [],
  status: ProjectStatus.NOT_STARTED,
  priority: ProjectPriority.MEDIUM,
  deadline: new Date().toISOString(),
  budget: 0,
  advancePayment: 0,
  partialPayments: 0,
  pendingPayment: 0,
  managerId: null,
  managerName: null,
});

export default function ProjectForm({ open, onOpenChange, editingProject }: ProjectFormProps) {
  const { addProject, updateProject } = useProjects();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Omit<Project, "id">>(emptyForm());
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // Load managers list when dialog opens
  useEffect(() => {
    if (open && isAdmin) {
      setLoadingManagers(true);
      fetchUsersByRole("manager")
        .then(setManagers)
        .finally(() => setLoadingManagers(false));
    }
  }, [open, isAdmin]);

  // Reset/populate form
  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        clientName: editingProject.clientName || "",
        startTime: editingProject.startTime,
        assignedTo: Array.isArray(editingProject.assignedTo) ? editingProject.assignedTo : [],
        status: editingProject.status,
        priority: editingProject.priority,
        deadline: editingProject.deadline,
        budget: editingProject.budget || 0,
        advancePayment: editingProject.advancePayment || 0,
        partialPayments: editingProject.partialPayments || 0,
        pendingPayment: editingProject.pendingPayment || 0,
        managerId: editingProject.managerId || null,
        managerName: editingProject.managerName || null,
      });
    } else {
      setFormData(emptyForm());
    }
  }, [editingProject, open]);

  const calcPending = (budget: number, advance: number, partial: number) =>
    Math.max(0, budget - (advance + partial));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumber = ["budget", "advancePayment", "partialPayments"].includes(name);
    const numVal = isNumber ? parseFloat(value) || 0 : value;

    setFormData((prev) => {
      const next: any = { ...prev, [name]: numVal };
      if (isNumber) {
        const b = name === "budget" ? numVal as number : prev.budget || 0;
        const a = name === "advancePayment" ? numVal as number : prev.advancePayment || 0;
        const p = name === "partialPayments" ? numVal as number : (typeof prev.partialPayments === "number" ? prev.partialPayments : 0);
        next.pendingPayment = calcPending(b, a, p);
      }
      return next;
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: new Date(value).toISOString() }));
  };

  const handleManagerChange = (managerId: string) => {
    const manager = managers.find((m) => m.id === managerId);
    setFormData((prev) => ({
      ...prev,
      managerId: managerId === "none" ? null : managerId,
      managerName: manager?.name || null,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Project Name is required." });
      return;
    }
    if (!formData.clientName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Client Name is required." });
      return;
    }

    const budget = typeof formData.budget === "number" ? formData.budget : parseFloat(String(formData.budget)) || 0;
    const advance = typeof formData.advancePayment === "number" ? formData.advancePayment : parseFloat(String(formData.advancePayment)) || 0;
    const partial = typeof formData.partialPayments === "number" ? formData.partialPayments : parseFloat(String(formData.partialPayments)) || 0;

    const payload = {
      ...formData,
      assignedTo: Array.isArray(formData.assignedTo) ? formData.assignedTo : [],
      budget,
      advancePayment: advance,
      partialPayments: partial,
      pendingPayment: calcPending(budget, advance, partial),
    };

    if (editingProject) {
      updateProject(editingProject.id, payload);
      toast({ title: "Project Updated", description: `"${payload.name}" has been updated.` });
    } else {
      addProject(payload);
      toast({ title: "Project Created", description: `"${payload.name}" has been created.` });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name *</Label>
            <Input id="proj-name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Website Redesign" required />
          </div>

          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-client">Client Name *</Label>
            <Input id="proj-client" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="e.g. Acme Corp" required />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v as ProjectStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectStatus.NOT_STARTED}>Not Started</SelectItem>
                <SelectItem value={ProjectStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(v) => setFormData((p) => ({ ...p, priority: v as ProjectPriority }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectPriority.LOW}>Low</SelectItem>
                <SelectItem value={ProjectPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={ProjectPriority.HIGH}>High</SelectItem>
                <SelectItem value={ProjectPriority.URGENT}>Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start">Start Date</Label>
              <Input id="proj-start" name="startTime" type="date" value={formatDateForInput(formData.startTime)} onChange={handleDateChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-deadline">Deadline</Label>
              <Input id="proj-deadline" name="deadline" type="date" value={formatDateForInput(formData.deadline)} onChange={handleDateChange} required />
            </div>
          </div>

          {/* Assign Manager — Admin only */}
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Assign Manager</Label>
              <Select
                value={formData.managerId || "none"}
                onValueChange={handleManagerChange}
                disabled={loadingManagers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingManagers ? "Loading managers…" : "Select a manager…"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Manager —</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {managers.length === 0 && !loadingManagers && (
                <p className="text-xs text-gray-400">
                  No managers found. Create manager accounts in Manage Users first.
                </p>
              )}
            </div>
          )}

          {/* Financial Fields — Admin only */}
          {isAdmin && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-gray-700">Financial Details</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-budget">Budget (₹)</Label>
                  <Input id="proj-budget" name="budget" type="number" min="0" step="0.01" value={formData.budget} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-advance">Advance (₹)</Label>
                  <Input id="proj-advance" name="advancePayment" type="number" min="0" step="0.01" value={formData.advancePayment} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-partial">Partial (₹)</Label>
                  <Input id="proj-partial" name="partialPayments" type="number" min="0" step="0.01" value={formData.partialPayments} onChange={handleChange} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Pending: ₹{calcPending(
                  typeof formData.budget === "number" ? formData.budget : 0,
                  typeof formData.advancePayment === "number" ? formData.advancePayment : 0,
                  typeof formData.partialPayments === "number" ? formData.partialPayments : 0,
                ).toLocaleString("en-IN")}
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-black text-white hover:bg-gray-800">
              {editingProject ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
