"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  List,
  Search,
  Check,
  X,
  Clock,
  User,
  Scissors,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Appointment } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

const STATUS_FILTERS = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const statusLabels: Record<string, { en: string; ar: string }> = {
  ALL: { en: "All", ar: "الكل" },
  PENDING: { en: "Pending", ar: "معلق" },
  CONFIRMED: { en: "Confirmed", ar: "مؤكد" },
  COMPLETED: { en: "Completed", ar: "مكتمل" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
  NO_SHOW: { en: "No Show", ar: "لم يحضر" },
};

function statusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "PENDING") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (s === "CONFIRMED") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (s === "COMPLETED") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "CANCELLED" || s === "NO_SHOW") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function CalendarView({
  appointments,
  locale,
  onConfirm,
  onCancel,
  onComplete,
}: {
  appointments: Appointment[];
  locale: "en" | "ar";
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((apt) => {
      const date = apt.date.split("T")[0];
      if (!map[date]) map[date] = [];
      map[date].push(apt);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  if (grouped.length === 0) {
    return (
      <div className="glass-card text-center py-16">
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([date, dayAppointments]) => (
        <div key={date}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {formatDate(date, locale)}
            <span className="text-xs text-muted-foreground font-normal">
              ({dayAppointments.length})
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dayAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                locale={locale}
                onConfirm={
                  apt.status.toUpperCase() === "PENDING" ? () => onConfirm(apt.id) : undefined
                }
                onComplete={
                  ["PENDING", "CONFIRMED"].includes(apt.status.toUpperCase())
                    ? () => onComplete(apt.id)
                    : undefined
                }
                onCancel={
                  ["PENDING", "CONFIRMED"].includes(apt.status.toUpperCase())
                    ? () => onCancel(apt.id)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AppointmentCard({
  appointment,
  locale,
  onConfirm,
  onCancel,
  onComplete,
}: {
  appointment: Appointment;
  locale: "en" | "ar";
  onConfirm?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const status = appointment.status.toUpperCase();

  return (
    <Card className="!hover:scale-[1.01]">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {(appointment.customer?.name || "C")[0]}
            </div>
            <div>
              <p className="font-medium">{appointment.customer?.name || appointment.customerId}</p>
              {appointment.serviceName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Scissors className="w-3 h-3" />
                  {appointment.serviceName}
                </p>
              )}
            </div>
          </div>
          <span className={cn("text-xs px-2 py-1 rounded-full capitalize", statusColor(appointment.status))}>
            {appointment.status.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {appointment.startTime} – {appointment.endTime}
          </span>
          {appointment.staff && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {appointment.staff.name}
            </span>
          )}
        </div>

        {appointment.notes && (
          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">{appointment.notes}</p>
        )}

        {/* Quick actions */}
        {(onConfirm || onCancel || onComplete) && (
          <div className="flex gap-2 pt-1">
            {status === "PENDING" && onConfirm && (
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={onConfirm}>
                <Check className="w-3.5 h-3.5" />
                {t(locale, "dashboard", "confirm")}
              </Button>
            )}
            {(status === "PENDING" || status === "CONFIRMED") && onComplete && (
              <Button size="sm" className="flex-1 gap-1 btn-primary" onClick={onComplete}>
                <Check className="w-3.5 h-3.5" />
                {locale === "ar" ? "إكمال" : "Complete"}
              </Button>
            )}
            {(status === "PENDING" || status === "CONFIRMED") && onCancel && (
              <Button size="sm" variant="destructive" className="gap-1" onClick={onCancel}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AppointmentsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: appointments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["appointments", businessId, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.getAppointments(businessId, params);
      return res.data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      api.updateAppointment(businessId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", businessId] });
      toast.success(locale === "ar" ? "تم التحديث" : "Updated successfully");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t(locale, "dashboard", "error"));
    },
  });

  const filteredAppointments = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (a) =>
        a.customer?.name?.toLowerCase().includes(q) ||
        a.serviceName?.toLowerCase().includes(q) ||
        a.staff?.name?.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "appointments")}</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            {locale === "ar" ? "تقويم" : "Calendar"}
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1.5"
          >
            <List className="w-4 h-4" />
            {locale === "ar" ? "قائمة" : "List"}
          </Button>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(locale, "dashboard", "search")}
            className="w-full h-10 ps-10 pe-4 rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 text-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="w-4 h-4" />
          {t(locale, "common", "status")}
        </Button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex gap-1 flex-wrap"
        >
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                statusFilter === status
                  ? "bg-gradient-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {statusLabels[status]?.[locale] ?? status}
            </button>
          ))}
        </motion.div>
      )}

      {/* Content */}
      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : isError ? (
        <div className="glass-card text-center py-16 space-y-4">
          <p className="text-muted-foreground">{t(locale, "dashboard", "error")}</p>
          <Button onClick={() => refetch()}>{t(locale, "dashboard", "retry")}</Button>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="glass-card text-center py-16">
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </div>
      ) : viewMode === "calendar" ? (
        <CalendarView
          appointments={filteredAppointments}
          locale={locale}
          onConfirm={(id) => updateMutation.mutate({ id, data: { status: "CONFIRMED" } })}
          onComplete={(id) => updateMutation.mutate({ id, data: { status: "COMPLETED" } })}
          onCancel={(id) => updateMutation.mutate({ id, data: { status: "CANCELLED" } })}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map((apt, i) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <AppointmentCard
                appointment={apt}
                locale={locale}
                onConfirm={
                  apt.status.toUpperCase() === "PENDING"
                    ? () => updateMutation.mutate({ id: apt.id, data: { status: "CONFIRMED" } })
                    : undefined
                }
                onComplete={
                  ["PENDING", "CONFIRMED"].includes(apt.status.toUpperCase())
                    ? () => updateMutation.mutate({ id: apt.id, data: { status: "COMPLETED" } })
                    : undefined
                }
                onCancel={
                  ["PENDING", "CONFIRMED"].includes(apt.status.toUpperCase())
                    ? () => updateMutation.mutate({ id: apt.id, data: { status: "CANCELLED" } })
                    : undefined
                }
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
