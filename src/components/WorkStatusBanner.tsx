import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { setWorkStatus, getMyWorkStatus } from "@/services/api";
import WorkStatusModal from "./WorkStatusModal";
import { CalendarOff, CheckCircle2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WorkStatusBanner() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "not_checked_in" | "working" | "not_working">("loading");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getMyWorkStatus().then((ws) => {
      if (!ws) setStatus("not_checked_in");
      else setStatus(ws.is_working ? "working" : "not_working");
    });
  }, []);

  const handleWorkingClick = () => {
    // Always show the modal on every click per requirements
    setShowModal(true);
  };

  const handleModalConfirm = async () => {
    setShowModal(false);
    const ok = await setWorkStatus(true);
    if (ok) {
      setStatus("working");
      toast({ title: "✅ Checked in", description: "You're logged as working today. Deliver great work!" });
    }
  };

  if (status === "loading") return null;

  if (status === "working") {
    return (
      <>
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">You're checked in and working today — keep up the great work!</span>
          </div>
          <button
            onClick={() => navigate("/work-status")}
            className="text-xs text-emerald-600 hover:underline underline-offset-2"
          >
            Apply for future leave →
          </button>
        </div>
        <WorkStatusModal open={showModal} onConfirm={handleModalConfirm} />
      </>
    );
  }

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-amber-800">
          <Zap className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span className="text-sm font-medium">You haven't checked in for today. Let the team know you're working.</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 rounded-lg"
            onClick={handleWorkingClick}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            I'm Working Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs px-3 rounded-lg border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => navigate("/work-status")}
          >
            <CalendarOff className="h-3.5 w-3.5 mr-1" />
            Apply Leave
          </Button>
        </div>
      </div>
      <WorkStatusModal open={showModal} onConfirm={handleModalConfirm} />
    </>
  );
}
