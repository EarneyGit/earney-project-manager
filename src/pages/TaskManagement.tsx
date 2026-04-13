
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import * as api from "@/services/api";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ClipboardList, CheckCircle2, Clock, Circle, User } from "lucide-react";

interface Employee { id: string; name: string; }

const STATUS_CONFIG = {
  todo:        { label: "To Do",       icon: Circle,        className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", icon: Clock,         className: "bg-blue-100 text-blue-700" },
  done:        { label: "Done",        icon: CheckCircle2,  className: "bg-green-100 text-green-700" },
};

export default function TaskManagement() {
  const { isManager, isAdmin } = useAuth();
  const { projects } = useProjects();
  const { toast } = useToast();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAssignee, setFormAssignee] = useState("unassigned");
  const [formDueDate, setFormDueDate] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Load employees list
  useEffect(() => {
    api.fetchUsersByRole("employee").then(setEmployees);
  }, []);

  // Load tasks when project changes
  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) { setTasks([]); return; }
    setLoadingTasks(true);
    try {
      const data = await api.fetchTasks({ projectId: selectedProjectId });
      // Enrich with assignee names
      const enriched = data.map((t) => ({
        ...t,
        assigneeName: employees.find((e) => e.id === t.assignedTo)?.name || null,
      }));
      setTasks(enriched);
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedProjectId, employees]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !selectedProjectId) return;
    setFormLoading(true);
    try {
      const newTask = await api.createTask({
        projectId: selectedProjectId,
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        status: "todo",
        assignedTo: formAssignee === "unassigned" ? null : (formAssignee || null),
        dueDate: formDueDate || null,
      });
      const assigneeName = employees.find((e) => e.id === formAssignee)?.name || null;
      setTasks((prev) => [{ ...newTask, assigneeName }, ...prev]);
      setShowForm(false);
      setFormTitle(""); setFormDesc(""); setFormAssignee("unassigned"); setFormDueDate("");
      toast({ title: "Task created", description: "Task has been assigned successfully." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create task." });
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.updateTask(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as any } : t)));
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast({ title: "Task deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  if (!isManager && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access restricted to managers and admins.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" /> Task Management
        </h1>
        <p className="text-gray-500 mt-1">Create tasks for your projects and assign them to employees.</p>
      </div>

      {/* Project Selector */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label>Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project to manage tasks…" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProjectId && (
              <Button onClick={() => setShowForm(true)} className="bg-black hover:bg-gray-800 text-white">
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      {selectedProjectId && (
        <>
          {loadingTasks ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No tasks yet. Click "Add Task" to create the first one.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                const StatusIcon = sc.icon;
                return (
                  <Card key={task.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-0.5 truncate">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {/* Assignee */}
                            {task.assigneeName ? (
                              <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
                                <User className="h-3 w-3" /> {task.assigneeName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Unassigned</span>
                            )}
                            {/* Due date */}
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due: {task.dueDate ? new Date(task.dueDate + (task.dueDate.length === 10 ? 'T00:00:00' : '')).toLocaleDateString("en-IN") : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Status + Delete */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                            <SelectTrigger className={`h-8 text-xs w-32 ${sc.className} border-0`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task — {selectedProject?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title" value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc" value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Optional details…" rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign To (Employee)</Label>
              <Select value={formAssignee} onValueChange={setFormAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">— Unassigned —</SelectItem>
                  {employees
                    .filter((emp) => emp.id && emp.id.trim() !== "" && emp.name && emp.name.trim() !== "")
                    .map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employees.length === 0 && (
                <p className="text-xs text-gray-400">
                  No employees found. Create employee accounts in Manage Users.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due Date</Label>
              <Input id="task-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-black text-white" disabled={formLoading}>
                {formLoading ? "Creating…" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
