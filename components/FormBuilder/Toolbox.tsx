import { QuestionType } from "@prisma/client";
import { Type, AlignLeft, Hash, Mail, Phone, List, CheckSquare, CircleDot, Calendar, Upload, SeparatorHorizontal } from "lucide-react";

const TOOLBOX_ITEMS = [
  { type: "SHORT_TEXT", label: "Short Text", icon: Type },
  { type: "PARAGRAPH", label: "Paragraph", icon: AlignLeft },
  { type: "NUMBER", label: "Number", icon: Hash },
  { type: "EMAIL", label: "Email", icon: Mail },
  { type: "PHONE", label: "Phone", icon: Phone },
  { type: "DROPDOWN", label: "Dropdown", icon: List },
  { type: "CHECKBOX", label: "Checkbox", icon: CheckSquare },
  { type: "RADIO", label: "Multiple Choice", icon: CircleDot },
  { type: "DATE", label: "Date", icon: Calendar },
  { type: "FILE_UPLOAD", label: "File Upload", icon: Upload },
  { type: "SECTION_BREAK", label: "Page Break", icon: SeparatorHorizontal },
];

export default function Toolbox({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest px-1">Form Elements</h3>
      <div className="grid grid-cols-1 gap-3">
        {TOOLBOX_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.type}
              onClick={() => onAdd(item.type as QuestionType)}
              className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-primary-200 hover:shadow-md hover:scale-[1.02] transition-all text-left group"
            >
              <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-colors">
                <Icon size={18} />
              </div>
              <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
