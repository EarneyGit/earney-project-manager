import React, { useState, useEffect } from "react";
import { Project, ProjectStatus, ProjectPriority } from "@/types/project";
import { useProjects } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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

// NOTE: This component uses the useProjects hook which now utilizes our projectService 
// with fresh Supabase clients to avoid schema cache issues

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
}

export default function ProjectForm({
  open,
  onOpenChange,
  editingProject,
}: ProjectFormProps) {
  const { addProject, updateProject } = useProjects();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Omit<Project, "id">>({
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
  });
  const [assigneeInput, setAssigneeInput] = useState("");

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        clientName: editingProject.clientName || "",
        startTime: editingProject.startTime,
        assignedTo: Array.isArray(editingProject.assignedTo) 
          ? editingProject.assignedTo 
          : [editingProject.assignedTo].filter(Boolean),
        status: editingProject.status,
        priority: editingProject.priority,
        deadline: editingProject.deadline,
        budget: editingProject.budget || 0,
        advancePayment: editingProject.advancePayment || 0,
        partialPayments: editingProject.partialPayments || 0,
      });
    } else {
      setFormData({
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
      });
    }
    setAssigneeInput("");
  }, [editingProject, open]);

  const calculatePendingPayment = (budget: number, advancePayment: number, partialPayments: number) => {
    return Math.max(0, budget - (advancePayment + partialPayments));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = name === 'budget' || name === 'advancePayment' || name === 'partialPayments' 
      ? parseFloat(value) || 0 
      : value;

    setFormData(prev => {
      const updates: any = { [name]: numValue };
      
      if (name === 'budget' || name === 'advancePayment' || name === 'partialPayments') {
        const budgetValue = name === 'budget' ? parseFloat(value) || 0 : (prev.budget || 0);
        const advanceValue = name === 'advancePayment' ? parseFloat(value) || 0 : (prev.advancePayment || 0);
        const partialPaymentsValue = prev.partialPayments;
        const partialValue = name === 'partialPayments' 
          ? parseFloat(value) || 0 
          : (typeof partialPaymentsValue === 'number' 
              ? partialPaymentsValue 
              : Array.isArray(partialPaymentsValue) 
                ? 0 
                : parseFloat(String(partialPaymentsValue)) || 0);
        
        const newPendingPayment = calculatePendingPayment(budgetValue, advanceValue, partialValue);
        updates.pendingPayment = newPendingPayment;
      }

      return { ...prev, ...updates };
    });
  };

  const handleDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const date = new Date(value);
    setFormData((prev) => ({ ...prev, [name]: date.toISOString() }));
  };

  const handlePriorityChange = (value: string) => {
    setFormData((prev) => ({ ...prev, priority: value as ProjectPriority }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value as ProjectStatus }));
  };

  const addAssignee = () => {
    if (assigneeInput.trim()) {
      const currentAssignedTo = Array.isArray(formData.assignedTo) 
        ? formData.assignedTo 
        : [];
        
      if (currentAssignedTo.length < 10) {
        setFormData((prev) => ({
          ...prev,
          assignedTo: [...currentAssignedTo, assigneeInput.trim()]
        }));
        setAssigneeInput("");
      } else {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Maximum 10 team members can be assigned"
        });
      }
    }
  };

  const removeAssignee = (index: number) => {
    const currentAssignedTo = Array.isArray(formData.assignedTo) 
      ? formData.assignedTo 
      : [];
      
    setFormData((prev) => ({
      ...prev,
      assignedTo: currentAssignedTo.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const assignedToArray = Array.isArray(formData.assignedTo) 
      ? formData.assignedTo 
      : [];
      
    if (assignedToArray.length < 2) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least 2 people must be assigned to the project"
      });
      return;
    }
    
    const budgetValue = typeof formData.budget === 'number' 
      ? formData.budget 
      : parseFloat(String(formData.budget)) || 0;
    const advancePaymentValue = typeof formData.advancePayment === 'number'
      ? formData.advancePayment
      : parseFloat(String(formData.advancePayment)) || 0;
    const partialPaymentsValue = typeof formData.partialPayments === 'number'
      ? formData.partialPayments
      : parseFloat(String(formData.partialPayments)) || 0;

    const pendingPayment = Math.max(0, budgetValue - (advancePaymentValue + partialPaymentsValue));
    
    const submittingFormData = {
      ...formData,
      clientName: formData.clientName,
      assignedTo: assignedToArray,
      budget: budgetValue,
      advancePayment: advancePaymentValue,
      partialPayments: partialPaymentsValue,
      pendingPayment: pendingPayment
    };
    
    if (!submittingFormData.clientName) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Client Name is required."
      });
      return;
    }
    
    if (editingProject) {
      updateProject(editingProject.id, submittingFormData);
    } else {
      addProject(submittingFormData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProject ? "Edit Project" : "Add New Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
              placeholder="Enter client name"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Assigned To (
              {Array.isArray(formData.assignedTo) ? formData.assignedTo.length : 0}
              /10 maximum)
            </Label>
            <div className="flex gap-2">
              <Input
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                placeholder="Enter team member name"
                disabled={
                  Array.isArray(formData.assignedTo) && 
                  formData.assignedTo.length >= 10
                }
              />
              <Button 
                type="button" 
                onClick={addAssignee}
                disabled={
                  Array.isArray(formData.assignedTo) && 
                  formData.assignedTo.length >= 10
                }
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(formData.assignedTo) && formData.assignedTo.map((person, index) => (
                <Badge 
                  key={index} 
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {person}
                  <button
                    type="button"
                    onClick={() => removeAssignee(index)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectStatus.NOT_STARTED}>
                  Not Started
                </SelectItem>
                <SelectItem value={ProjectStatus.IN_PROGRESS}>
                  In Progress
                </SelectItem>
                <SelectItem value={ProjectStatus.COMPLETED}>
                  Completed
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectPriority.LOW}>Low</SelectItem>
                <SelectItem value={ProjectPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={ProjectPriority.HIGH}>High</SelectItem>
                <SelectItem value={ProjectPriority.URGENT}>Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Date</Label>
            <Input
              id="startTime"
              name="startTime"
              type="date"
              value={formatDateForInput(formData.startTime)}
              onChange={handleDateChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              name="deadline"
              type="date"
              value={formatDateForInput(formData.deadline)}
              onChange={handleDateChange}
              required
            />
          </div>

          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="budget">Project Budget</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advancePayment">Advance Payment</Label>
                <Input
                  id="advancePayment"
                  name="advancePayment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.advancePayment}
                  onChange={(e) => setFormData(prev => ({ ...prev, advancePayment: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partialPayments">Partial Payments</Label>
                <Input
                  id="partialPayments"
                  name="partialPayments"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.partialPayments}
                  onChange={(e) => setFormData(prev => ({ ...prev, partialPayments: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="submit" className="w-full">
              {editingProject ? "Update Project" : "Add Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
