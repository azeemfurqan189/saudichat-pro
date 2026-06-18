"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Task } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function TasksPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", businessId, filter],
    queryFn: async () => (await api.getTasks(businessId, filter === "all" ? undefined : filter)).data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => api.createTask(businessId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", businessId] });
      setTitle("");
      toast.success(isAr ? "تمت إضافة المهمة" : "Task added");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateTask(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", businessId] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(locale, "dashboard", "tasks")}</h1>

      <div className="flex gap-2 flex-wrap">
        {["all", "TODO", "IN_PROGRESS", "DONE"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium",
              filter === s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {s === "all" ? t(locale, "dashboard", "all") : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card className="p-4 flex gap-3">
        <Input
          className="flex-1"
          placeholder={isAr ? "مهمة جديدة..." : "New task..."}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title.trim() && createMutation.mutate({ title, status: "TODO", priority: "MEDIUM" })}
        />
        <Button onClick={() => title.trim() && createMutation.mutate({ title, status: "TODO", priority: "MEDIUM" })} loading={createMutation.isPending}>
          <Plus className="w-4 h-4" />
        </Button>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">{t(locale, "dashboard", "loading")}</p>
      ) : tasks.length === 0 ? (
        <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 flex items-center gap-3">
              <button onClick={() => updateMutation.mutate({ id: task.id, status: task.status === "DONE" ? "TODO" : "DONE" })}>
                {task.status === "DONE" ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
              </button>
              <div className="flex-1">
                <p className={cn("font-medium", task.status === "DONE" && "line-through text-muted-foreground")}>{task.title}</p>
                {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
              </div>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", task.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-muted")}>
                {task.priority}
              </span>
              {task.status !== "DONE" && (
                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: task.id, status: "IN_PROGRESS" })}>
                  {isAr ? "بدء" : "Start"}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
