"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function ReviewsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", businessId],
    queryFn: async () => (await api.getReviews(businessId)).data,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createReview(businessId, { rating: parseInt(rating, 10), comment, source: "dashboard" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews", businessId] }); setComment(""); toast.success(isAr ? "تم" : "Review added"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "reviews")}</h1>
        {data && (
          <div className="flex items-center gap-2 text-lg font-bold">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            {data.avgRating} ({data.total})
          </div>
        )}
      </div>
      <Card className="p-4 flex gap-3 flex-wrap">
        <Input type="number" min={1} max={5} className="w-20" value={rating} onChange={(e) => setRating(e.target.value)} />
        <Input className="flex-1" placeholder={isAr ? "تعليق" : "Comment"} value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>{t(locale, "dashboard", "add")}</Button>
      </Card>
      {isLoading ? <p>{t(locale, "dashboard", "loading")}</p> : (
        <div className="space-y-3">
          {data?.reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</span>
              </div>
              <p className="text-sm">{r.comment || "—"}</p>
              {r.customer?.name && <p className="text-xs text-muted-foreground mt-1">{r.customer.name}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
