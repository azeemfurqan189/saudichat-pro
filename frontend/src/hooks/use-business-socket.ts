"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import { getSocketBaseUrl } from "@/lib/api-config";

export function useBusinessSocket(businessId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!businessId || typeof window === "undefined") return;

    const socket = io(getSocketBaseUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.emit("join-business", businessId);

    socket.on("new-order", (payload: { orderNumber?: string; total?: number }) => {
      const num = payload.orderNumber || "New";
      const total = payload.total != null ? ` — ${payload.total} SAR` : "";
      toast.success(`New order ${num}${total}`, {
        description: "Open Orders to view details",
        duration: 8000,
      });
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // ignore if audio blocked
      }
      queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      queryClient.invalidateQueries({ queryKey: ["notifications", businessId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", businessId] });
    });

    return () => {
      socket.emit("leave-business", businessId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [businessId, queryClient]);
}
