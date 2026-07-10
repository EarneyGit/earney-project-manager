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
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto bg-white p-6">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-gray-900">{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Basic Details & Financials */}
            <div className="space-y-5">
              <div className="space-y-4">
                {/* Project Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="proj-name" className="text-sm font-medium text-gray-700">Project Name *</Label>
                  <Input id="proj-name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Website Redesign" required className="h-9" />
                </div>

                {/* Client Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="proj-client" className="text-sm font-medium text-gray-700">Client Name *</Label>
                  <Input id="proj-client" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="e.g. Acme Corp" required className="h-9" />
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData((p) => ({ ...p, status: v as ProjectStatus }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ProjectStatus.NOT_STARTED}>Not Started</SelectItem>
                        <SelectItem value={ProjectStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData((p) => ({ ...p, priority: v as ProjectPriority }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                    <Label htmlFor="proj-start" className="text-sm font-medium text-gray-700">Start Date</Label>
                    <Input id="proj-start" name="startTime" type="date"
                      value={formData.startTime?.split("T")[0] || todayStr()}
                      onChange={handleDateChange} required className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="proj-deadline" className="text-sm font-medium text-gray-700">Deadline</Label>
                    <Input id="proj-deadline" name="deadline" type="date"
                      value={formData.deadline?.split("T")[0] || todayStr()}
                      onChange={handleDateChange} required className="h-9" />
                  </div>
                </div>

                {/* Assign Manager */}
                {isAdmin && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Assign Manager</Label>
                    <Select value={formData.managerId || "none"} onValueChange={handleManagerChange} disabled={loadingManagers}>
                      <SelectTrigger className="h-9">
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
              </div>

              {/* Financial Fields */}
              {isAdmin && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Financial Details</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="proj-budget" className="text-xs text-gray-600 uppercase tracking-wider">Budget (₹)</Label>
                      <Input id="proj-budget" name="budget" type="number" min="0" step="0.01" value={formData.budget} onChange={handleChange} className="h-9 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proj-advance" className="text-xs text-gray-600 uppercase tracking-wider">Advance (₹)</Label>
                      <Input id="proj-advance" name="advancePayment" type="number" min="0" step="0.01" value={formData.advancePayment} onChange={handleChange} className="h-9 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proj-partial" className="text-xs text-gray-600 uppercase tracking-wider">Partial (₹)</Label>
                      <Input id="proj-partial" name="partialPayments" type="number" min="0" step="0.01" value={formData.partialPayments} onChange={handleChange} className="h-9 font-mono text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Pending Balance</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      ₹{calcPending(
                        typeof formData.budget === "number" ? formData.budget : 0,
                        typeof formData.advancePayment === "number" ? formData.advancePayment : 0,
                        typeof formData.partialPayments === "number" ? formData.partialPayments : 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Services & Deliverables */}
            <div className="space-y-4 lg:border-l lg:border-gray-100 lg:pl-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Services & Deliverables</p>
                  <p className="text-xs text-gray-500 mt-0.5">Define deliverables and delivery cadence.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addService} className="h-8 gap-1 shadow-sm border-gray-200 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Service
                </Button>
              </div>

              {services.length === 0 ? (
                <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center flex flex-col items-center justify-center">
                  <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-2">
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 max-w-[200px]">No services added yet. Click "Add Service" to define client deliverables.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {services.map((svc, idx) => (
                    <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 shadow-sm hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">{idx + 1}</span>
                          Service
                        </p>
                        <button
                          type="button"
                          onClick={() => removeService(idx)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Service name */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-700">Service Name *</Label>
                        <Input
                          value={svc.name}
                          onChange={(e) => updateServiceField(idx, "name", e.target.value)}
                          placeholder="e.g. Social Media Posts, SEO Audit"
                          className="h-9 text-sm"
                        />
                      </div>

                      {/* Client type & Cadence */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-700">Client Type</Label>
                          <Select
                            value={svc.clientType}
                            onValueChange={(v) => updateServiceField(idx, "clientType", v)}
                          >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ongoing" className="text-xs">🔁 Ongoing</SelectItem>
                              <SelectItem value="one_time" className="text-xs">1️⃣ One-Time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-700">Delivery Cadence</Label>
                          <Select
                            value={svc.frequency}
                            onValueChange={(v) => updateServiceField(idx, "frequency", v)}
                            disabled={svc.clientType === "one_time"}
                          >
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                              <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                              <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                              <SelectItem value="custom" className="text-xs">Custom Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Deliverable count + custom days */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-700 truncate pr-2">
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
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-700">Every N days</Label>
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
                        <div className="bg-indigo-50/50 rounded-md px-3 py-2 border border-indigo-100 flex items-start gap-2 mt-2">
                          <span className="text-[10px] mt-0.5">📋</span>
                          <p className="text-[11px] font-medium text-indigo-700 leading-tight">
                            {svc.clientType === "one_time"
                              ? `One-time delivery of ${svc.deliverableCount} ${svc.name}`
                              : `${svc.deliverableCount} ${svc.name} every ${
                                  svc.frequency === "daily" ? "day" :
                                  svc.frequency === "weekly" ? "week" :
                                  svc.frequency === "monthly" ? "month" :
                                  `${svc.customDays} days`
                                }`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-5 mt-6 border-t border-gray-100 flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-6">Cancel</Button>
            <Button type="submit" className="h-10 px-8 bg-black text-white hover:bg-gray-800 shadow-sm" disabled={savingServices}>
              {savingServices ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> :
                editingProject ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
