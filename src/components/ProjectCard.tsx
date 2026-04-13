
import React from "react";
import { Project, ProjectStatus } from "@/types/project";
import { formatDate } from "@/lib/utils";
import { useProjects } from "@/contexts/ProjectContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Clock,
  Calendar,
  User,
  Edit,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { deleteProject } = useProjects();
  
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.NOT_STARTED:
        return "bg-white text-black border border-black";
      case ProjectStatus.IN_PROGRESS:
        return "bg-black text-white";
      case ProjectStatus.COMPLETED:
        return "bg-white text-black border border-black line-through";
      default:
        return "bg-white text-black border border-black";
    }
  };

  const isPastDeadline = () => {
    return new Date(project.deadline) < new Date() && project.status !== ProjectStatus.COMPLETED;
  };

  return (
    <Card className="h-full border border-gray-200 hover:border-gray-400 transition-colors duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold truncate">{project.name}</h3>
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2 space-y-2">
        <div className="flex items-center text-sm">
          <Clock size={16} className="mr-2" />
          <span>Start: {formatDate(project.startTime)}</span>
        </div>
        <div className="flex items-center text-sm">
          <Calendar size={16} className="mr-2" />
          <span className={isPastDeadline() ? "text-black font-bold" : ""}>
            Due: {formatDate(project.deadline)}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <User size={16} className="mr-2" />
          <div className="flex flex-wrap gap-1">
            {Array.isArray(project.assignedTo) ? (
              project.assignedTo.map((person, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {person}
                </Badge>
              ))
            ) : (
              <span>{project.assignedTo}</span>
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
          onClick={() => deleteProject(project.id)}
          className="h-8 px-2 text-black hover:bg-gray-200 hover:text-black"
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
}
