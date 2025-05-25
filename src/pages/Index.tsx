import React, { useState, useMemo, useEffect } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { Project, ProjectStatus, ProjectPriority, User } from "@/types/project";
import ProjectForm from "@/components/ProjectForm";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  SortAsc, 
  SortDesc, 
  Edit, 
  Trash2,
  PieChart,
  BarChart as BarChartIcon,
  LineChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart as RechartsPieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

const Index = () => {
  const { projects, deleteProject, updateProject, loading, error } = useProjects();
  const { isAdmin, isEditor, currentUser } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"deadline" | "name">("deadline");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: 'status' | 'priority' | 'budget' | 'advancePayment' | 'partialPayments' | null;
  }>({ id: '', field: null });

  // Helper functions to handle populated fields
  const getTeamMemberDisplay = (member: string | User) => {
    if (typeof member === 'string') {
      return member;
    }
    return member?.name || 'Unknown User';
  };

  const getManagerDisplay = (manager: string | User) => {
    if (typeof manager === 'string') {
      return manager;
    }
    return manager?.name || 'Unknown Manager';
  };

  const getTeamSearchableText = (team: (string | User)[]) => {
    return team?.map(member => {
      if (typeof member === 'string') {
        return member;
      }
      return `${member?.name || ''} ${member?.email || ''}`;
    }).join(' ') || '';
  };

  const getManagerSearchableText = (manager: string | User) => {
    if (typeof manager === 'string') {
      return manager;
    }
    return `${manager?.name || ''} ${manager?.email || ''}`;
  };

  const calculatePendingPayment = (budget: number = 0, advancePayment: number = 0, partialPayments: number = 0) => {
    return Math.max(0, budget - (advancePayment + partialPayments));
  };

  useEffect(() => {
    if (location?.state?.openNewProjectForm) {
      handleAddNew();
      window.history.replaceState({}, document.title);
    }
  }, [location?.state]);

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setOpen(true);
  };

  const handleAddNew = () => {
    setEditingProject(null);
    setOpen(true);
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'not-started':
        return "bg-white text-black border border-black";
      case 'in-progress':
        return "bg-black text-white";
      case 'completed':
        return "bg-green-100 text-green-800 border border-green-300";
      case 'on-hold':
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      default:
        return "bg-white text-black border border-black";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'not-started':
        return "Not Started";
      case 'in-progress':
        return "In Progress";
      case 'completed':
        return "Completed";
      case 'on-hold':
        return "On Hold";
      default:
        return status || 'Unknown';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-[#F2FCE2] text-black border border-green-300";
      case "medium":
        return "bg-[#FEF7CD] text-black border border-yellow-300";
      case "high":
        return "bg-[#FEC6A1] text-black border border-orange-300";
      default:
        return "bg-white text-black border border-black";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "low":
        return "Low";
      case "medium":
        return "Medium";
      case "high":
        return "High";
      default:
        return priority || 'Unknown';
    }
  };

  const calculateProgress = (startDate: string, deadline: string) => {
    if (!startDate || !deadline) return { progress: 0, remainingDays: 0 };
    
    const start = new Date(startDate).getTime();
    const end = new Date(deadline).getTime();
    const now = new Date().getTime();
    
    if (now <= start) return { progress: 0, remainingDays: 0 };
    if (now >= end) return { progress: 100, remainingDays: 0 };
    
    const total = end - start;
    const current = now - start;
    const progress = Math.round((current / total) * 100);
    
    const remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    
    return { progress, remainingDays };
  };

  const handleCellEdit = async (project: Project, field: string, value: any) => {
    try {
      const updates: Partial<Project> = { [field]: value };
      
      // If updating a payment field, recalculate pending payment
      if (field === 'budget' || field === 'advancePayment' || field === 'partialPayments') {
        const budget = field === 'budget' ? value : (project?.budget || 0);
        const advancePayment = field === 'advancePayment' ? value : (project?.advancePayment || 0);
        const partialPayments = field === 'partialPayments' ? value : (project?.partialPayments || 0);
        updates.pendingPayment = calculatePendingPayment(budget, advancePayment, partialPayments);
      }
      
      await updateProject(project?._id || project?.id || "", updates);
      setEditingCell({ id: '', field: null });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const dashboardStats = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    const totalProjects = safeProjects?.length || 0;
    
    // Financial calculations - budget, advancePayment, partialPayments are required fields
    const totalBudget = safeProjects?.reduce((sum, project) => sum + (project?.budget || 0), 0) || 0;
    const totalAdvancePayment = safeProjects?.reduce((sum, project) => sum + (project?.advancePayment || 0), 0) || 0;
    const totalPartialPayments = safeProjects?.reduce((sum, project) => sum + (project?.partialPayments || 0), 0) || 0;
    const totalPendingPayment = safeProjects?.reduce((sum, project) => {
      return sum + calculatePendingPayment(project?.budget, project?.advancePayment, project?.partialPayments);
    }, 0) || 0;
    const totalCollectedPayment = totalAdvancePayment + totalPartialPayments;
    
    const statusCounts = safeProjects?.reduce((acc, project) => {
      const status = project?.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: getStatusLabel(name), 
      value
    }));
    
    const priorityCounts = safeProjects?.reduce((acc, project) => {
      const priority = project?.priority || 'unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({
      name: getPriorityLabel(name), 
      value
    }));
    
    // Payment distribution data - always show all categories
    const paymentData = [
      { name: "Advance Payment", value: totalAdvancePayment, color: "#0088FE" },
      { name: "Partial Payments", value: totalPartialPayments, color: "#00C49F" },
      { name: "Pending Payment", value: totalPendingPayment, color: "#FFBB28" }
    ];
    
    // Budget vs Payment data - always show all categories
    const budgetVsPaymentData = [
      { name: "Total Budget", value: totalBudget, color: "#8884d8" },
      { name: "Collected", value: totalCollectedPayment, color: "#82ca9d" },
      { name: "Pending", value: totalPendingPayment, color: "#ffc658" }
    ];
    
    return {
      totalProjects,
      totalBudget,
      totalAdvancePayment,
      totalPartialPayments,
      totalPendingPayment,
      totalCollectedPayment,
      statusData,
      priorityData,
      paymentData,
      budgetVsPaymentData
    };
  }, [projects]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) {
      return [];
    }
    return projects
      ?.filter((project) => {
        const matchesSearch = project?.name
          ?.toLowerCase()
          ?.includes(search?.toLowerCase() || '') ||
          (project?.description && project?.description?.toLowerCase()?.includes(search?.toLowerCase() || '')) ||
          (project?.clientName && project?.clientName?.toLowerCase()?.includes(search?.toLowerCase() || '')) ||
          getTeamSearchableText(project?.team || [])?.toLowerCase()?.includes(search?.toLowerCase() || '') ||
          getManagerSearchableText(project?.manager)?.toLowerCase()?.includes(search?.toLowerCase() || '');

        const matchesStatus =
          statusFilter === "all" || project?.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      ?.sort((a, b) => {
        if (sortBy === "deadline") {
          const aDate = new Date(a?.deadline || '').getTime();
          const bDate = new Date(b?.deadline || '').getTime();
          return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
        } else {
          return sortOrder === "asc"
            ? (a?.name || '').localeCompare(b?.name || '')
            : (b?.name || '').localeCompare(a?.name || '');
        }
      }) || [];
  }, [projects, search, statusFilter, sortBy, sortOrder]);

  const renderLoadingState = () => {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Loading Projects...</h2>
        <p className="text-gray-500">Please wait while we fetch your projects</p>
      </div>
    );
  };

  const renderErrorState = () => {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2 text-red-600">Error Loading Projects</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  };

  const renderEmptyState = () => {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Welcome, {currentUser?.name || 'User'}</h2>
        <p className="text-gray-500 mb-6">No projects found</p>
        {(isAdmin || isEditor) && (
          <Button onClick={handleAddNew} variant="outline">
            <Plus size={16} className="mr-1" /> Create your first project
          </Button>
        )}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <main className="container mx-auto p-4">
          {renderLoadingState()}
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <main className="container mx-auto p-4">
          {renderErrorState()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto p-4">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-end w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as "deadline" | "name")}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={toggleSort}>
                {sortOrder === "asc" ? <SortAsc size={18} /> : <SortDesc size={18} />}
              </Button>
              
              {(isAdmin || isEditor) && (
                <Button 
                  onClick={handleAddNew} 
                  className="bg-black text-white hover:bg-gray-800"
                >
                  <Plus size={16} className="mr-1" /> New Project
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Project list section */}
        {filteredProjects.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Team Members</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Advance Payment</TableHead>
                  <TableHead>Partial Payments</TableHead>
                  <TableHead>Pending Payment</TableHead>
                  {(isAdmin || isEditor) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects?.map((project) => (
                  <TableRow key={project?._id || project?.id}>
                    <TableCell className="font-medium">{project?.name || 'Untitled Project'}</TableCell>
                    <TableCell className="font-medium">{project?.clientName || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={project?.description || ''}>
                        {project?.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === (project?._id || project?.id) && editingCell?.field === 'status' ? (
                        <Select
                          defaultValue={project?.status}
                          onValueChange={(value) => handleCellEdit(project, 'status', value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not-started">Not Started</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div
                          onClick={() => (isAdmin || isEditor) && setEditingCell({ id: project?._id || project?.id || "", field: 'status' })}
                          className="cursor-pointer"
                        >
                          <Badge className={getStatusStyle(project?.status || '')}>
                            {getStatusLabel(project?.status || '')}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === (project?._id || project?.id) && editingCell?.field === 'priority' ? (
                        <Select
                          defaultValue={project?.priority}
                          onValueChange={(value) => handleCellEdit(project, 'priority', value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div
                          onClick={() => (isAdmin || isEditor) && setEditingCell({ id: project?._id || project?.id || "", field: 'priority' })}
                          className="cursor-pointer"
                        >
                          <Badge className={getPriorityStyle(project?.priority || '')}>
                            {getPriorityLabel(project?.priority || '')}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getManagerDisplay(project?.manager)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {project?.team && project?.team?.length > 0 ? (
                          project?.team?.map((member, index) => (
                            <Badge key={index} variant="outline">
                              {getTeamMemberDisplay(member)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500">No team members</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(project?.startDate || '')}</TableCell>
                    <TableCell>{formatDate(project?.deadline || '')}</TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex flex-col">
                        <Progress 
                          value={calculateProgress(project?.startDate || '', project?.deadline || '')?.progress || 0}
                          className="h-2 mb-1"
                        />
                        <span className="text-xs text-gray-500">
                          {calculateProgress(project?.startDate || '', project?.deadline || '')?.remainingDays || 0} days left
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>₹{(project?.budget || 0)?.toFixed(2)}</TableCell>
                    <TableCell>
                      {editingCell?.id === (project?._id || project?.id) && editingCell?.field === 'advancePayment' ? (
                        <Input
                          type="number"
                          defaultValue={project?.advancePayment || 0}
                          onBlur={(e) => handleCellEdit(project, 'advancePayment', parseFloat(e.target.value) || 0)}
                          autoFocus
                          className="w-24"
                        />
                      ) : (
                        <div
                          onClick={() => (isAdmin || isEditor) && setEditingCell({ id: project?._id || project?.id || "", field: 'advancePayment' })}
                          className="cursor-pointer"
                        >
                          ₹{(project?.advancePayment || 0)?.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.id === (project?._id || project?.id) && editingCell?.field === 'partialPayments' ? (
                        <Input
                          type="number"
                          defaultValue={project?.partialPayments || 0}
                          onBlur={(e) => handleCellEdit(project, 'partialPayments', parseFloat(e.target.value) || 0)}
                          autoFocus
                          className="w-24"
                        />
                      ) : (
                        <div
                          onClick={() => (isAdmin || isEditor) && setEditingCell({ id: project?._id || project?.id || "", field: 'partialPayments' })}
                          className="cursor-pointer"
                        >
                          ₹{(project?.partialPayments || 0)?.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      ₹{calculatePendingPayment(project?.budget, project?.advancePayment, project?.partialPayments)?.toFixed(2)}
                    </TableCell>
                    {(isAdmin || isEditor) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteProject(project?._id || project?.id || "")}
                            className="h-8 w-8 p-0"
                            disabled={!isAdmin}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                
                {/* Totals row */}
                {filteredProjects?.length > 0 && (
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell colSpan={9}>Totals</TableCell>
                    <TableCell>
                      ₹{filteredProjects?.reduce((acc, project) => acc + (project?.budget || 0), 0)?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₹{filteredProjects?.reduce((acc, project) => acc + (project?.advancePayment || 0), 0)?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₹{filteredProjects?.reduce((acc, project) => acc + (project?.partialPayments || 0), 0)?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₹{filteredProjects?.reduce((acc, project) => acc + calculatePendingPayment(project?.budget, project?.advancePayment, project?.partialPayments), 0)?.toFixed(2)}
                    </TableCell>
                    {(isAdmin || isEditor) && <TableCell></TableCell>}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Insights section */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-semibold mb-4">Project Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalProjects}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{dashboardStats.totalBudget.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{dashboardStats.totalCollectedPayment.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Pending Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ₹{dashboardStats.totalPendingPayment.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-md font-medium flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={dashboardStats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {dashboardStats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} projects`, 'Count']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-md font-medium flex items-center">
                  <BarChartIcon className="mr-2 h-5 w-5" />
                  Priority Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dashboardStats.priorityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [`${value} projects`, 'Count']} />
                      <Bar dataKey="value" fill="#82ca9d">
                        {dashboardStats.priorityData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.name === "High" ? "#FEC6A1" : 
                              entry.name === "Medium" ? "#FFBB28" : 
                              "#82ca9d"
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-md font-medium flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Payment Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="h-[250px]">
                  {dashboardStats.paymentData.every(item => item.value === 0) ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <PieChart className="mx-auto mb-2 h-8 w-8" />
                        <p className="text-sm">No payment data available</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dashboardStats.paymentData.filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label={({name, value, percent}) => value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {dashboardStats.paymentData.filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Amount']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-md font-medium flex items-center">
                  <BarChartIcon className="mr-2 h-5 w-5" />
                  Budget vs Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="h-[250px]">
                  {dashboardStats.budgetVsPaymentData.every(item => item.value === 0) ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <BarChartIcon className="mx-auto mb-2 h-8 w-8" />
                        <p className="text-sm">No budget data available</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardStats.budgetVsPaymentData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`₹${value.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Amount']} 
                          labelStyle={{ color: '#000' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {dashboardStats.budgetVsPaymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <ProjectForm
        open={open}
        onOpenChange={setOpen}
        editingProject={editingProject}
      />
    </div>
  );
};

export default Index;
