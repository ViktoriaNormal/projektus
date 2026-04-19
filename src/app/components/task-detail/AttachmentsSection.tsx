import { Paperclip, Plus, Download, Trash2 } from "lucide-react";
import type { AttachmentResponse } from "../../api/attachments";

interface AttachmentsSectionProps {
  attachments: AttachmentResponse[];
  canEditTask: boolean;
  isCreateMode: boolean;
  onAdd: () => void;
  onDownload: (att: AttachmentResponse) => void;
  onDelete: (attId: string) => void;
}

export function AttachmentsSection({
  attachments,
  canEditTask,
  isCreateMode,
  onAdd,
  onDownload,
  onDelete,
}: AttachmentsSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Paperclip size={18} /> Вложения ({attachments.length})
        </h2>
        {canEditTask && (
          <button
            onClick={onAdd}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={16} /> Добавить
          </button>
        )}
      </div>
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Paperclip size={14} className="text-slate-400" />
                    <span className="text-sm font-medium">{att.fileName}</span>
                  </div>
                  <div className="text-xs text-slate-500 ml-5">
                    {(att.fileSize / 1024 / 1024).toFixed(2)} МБ
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isCreateMode && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onDownload(att);
                      }}
                      className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Скачать"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  {canEditTask && (
                    <button
                      onClick={() => onDelete(att.id)}
                      className="opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 py-3">Нет вложений</p>
      )}
    </div>
  );
}
