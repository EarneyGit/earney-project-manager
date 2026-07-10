import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import * as api from "@/services/api";
import { Task } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const COLUMNS = [
  { id: "todo", label: "To Do", icon: Circle, color: "text-gray-500", bg: "bg-gray-100" },
  { id: "in_progress", label: "In Progress", icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
];

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

  useEffect(() => {
    api.fetchUsersByRole("employee").then(setEmployees);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!selectedProjectId) { setTasks([]); return; }
    setLoadingTasks(true);
    try {
      const data = await api.fetchTasks({ projectId: selectedProjectId });
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
    <div className="h-[calc(100vh-80px)] flex flex-col pt-6 pb-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <ClipboardList className="h-6 w-6 text-gray-500" /> Task Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Kanban board for project tasks</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="bg-white border-gray-200 shadow-sm">
                <SelectValue placeholder="Select a project…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProjectId && (
            <Button onClick={() => setShowForm(true)} className="bg-black hover:bg-gray-800 text-white shadow-sm flex-shrink-0">
              <Plus className="h-4 w-4 mr-1.5" /> Add Task
            </Button>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-white/50 mb-6">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Select a project to view tasks</p>
        </div>
      ) : loadingTasks ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-100/70 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-3 border-b border-gray-200/50 bg-gray-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <col.icon className={`h-4 w-4 ${col.color}`} />
                    <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-200/50 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {colTasks.map((task) => (
                      <Card key={task.id} className="shadow-sm hover:shadow transition-shadow border-gray-200">
                        <CardContent className="p-3.5">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <p className="font-semibold text-sm text-gray-900 leading-tight">{task.title}</p>
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 -mr-1 -mt-1 flex-shrink-0"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          
                          {task.description && (
                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
                          )}
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 max-w-[120px]">
                              {task.assigneeName ? (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-[11px] font-medium text-gray-700 truncate">
                                  <User className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{task.assigneeName.split(' ')[0]}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">Unassigned</span>
                              )}
                            </div>
                            
                            <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                              <SelectTrigger className="h-7 w-28 text-[11px] bg-white border-gray-200 shadow-none px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COLUMNS.map(c => (
                                  <SelectItem key={c.id} value={c.id} className="text-[11px]">{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        <span className="text-xs">No tasks</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
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
                placeholder="Optional details…" rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select value={formAssignee} onValueChange={setFormAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-due">Due Date</Label>
                <Input id="task-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
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
