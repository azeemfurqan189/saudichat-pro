"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, MapPin, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api-config";

type CheckInInfo = {
  workerName: string;
  businessName: string;
  projects: Array<{ id: string | null; name?: string; clientName?: string }>;
};

export default function PublicCheckInPage() {
  const { token } = useParams() as { token: string };
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get("projectId") || undefined;

  const [info, setInfo] = useState<CheckInInfo | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(projectFromUrl);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${getApiUrl()}/public/check-in/${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setInfo(res.data);
          if (!projectFromUrl && res.data.projects?.[0]?.id) {
            setProjectId(res.data.projects[0].id || undefined);
          }
        } else {
          setError(res.message || "Invalid code");
        }
      })
      .catch(() => setError("Could not load check-in"));
  }, [token, projectFromUrl]);

  const submitCheckIn = async () => {
    setStatus("loading");
    setError("");
    let lat: number | undefined;
    let lng: number | undefined;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* GPS optional */
      }
    }

    try {
      const res = await fetch(`${getApiUrl()}/public/check-in/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, projectId, lat, lng }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus("error");
        setError(data.message || "Check-in failed");
        return;
      }
      setStatus("success");
      setMessage(data.data?.message || "Checked in");
    } catch {
      setStatus("error");
      setError("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <QrCode className="w-10 h-10 mx-auto text-primary mb-2" />
          <CardTitle className="text-lg">Worker Check-In</CardTitle>
          <p className="text-xs text-muted-foreground">SaudiChat Pro · QR Attendance</p>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {error && !info && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          {info && (
            <>
              <div className="text-center">
                <p className="font-semibold">{info.workerName}</p>
                <p className="text-xs text-muted-foreground">{info.businessName}</p>
              </div>

              {info.projects.length > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground">Project / Site</label>
                  <select
                    className="w-full mt-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={projectId || ""}
                    onChange={(e) => setProjectId(e.target.value || undefined)}
                  >
                    {info.projects.map((p) => (
                      <option key={p.id || p.name} value={p.id || ""}>
                        {p.name} {p.clientName ? `(${p.clientName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {status === "success" ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="font-medium text-green-600">{message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleString()}</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center">
                    <MapPin className="w-3 h-3" />
                    GPS used for geo-fence when project has coordinates
                  </p>
                  {error && status === "error" && (
                    <p className="text-xs text-red-500 text-center">{error}</p>
                  )}
                  <Button className="w-full" onClick={submitCheckIn} loading={status === "loading"}>
                    Check In — Present
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
