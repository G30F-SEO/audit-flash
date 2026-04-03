import { CheckCircle, XCircle } from "lucide-react";

interface CheckItemProps {
  ok: boolean;
  label: string;
  detail?: string;
}

export default function CheckItem({ ok, label, detail }: CheckItemProps) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-100">
      {ok ? (
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 leading-tight">{label}</p>
        {detail && (
          <p className="text-xs text-slate-400 truncate mt-0.5" title={detail}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
