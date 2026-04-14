import React, { useState, useEffect } from "react";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import { useProjects } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchUsersByRole, fetchProjectServices, createProjectService,
  updateProjectService, deleteProjectService,
} from "@/services/api";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Manager { id: string; name: string; }

interface ServiceRow {
  id?: string;
  name: string;
  description: string;
  clientType: "one_time" | "ongoing";
  frequency: "daily" | "weekly" | "monthly" | "custom";
  customDays: number;
  deliverableCount: number;
  isNew?: boolean;
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
}

const todayStr = () => new Date().toISOString().split("T")[0];

const emptyService = (): ServiceRow => ({
  name: "",
  description: "",
  clientType: "ongoing",
  frequency: "monthly",
  customDays: 14,
  deliverableCount: 1,
  isNew: true,
});

const emptyForm = (): Omit<Project, "id"> => ({
  name: "",
  clientName: "",
  startTime: todayStr(),
  assignedTo: [],
  status: ProjectStatus.NOT_STARTED,
  priority: ProjectPriority.MEDIUM,
  deadline: todayStr(),
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
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [savingServices, setSavingServices] = useState(false);

  // Load managers + existing services
  useEffect(() => {
    if (open && isAdmin) {
      setLoadingManagers(true);
      fetchUsersByRole("manager")
        .then(setManagers)
        .finally(() => setLoadingManagers(false));
    }
  }, [open, isAdmin]);

  useEffect(() => {
    if (editingProject) {
      const toDateStr = (v: string | null | undefined) => {
        if (!v) return todayStr();
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        try { return new Date(v).toISOString().split("T")[0]; } catch { return todayStr(); }
      };
      setFormData({
        name: editingProject.name,
        clientName: editingProject.clientName || "",
        startTime: toDateStr(editingProject.startTime),
        assignedTo: Array.isArray(editingProject.assignedTo) ? editingProject.assignedTo : [],
        status: editingProject.status,
        priority: editingProject.priority,
        deadline: toDateStr(editingProject.deadline),
        budget: editingProject.budget || 0,
        advancePayment: editingProject.advancePayment || 0,
        partialPayments: editingProject.partialPayments || 0,
        pendingPayment: editingProject.pendingPayment || 0,
        managerId: editingProject.managerId || null,
        managerName: editingProject.managerName || null,
      });

      // Load existing services
      fetchProjectServices(editingProject.id).then((svcs) => {
        setServices(svcs.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description || "",
          clientType: s.clientType || "ongoing",
          frequency: s.frequency || "monthly",
          customDays: s.customDays || 14,
          deliverableCount: s.deliverableCount || 1,
        })));
      });
    } else {
      setFormData(emptyForm());
      setServices([]);
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleManagerChange = (managerId: string) => {
    const manager = managers.find((m) => m.id === managerId);
    setFormData((prev) => ({
      ...prev,
      managerId: managerId === "none" ? null : managerId,
      managerName: manager?.name || null,
    }));
  };

  const updateServiceField = (idx: number, field: keyof ServiceRow, value: any) => {
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addService = () => setServices((prev) => [...prev, emptyService()]);
  const removeService = (idx: number) => setServices((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
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

    let savedProject: Project;
    if (editingProject) {
      await updateProject(editingProject.id, payload);
      savedProject = { ...editingProject, ...payload };
      toast({ title: "Project Updated", description: `"${payload.name}" has been updated.` });
    } else {
      savedProject = await addProject(payload);
      toast({ title: "Project Created", description: `"${payload.name}" has been created.` });
    }

    // Save services if any
    if (services.length > 0 && savedProject?.id) {
      setSavingServices(true);
      try {
        for (const svc of services) {
          if (!svc.name.trim()) continue;
          const svcPayload = {
            projectId: savedProject.id,
            name: svc.name,
            description: svc.description || null,
            clientType: svc.clientType,
            frequency: svc.frequency,
            customDays: svc.frequency === "custom" ? svc.customDays : null,
            deliverableCount: svc.deliverableCount,
          };
          if (svc.id) {
            await updateProjectService(svc.id, svcPayload);
          } else {
            await createProjectService(svcPayload);
          }
        }
      } catch (e) {
        console.error("Error saving services:", e);
      } finally {
        setSavingServices(false);
      }
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
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

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start">Start Date</Label>
              <Input id="proj-start" name="startTime" type="date"
                value={formData.startTime?.split("T")[0] || todayStr()}
                onChange={handleDateChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-deadline">Deadline</Label>
              <Input id="proj-deadline" name="deadline" type="date"
                value={formData.deadline?.split("T")[0] || todayStr()}
                onChange={handleDateChange} required />
            </div>
          </div>

          {/* Assign Manager */}
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Assign Manager</Label>
              <Select value={formData.managerId || "none"} onValueChange={handleManagerChange} disabled={loadingManagers}>
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
            </div>
          )}

          {/* Financial Fields */}
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

          {/* ── Services & Deliverables ─────────────────────────── */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Services & Deliverables</p>
                <p className="text-xs text-gray-400">Define what services you'll deliver to this client and the expected cadence.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addService} className="gap-1 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Service
              </Button>
            </div>

            {services.length === 0 && (
              <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 px-4 py-4 text-center">
                <p className="text-xs text-gray-400">No services added yet. Click "Add Service" to define client deliverables.</p>
              </div>
            )}

            {services.map((svc, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Service {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Service name */}
                <div className="space-y-1">
                  <Label className="text-xs">Service Name *</Label>
                  <Input
                    value={svc.name}
                    onChange={(e) => updateServiceField(idx, "name", e.target.value)}
                    placeholder="e.g. Social Media Posts, SEO Audit, Logo Design"
                    className="h-9 text-sm"
                  />
                </div>

                {/* Client type */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Client Type</Label>
                    <Select
                      value={svc.clientType}
                      onValueChange={(v) => updateServiceField(idx, "clientType", v)}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ongoing">🔁 Ongoing</SelectItem>
                        <SelectItem value="one_time">1️⃣ One-Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delivery Cadence</Label>
                    <Select
                      value={svc.frequency}
                      onValueChange={(v) => updateServiceField(idx, "frequency", v)}
                      disabled={svc.clientType === "one_time"}
                    >
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Deliverable count + custom days */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Deliverables per {svc.frequency === "custom" ? `${svc.customDays} days` : svc.frequency}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={svc.deliverableCount}
                      onChange={(e) => updateServiceField(idx, "deliverableCount", parseInt(e.target.value) || 1)}
                      className="h-9 text-sm"
                    />
                  </div>
                  {svc.frequency === "custom" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Every N days</Label>
                      <Input
                        type="number"
                        min="1"
                        value={svc.customDays}
                        onChange={(e) => updateServiceField(idx, "customDays", parseInt(e.target.value) || 1)}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Summary */}
                {svc.name && (
                  <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1.5">
                    📋 {svc.clientType === "one_time"
                      ? `One-time delivery of ${svc.deliverableCount} ${svc.name}`
                      : `${svc.deliverableCount} ${svc.name} every ${
                          svc.frequency === "daily" ? "day" :
                          svc.frequency === "weekly" ? "week" :
                          svc.frequency === "monthly" ? "month" :
                          `${svc.customDays} days`
                        }`
                    }
                  </p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800" disabled={savingServices}>
              {savingServices ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</> :
                editingProject ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
