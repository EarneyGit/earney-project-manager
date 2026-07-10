import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/api";
import { Task } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Circle, ListTodo, CalendarDays, KanbanSquare } from "lucide-react";

const COLUMNS = [
  { id: "todo", label: "To Do", icon: Circle, color: "text-gray-500", bg: "bg-gray-100" },
  { id: "in_progress", label: "In Progress", icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
];

const STATUS_CONFIG: Record<string, any> = {
  todo:        { label: "To Do",       icon: Circle,       className: "bg-gray-100 text-gray-700 border-gray-200" },
  in_progress: { label: "In Progress", icon: Clock,        className: "bg-blue-100 text-blue-700 border-blue-200" },
  done:        { label: "Done",        icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
};

export default function MyTasks() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadTasks = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await api.fetchTasks({ assignedTo: currentUser.id });
      setTasks(data);
    } catch {
      const stored = localStorage.getItem("tasks");
      const all: Task[] = stored ? JSON.parse(stored) : [];
      setTasks(all.filter((t) => t.assignedTo === currentUser.id));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.updateTask(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: status as any } : t)));
      if (status === "done") {
        toast({ title: "Task completed! 🎉", description: "Great work!" });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update task." });
    }
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const counts = {
    all:        tasks.length,
    todo:       tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done:       tasks.filter((t) => t.status === "done").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  const renderTaskCard = (task: Task) => {
    const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
    const StatusIcon = sc.icon;
    const safeDue = task.dueDate
      ? (task.dueDate.length === 10 ? task.dueDate + 'T00:00:00' : task.dueDate)
      : null;
    const isOverdue = safeDue && task.status !== "done" && new Date(safeDue) < new Date();

    return (
      <Card
        key={task.id}
        className={`shadow-sm hover:shadow transition-shadow border-gray-200 ${
          task.status === "done" ? "opacity-75 bg-gray-50" : ""
        }`}
      >
        <CardContent className="p-3.5">
          <div className="flex flex-col gap-2">
            <p
              className={`font-semibold text-sm text-gray-900 leading-tight ${
                task.status === "done" ? "line-through text-gray-500" : ""
              }`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
            )}
            
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
              {task.dueDate ? (
                <div
                  className={`flex items-center gap-1 text-[11px] font-medium ${
                    isOverdue ? "text-red-500" : "text-gray-500"
                  }`}
                >
                  <CalendarDays className="h-3 w-3" />
                  {isOverdue ? "Overdue " : "Due "}
                  {safeDue ? new Date(safeDue).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  }) : ""}
                </div>
              ) : (
                <div />
              )}
              
              <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                <SelectTrigger
                  className={`h-7 w-28 text-[11px] px-2 shadow-none bg-white font-medium ${
                    filter === "all" ? "" : sc.className
                  }`}
                >
                  {filter !== "all" && <StatusIcon className="h-3 w-3 mr-1" />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo" className="text-[11px]">To Do</SelectItem>
                  <SelectItem value="in_progress" className="text-[11px]">In Progress</SelectItem>
                  <SelectItem value="done" className="text-[11px]">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col pt-6 pb-2 container mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KanbanSquare className="h-6 w-6 text-gray-500" />
          My Tasks
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Welcome back, <strong>{currentUser?.name || currentUser?.email}</strong>. Manage your assigned work here.
        </p>
      </div>

      {/* Stats row / Filters */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["all", "todo", "in_progress", "done"] as const).map((key) => {
          const label = key === "all" ? "All Tasks" : STATUS_CONFIG[key]?.label || key;
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl p-3 text-left transition-all border shadow-sm flex flex-col justify-between ${
                isActive
                  ? "bg-black text-white border-black ring-2 ring-black ring-offset-2"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <div className="text-xs font-medium opacity-80 uppercase tracking-wider mb-2">{label}</div>
              <div className="text-3xl font-bold">{counts[key]}</div>
            </button>
          );
        })}
      </div>

      {/* Kanban Board (when All is selected) or List View */}
      {filter === "all" ? (
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
                    {colTasks.map(renderTaskCard)}
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
      ) : (
        <ScrollArea className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No {STATUS_CONFIG[filter]?.label ?? filter} tasks assigned to you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(renderTaskCard)}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
