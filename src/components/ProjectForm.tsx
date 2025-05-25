import React, { useState, useEffect } from "react";
import { Project, ProjectStatus, ProjectPriority, User } from "@/types/project";
import { useProjects } from "@/contexts/ProjectContext";
import { userApi } from "@/services/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// Form data interface that matches backend IProject structure
interface ProjectFormData {
  name: string;
  clientName: string; // Required
  description: string; // Will be optional in validation
  startDate: string;
  deadline: string; // Use deadline instead of endDate
  status: ProjectStatus;
  priority: ProjectPriority;
  manager: string;
  team: string[];
  budget: number; // Required
  advancePayment: number; // Required
  partialPayments: number; // Required
}

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
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    clientName: "",
    description: "",
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date().toISOString().split('T')[0],
    status: ProjectStatus.NOT_STARTED,
    priority: ProjectPriority.MEDIUM,
    manager: currentUser?.id || "",
    team: [],
    budget: 0,
    advancePayment: 0,
    partialPayments: 0,
  });

  // Fetch users when component mounts or opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  // Fetch users with optional search
  useEffect(() => {
    if (open && userSearch.length > 0) {
      const debounceTimer = setTimeout(() => {
        fetchUsers(userSearch);
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [userSearch, open]);

  const fetchUsers = async (search?: string) => {
    try {
      setLoadingUsers(true);
      const params: { search?: string; role?: string } = {};
      if (search) {
        params.search = search;
      }
      
      const response = await userApi.getAll(params);
      
      // Handle different response structures
      let usersData: User[] = [];
      if (response.data?.users) {
        usersData = response.data.users;
      } else if (response.users) {
        usersData = response.users;
      } else if (response.data && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (Array.isArray(response)) {
        usersData = response;
      }
      
      console.log('Fetched users:', usersData); // Debug log
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users. Please try again."
      });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject?.name || "",
        clientName: editingProject?.clientName || "",
        description: editingProject?.description || "",
        startDate: editingProject?.startDate?.split('T')?.[0] || new Date().toISOString().split('T')[0],
        deadline: editingProject?.deadline?.split('T')?.[0] || new Date().toISOString().split('T')[0],
        status: (editingProject?.status as ProjectStatus) || ProjectStatus.NOT_STARTED,
        priority: (editingProject?.priority as ProjectPriority) || ProjectPriority.MEDIUM,
        manager: typeof editingProject?.manager === 'string' ? editingProject?.manager : editingProject?.manager?._id || "",
        team: Array.isArray(editingProject?.team) && editingProject?.team?.length > 0 
          ? editingProject?.team?.map(member => typeof member === 'string' ? member : member?._id || '') || []
          : [],
        budget: editingProject?.budget || 0,
        advancePayment: editingProject?.advancePayment || 0,
        partialPayments: editingProject?.partialPayments || 0,
      });
    } else {
      setFormData({
        name: "",
        clientName: "",
        description: "",
        startDate: new Date().toISOString().split('T')[0],
        deadline: new Date().toISOString().split('T')[0],
        status: ProjectStatus.NOT_STARTED,
        priority: ProjectPriority.MEDIUM,
        manager: currentUser?.id || "",
        team: [],
        budget: 0,
        advancePayment: 0,
        partialPayments: 0,
      });
    }
  }, [editingProject, open, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e?.target || {};
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e?.target || {};
    if (name) {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e?.target || {};
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePriorityChange = (value: string) => {
    if (value) {
      setFormData(prev => ({ ...prev, priority: value as ProjectPriority }));
    }
  };

  const handleStatusChange = (value: string) => {
    if (value) {
      setFormData(prev => ({ ...prev, status: value as ProjectStatus }));
    }
  };

  const handleManagerChange = (value: string) => {
    if (value) {
      setFormData(prev => ({ ...prev, manager: value }));
    }
  };

  const handleTeamMemberAdd = (userId: string) => {
    if (!userId) return;
    
    if (formData?.team?.length < 10) {
      if (!formData?.team?.includes(userId)) {
        setFormData(prev => ({
          ...prev,
          team: [...(prev?.team || []), userId]
        }));
      } else {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "This team member is already added"
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Maximum 10 team members can be assigned"
      });
    }
  };

  const removeTeamMember = (userId: string) => {
    if (!userId) return;
    
    setFormData(prev => ({
      ...prev,
      team: prev?.team?.filter(id => id !== userId) || []
    }));
  };

  const getUserName = (userId: string) => {
    if (!userId) return 'Unknown User';
    
    const user = users?.find(u => (u?._id || u?.id) === userId);
    return user ? `${user?.name || 'Unknown'} (${user?.email || 'No email'})` : userId;
  };

  const getAvailableUsers = () => {
    return users?.filter(user => 
      !(formData?.team || [])?.includes(user?._id || user?.id || '') && 
      (user?._id || user?.id) !== formData?.manager
    ) || [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e?.preventDefault();
    
    // Required field validations (matching backend validation)
    if (!formData?.name?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a project name"
      });
      return;
    }
    
    if (formData?.name?.length > 100) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Project name cannot be more than 100 characters"
      });
      return;
    }

    if (!formData?.clientName?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a client name"
      });
      return;
    }
    
    if (formData?.clientName?.length > 100) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Client name cannot be more than 100 characters"
      });
      return;
    }

    if (!formData?.startDate) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a valid start date (YYYY-MM-DD)"
      });
      return;
    }

    if (!formData?.deadline) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a valid deadline (YYYY-MM-DD)"
      });
      return;
    }

    if (!formData?.manager) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please provide a valid manager ID"
      });
      return;
    }

    // Date validation
    if (new Date(formData?.deadline) < new Date(formData?.startDate)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Deadline must be after start date"
      });
      return;
    }

    // Budget validation (required and must be numeric, min 0)
    if (typeof formData?.budget !== 'number' || isNaN(formData?.budget)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Budget must be a number"
      });
      return;
    }

    if (formData?.budget < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Budget cannot be negative"
      });
      return;
    }

    // Optional payment validations (when provided, must be numeric and min 0)
    if (formData?.advancePayment !== undefined && (typeof formData?.advancePayment !== 'number' || isNaN(formData?.advancePayment) || formData?.advancePayment < 0)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Advance payment must be a number and cannot be negative"
      });
      return;
    }

    if (formData?.partialPayments !== undefined && (typeof formData?.partialPayments !== 'number' || isNaN(formData?.partialPayments) || formData?.partialPayments < 0)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Partial payments must be a number and cannot be negative"
      });
      return;
    }

    // Business logic validation
    const totalPayments = (formData?.advancePayment || 0) + (formData?.partialPayments || 0);
    if (totalPayments > formData?.budget) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Total payments cannot exceed budget"
      });
      return;
    }
    
    // Prepare data for submission (matching backend expectations)
    const submittingFormData: any = {
      name: formData?.name?.trim(),
      clientName: formData?.clientName?.trim(),
      startDate: formData?.startDate, // ISO8601 format (YYYY-MM-DD)
      deadline: formData?.deadline, // ISO8601 format (YYYY-MM-DD)
      manager: formData?.manager,
      budget: formData?.budget,
    };

    // Add optional fields only if they have values
    if (formData?.description?.trim()) {
      submittingFormData.description = formData.description.trim();
    }

    if (formData?.status) {
      submittingFormData.status = formData.status;
    }

    if (formData?.priority) {
      submittingFormData.priority = formData.priority;
    }

    if (formData?.team && formData.team.length > 0) {
      submittingFormData.team = formData.team;
    }

    if (formData?.advancePayment !== undefined && formData?.advancePayment >= 0) {
      submittingFormData.advancePayment = formData.advancePayment;
    }

    if (formData?.partialPayments !== undefined && formData?.partialPayments >= 0) {
      submittingFormData.partialPayments = formData.partialPayments;
    }
    
    console.log('Submitting project data:', submittingFormData); // Debug log
    
    if (editingProject) {
      // For updates, remove manager field as it's not updatable according to backend validation
      const updateData = { ...submittingFormData };
      delete updateData.manager;
      updateProject(editingProject?._id || editingProject?.id || "", updateData);
    } else {
      addProject(submittingFormData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProject ? "Edit Project" : "Add New Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData?.name || ''}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="Enter project name (max 100 characters)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              name="clientName"
              value={formData?.clientName || ''}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="Enter client name (max 100 characters)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData?.description || ''}
              onChange={handleChange}
              placeholder="Enter project description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager">
              Project Manager * {editingProject && <span className="text-sm text-gray-500">(Cannot be changed after creation)</span>}
            </Label>
            <div className="space-y-2">
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e?.target?.value || '')}
                disabled={loadingUsers || !!editingProject}
              />
              <Select
                value={formData?.manager || ''}
                onValueChange={handleManagerChange}
                disabled={loadingUsers || !!editingProject}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    editingProject 
                      ? "Manager cannot be changed" 
                      : loadingUsers 
                        ? "Loading users..." 
                        : "Select project manager"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user?._id || user?.id} value={user?._id || user?.id || ''}>
                      {user?.name || 'Unknown'} ({user?.email || 'No email'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingProject && typeof editingProject?.manager === 'object' && (
              <p className="text-sm text-gray-500">
                Current manager: {editingProject?.manager?.name} ({editingProject?.manager?.email})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Team Members ({formData?.team?.length || 0}/10 maximum)
            </Label>
            {users?.length === 0 && !loadingUsers && (
              <p className="text-sm text-gray-500">
                {userSearch ? `No users found for "${userSearch}"` : "No users available"}
              </p>
            )}
            <Select
              onValueChange={handleTeamMemberAdd}
              disabled={loadingUsers || (formData?.team?.length || 0) >= 10 || getAvailableUsers()?.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingUsers 
                    ? "Loading users..." 
                    : (formData?.team?.length || 0) >= 10 
                      ? "Maximum team members reached" 
                      : getAvailableUsers()?.length === 0
                        ? "No available users"
                        : "Select team member to add"
                } />
              </SelectTrigger>
              <SelectContent>
                {getAvailableUsers()?.map((user) => (
                  <SelectItem key={user?._id || user?.id} value={user?._id || user?.id || ''}>
                    {user?.name || 'Unknown'} ({user?.email || 'No email'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData?.team?.map((userId) => (
                <Badge 
                  key={userId} 
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {getUserName(userId)}
                  <button
                    type="button"
                    onClick={() => removeTeamMember(userId)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            {(formData?.team?.length || 0) === 0 && (
              <p className="text-xs text-gray-500">No team members added yet</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹) *</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min="0"
                step="0.01"
                value={formData?.budget || 0}
                onChange={handleNumberChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advancePayment">Advance Payment (₹)</Label>
              <Input
                id="advancePayment"
                name="advancePayment"
                type="number"
                min="0"
                step="0.01"
                value={formData?.advancePayment || 0}
                onChange={handleNumberChange}
                placeholder="0.00 (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partialPayments">Partial Payments (₹)</Label>
              <Input
                id="partialPayments"
                name="partialPayments"
                type="number"
                min="0"
                step="0.01"
                value={formData?.partialPayments || 0}
                onChange={handleNumberChange}
                placeholder="0.00 (optional)"
              />
            </div>
          </div>

          {(formData?.budget || 0) > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Pending Payment:</strong> ₹{((formData?.budget || 0) - ((formData?.advancePayment || 0) + (formData?.partialPayments || 0)))?.toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData?.status || ProjectStatus.NOT_STARTED}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status (optional)" />
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
                <SelectItem value={ProjectStatus.ON_HOLD}>
                  On Hold
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData?.priority || ProjectPriority.MEDIUM}
              onValueChange={handlePriorityChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectPriority.LOW}>Low</SelectItem>
                <SelectItem value={ProjectPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={ProjectPriority.HIGH}>High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData?.startDate || ''}
              onChange={handleDateChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              name="deadline"
              type="date"
              value={formData?.deadline || ''}
              onChange={handleDateChange}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loadingUsers}>
              {editingProject ? "Update Project" : "Add Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
