import React from "react";
import { Project, ProjectStatus, User } from "@/types/project";
import { formatDate } from "@/lib/utils";
import { useProjects } from "@/contexts/ProjectContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Clock,
  Calendar,
  User as UserIcon,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { deleteProject } = useProjects();
  
  const getStatusColor = (status: string) => {
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
        return status;
    }
  };

  const isPastDeadline = () => {
    return new Date(project.deadline) < new Date() && project.status !== 'completed';
  };

  const getTeamMemberDisplay = (member: string | User) => {
    if (typeof member === 'string') {
      return member; // Display user ID if not populated
    }
    return member.name; // Display name if populated
  };

  const getManagerDisplay = () => {
    if (typeof project.manager === 'string') {
      return project.manager; // Display user ID if not populated
    }
    return project.manager.name; // Display name if populated
  };

  return (
    <Card className="h-full border border-gray-200 hover:border-gray-400 transition-colors duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold truncate">{project.name}</h3>
          <Badge className={getStatusColor(project.status)}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2 space-y-2">
        {project.description && (
          <div className="flex items-start text-sm">
            <FileText size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-600 line-clamp-2">{project.description}</span>
          </div>
        )}
        <div className="flex items-center text-sm">
          <Clock size={16} className="mr-2" />
          <span>Start: {formatDate(project.startDate)}</span>
        </div>
        <div className="flex items-center text-sm">
          <Calendar size={16} className="mr-2" />
          <span className={isPastDeadline() ? "text-red-600 font-bold" : ""}>
            Due: {formatDate(project.deadline)}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <UserIcon size={16} className="mr-2" />
          <span className="text-gray-600">Manager: {getManagerDisplay()}</span>
        </div>
        <div className="flex items-start text-sm">
          <UserIcon size={16} className="mr-2 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {project.team && project.team.length > 0 ? (
              project.team.map((member, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {getTeamMemberDisplay(member)}
                </Badge>
              ))
            ) : (
              <span className="text-gray-500">No team members</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-end space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onEdit(project)}
          className="h-8 px-2"
        >
          <Edit size={16} />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => deleteProject(project._id || project.id || "")}
          className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
