import React from "react";
import { AlertTriangle, XCircle } from "lucide-react";

interface DelayedService {
  id: string;
  name: string;
  expectedByNow: number;
  actual: number;
  gap: number;
  delayStatus: "critical" | "warning" | "on_track";
  projectName?: string;
  frequency: string;
}

interface DelayAlertBannerProps {
  services: DelayedService[];
}

export default function DelayAlertBanner({ services }: DelayAlertBannerProps) {
  const delayed = services.filter((s) => s.delayStatus !== "on_track");
  if (delayed.length === 0) return null;

  const criticalCount = delayed.filter((s) => s.delayStatus === "critical").length;

  return (
    <div className="mb-5 rounded-2xl border overflow-hidden shadow-sm">
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${criticalCount > 0 ? "bg-red-600" : "bg-amber-500"} text-white`}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="font-semibold text-sm">
          ⚠️ Delivery Delay Alert — {delayed.length} service{delayed.length > 1 ? "s" : ""} behind schedule
        </span>
        {criticalCount > 0 && (
          <span className="ml-auto bg-white/20 rounded-full text-xs px-2.5 py-0.5 font-bold">
            {criticalCount} CRITICAL
          </span>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100 bg-white">
        {delayed.map((svc) => {
          const isCritical = svc.delayStatus === "critical";
          return (
            <div key={svc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <XCircle
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isCritical ? "text-red-500" : "text-amber-500"}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{svc.name}</p>
                  {svc.projectName && (
                    <p className="text-xs text-gray-400">Project: {svc.projectName}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center text-xs sm:ml-auto">
                <span className="text-gray-500">
                  Expected: <strong className="text-gray-700">{svc.expectedByNow}</strong>
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">
                  Done: <strong className="text-emerald-600">{svc.actual}</strong>
                </span>
                <span className="text-gray-400">·</span>
                <span className={`font-bold ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                  {svc.gap} behind
                </span>
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                    isCritical
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isCritical ? "Critical" : "Warning"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
