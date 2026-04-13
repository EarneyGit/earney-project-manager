
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/api";
import { Task } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, Circle, ListTodo, CalendarDays } from "lucide-react";

const STATUS_CONFIG = {
  todo:        { label: "To Do",       icon: Circle,       className: "bg-gray-100 text-gray-700 border-gray-200" },
  in_progress: { label: "In Progress", icon: Clock,        className: "bg-blue-100 text-blue-700 border-blue-200" },
  done:        { label: "Done",        icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
};

export default function MyTasks() {
  const { currentUser, isEmployee } = useAuth();
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

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6" />
          My Tasks
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome, <strong>{currentUser?.name || currentUser?.email}</strong>! Here are all your assigned tasks.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["all", "todo", "in_progress", "done"] as const).map((key) => {
          const label = key === "all" ? "All" : STATUS_CONFIG[key]?.label || key;
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg p-3 text-center transition-all border ${
                isActive
                  ? "bg-black text-white border-black"
                  : "bg-white border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="text-2xl font-bold">{counts[key]}</div>
              <div className="text-xs mt-0.5 opacity-75">{label}</div>
            </button>
          );
        })}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{filter === "all" ? "No tasks assigned to you yet." : `No ${STATUS_CONFIG[filter]?.label ?? filter} tasks.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
            const StatusIcon = sc.icon;
            const isOverdue =
              task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();

            return (
              <Card
                key={task.id}
                className={`shadow-sm hover:shadow-md transition-shadow ${
                  task.status === "done" ? "opacity-70" : ""
                }`}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium ${
                          task.status === "done" ? "line-through text-gray-400" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <div
                          className={`flex items-center gap-1 text-xs mt-2 ${
                            isOverdue ? "text-red-500 font-medium" : "text-gray-500"
                          }`}
                        >
                          <CalendarDays className="h-3 w-3" />
                          {isOverdue ? "Overdue — " : "Due "}
                          {new Date(task.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                    {/* Status selector */}
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                      <SelectTrigger
                        className={`h-8 text-xs w-32 border font-medium ${sc.className}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
