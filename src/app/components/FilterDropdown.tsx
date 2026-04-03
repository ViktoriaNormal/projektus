import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface FilterDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  renderOption: (option: string) => string;
}

export function FilterDropdown({
  label, options, selectedValues, onToggle, renderOption,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredOptions = options.filter((o) => renderOption(o).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 border rounded-full transition-colors text-left flex items-center gap-2 whitespace-nowrap ${
          selectedValues.length > 0
            ? "border-blue-300 bg-blue-50 text-blue-700"
            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
        }`}
      >
        <span className="text-sm font-medium">{label}</span>
        {selectedValues.length > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold leading-none">{selectedValues.length}</span>
        )}
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-64 min-w-[220px] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2">
              {filteredOptions.length > 0 ? (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedValues.includes(option)} onChange={() => onToggle(option)} className="rounded text-blue-600" />
                      <span className="text-sm">{renderOption(option)}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">Ничего не найдено</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
