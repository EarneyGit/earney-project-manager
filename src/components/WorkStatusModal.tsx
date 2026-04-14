import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart2, Brain, Calendar, CheckCircle2, Shield } from "lucide-react";

interface WorkStatusModalProps {
  open: boolean;
  onConfirm: () => void;
}

export default function WorkStatusModal({ open, onConfirm }: WorkStatusModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-gray-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">System Notice</p>
              <h2 className="text-lg font-bold leading-tight">AI Performance Monitoring — Active</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            By checking in today, you acknowledge that this workspace actively tracks your productivity
            and deliverable commitments. Here is what's being monitored:
          </p>

          <div className="space-y-3">
            {[
              {
                Icon: BarChart2,
                color: "text-indigo-600 bg-indigo-50",
                title: "Deliverable tracking",
                body: "Your task completions are measured daily against the client's agreed deliverable schedule. Any shortfall is flagged immediately to your admin.",
              },
              {
                Icon: AlertTriangle,
                color: "text-rose-600 bg-rose-50",
                title: "Performance impact",
                body: "Repeated delays beyond the given duration may directly affect your performance score and salary review decisions.",
              },
              {
                Icon: Calendar,
                color: "text-amber-600 bg-amber-50",
                title: "Loss of Pay (LOP)",
                body: "Unplanned absences and late delivery of work beyond the given duration are logged as Loss of Pay automatically.",
              },
              {
                Icon: Brain,
                color: "text-violet-600 bg-violet-50",
                title: "AI productivity reports",
                body: "Your weekly productivity trend is analysed by AI and performance reports are shared with leadership.",
              },
            ].map(({ Icon, color, title, body }) => (
              <div key={title} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">This system exists to help you. </span>
              Consistent performance earns recognition, growth, and higher contribution value for both you and the company.
            </p>
          </div>

          <Button
            onClick={onConfirm}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            I Understand — Start Working
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
