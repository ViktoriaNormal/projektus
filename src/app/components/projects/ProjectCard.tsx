import { useState } from "react";
import { Link } from "react-router";
import { Copy, Check } from "lucide-react";
import type { ProjectResponse } from "../../api/projects";
import type { UserProfileResponse } from "../../api/users";
import { UserAvatar } from "../UserAvatar";
import { projectStatusColor, projectStatusLabel } from "../../lib/status-colors";
import { formatDate } from "../../lib/format";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 p-1 rounded hover:bg-blue-50"
      title="Скопировать"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}

interface ProjectCardProps {
  project: ProjectResponse;
  owner?: UserProfileResponse;
}

export function ProjectCard({ project, owner }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-all flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-mono font-bold rounded flex items-center gap-1">
          {project.key}
          <CopyButton text={project.key} />
        </span>
        <span
          className={`px-2 py-0.5 text-xs font-semibold rounded ${
            project.projectType === "scrum"
              ? "bg-blue-100 text-blue-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {project.projectType === "scrum" ? "Scrum" : "Kanban"}
        </span>
        <span
          className={`ml-auto px-3 py-1 text-xs font-semibold rounded border ${projectStatusColor(project.status)}`}
        >
          {projectStatusLabel(project.status)}
        </span>
      </div>

      <h3 className="text-xl font-bold break-words mb-2">{project.name}</h3>

      <p className="text-slate-600 text-sm mb-4 line-clamp-2 whitespace-pre-wrap">{project.description}</p>

      <div className="flex items-center gap-2 mb-3">
        {owner && (
          <UserAvatar user={{ fullName: owner.fullName, avatarUrl: owner.avatarUrl }} size="sm" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">Ответственный</p>
          <p className="text-sm font-medium truncate">{owner?.fullName || "—"}</p>
          {owner?.username && (
            <p className="text-xs text-slate-500 truncate">{owner.username}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Дата создания: {formatDate(project.createdAt, "long")}
      </p>

      <div className="mt-auto pt-4">
        <Link
          to={`/projects/${project.id}`}
          className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center rounded-lg transition-all shadow-sm font-medium"
        >
          Перейти к проекту
        </Link>
      </div>
    </div>
  );
}
