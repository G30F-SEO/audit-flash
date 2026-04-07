import { CheckCircle, XCircle } from 'lucide-react';

export default function CheckItem({ ok, label, detail }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-btn bg-bg-card border border-border">
      {ok ? <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary leading-tight">{label}</p>
        {detail && <p className="text-xs text-text-secondary truncate mt-0.5" title={detail}>{detail}</p>}
      </div>
    </div>
  );
}
