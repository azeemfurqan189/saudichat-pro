"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, PropertyListing, PropertyViewing } from "@/lib/api";
import { cn } from "@/lib/utils";

const PROPERTY_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "RENTED"];
const VIEWING_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"];

export default function PropertiesPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"listings" | "viewings">("listings");
  const [propForm, setPropForm] = useState({ title: "", listingType: "SALE", price: "", city: "", bedrooms: "" });
  const [viewForm, setViewForm] = useState({ propertyId: "", clientName: "", clientPhone: "", scheduledAt: "" });

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", businessId],
    queryFn: async () => (await api.getProperties(businessId)).data ?? [],
  });
  const { data: viewings = [] } = useQuery({
    queryKey: ["property-viewings", businessId],
    queryFn: async () => (await api.getPropertyViewings(businessId)).data ?? [],
  });
  const { data: stats } = useQuery({
    queryKey: ["industry-stats", businessId],
    queryFn: async () => (await api.getIndustryStats(businessId)).data,
  });

  const createProp = useMutation({
    mutationFn: (d: Partial<PropertyListing>) => api.createProperty(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties", businessId] }); qc.invalidateQueries({ queryKey: ["industry-stats", businessId] }); setPropForm({ title: "", listingType: "SALE", price: "", city: "", bedrooms: "" }); toast.success(isAr ? "تم" : "Added"); },
  });
  const updateProp = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateProperty(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties", businessId] }),
  });
  const createViewing = useMutation({
    mutationFn: (d: Partial<PropertyViewing>) => api.createPropertyViewing(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["property-viewings", businessId] }); setViewForm({ propertyId: "", clientName: "", clientPhone: "", scheduledAt: "" }); toast.success(isAr ? "تم" : "Viewing scheduled"); },
  });
  const updateViewing = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updatePropertyViewing(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property-viewings", businessId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "properties")}</h1>
        {stats && (
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30">{stats.availableListings ?? 0} {isAr ? "متاح" : "Available"}</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">{stats.upcomingViewings ?? 0} {isAr ? "معاينات" : "Viewings"}</span>
            <span className="px-3 py-1 rounded-full bg-muted">{stats.closedDeals ?? 0} {isAr ? "مغلقة" : "Closed"}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(["listings", "viewings"] as const).map((t_) => (
          <button key={t_} onClick={() => setTab(t_)} className={cn("px-4 py-2 rounded-xl text-sm font-medium", tab === t_ ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
            {t_ === "listings" ? (isAr ? "العقارات" : "Listings") : (isAr ? "المعاينات" : "Viewings")}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input placeholder={isAr ? "العنوان" : "Title"} value={propForm.title} onChange={(e) => setPropForm({ ...propForm, title: e.target.value })} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={propForm.listingType} onChange={(e) => setPropForm({ ...propForm, listingType: e.target.value })}>
              <option value="SALE">{isAr ? "بيع" : "Sale"}</option>
              <option value="RENT">{isAr ? "إيجار" : "Rent"}</option>
            </select>
            <Input placeholder={isAr ? "السعر" : "Price"} type="number" value={propForm.price} onChange={(e) => setPropForm({ ...propForm, price: e.target.value })} />
            <Input placeholder={isAr ? "المدينة" : "City"} value={propForm.city} onChange={(e) => setPropForm({ ...propForm, city: e.target.value })} />
            <Button onClick={() => propForm.title && createProp.mutate({ title: propForm.title, listingType: propForm.listingType, price: Number(propForm.price), city: propForm.city, bedrooms: propForm.bedrooms ? Number(propForm.bedrooms) : undefined, status: "AVAILABLE" })} loading={createProp.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            {properties.map((p) => (
              <Card key={p.id} className="p-4 flex justify-between gap-3">
                <div className="flex gap-3">
                  <Building className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.listingType} · {p.price.toLocaleString()} {p.currency} · {p.city} · {p.bedrooms ?? "-"} BR</p>
                  </div>
                </div>
                <select className="text-xs border rounded-lg px-2 py-1" value={p.status} onChange={(e) => updateProp.mutate({ id: p.id, status: e.target.value })}>
                  {PROPERTY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "viewings" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={viewForm.propertyId} onChange={(e) => setViewForm({ ...viewForm, propertyId: e.target.value })}>
              <option value="">{isAr ? "اختر عقار" : "Select property"}</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <Input placeholder={isAr ? "اسم العميل" : "Client name"} value={viewForm.clientName} onChange={(e) => setViewForm({ ...viewForm, clientName: e.target.value })} />
            <Input placeholder={isAr ? "الهاتف" : "Phone"} value={viewForm.clientPhone} onChange={(e) => setViewForm({ ...viewForm, clientPhone: e.target.value })} dir="ltr" />
            <Input type="datetime-local" value={viewForm.scheduledAt} onChange={(e) => setViewForm({ ...viewForm, scheduledAt: e.target.value })} />
            <Button onClick={() => viewForm.propertyId && viewForm.clientName && viewForm.scheduledAt && createViewing.mutate({ ...viewForm, status: "SCHEDULED" })} loading={createViewing.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            {viewings.map((v) => (
              <Card key={v.id} className="p-4 flex justify-between gap-3">
                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">{v.clientName}</p>
                    <p className="text-xs text-muted-foreground">{v.property?.title} · {new Date(v.scheduledAt).toLocaleString()}</p>
                  </div>
                </div>
                <select className="text-xs border rounded-lg px-2 py-1" value={v.status} onChange={(e) => updateViewing.mutate({ id: v.id, status: e.target.value })}>
                  {VIEWING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
