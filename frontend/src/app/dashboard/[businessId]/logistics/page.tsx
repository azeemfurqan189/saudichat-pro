"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Shipment, FleetVehicle } from "@/lib/api";
import { cn } from "@/lib/utils";

const SHIP_STATUSES = ["PENDING", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const FLEET_STATUSES = ["AVAILABLE", "ON_ROUTE", "MAINTENANCE"];

export default function LogisticsPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"shipments" | "fleet">("shipments");
  const [shipForm, setShipForm] = useState({ senderName: "", recipientName: "", origin: "", destination: "", weightKg: "" });
  const [fleetForm, setFleetForm] = useState({ plateNumber: "", driverName: "", driverPhone: "", vehicleType: "VAN" });

  const { data: shipments = [] } = useQuery({ queryKey: ["shipments", businessId], queryFn: async () => (await api.getShipments(businessId)).data ?? [] });
  const { data: fleet = [] } = useQuery({ queryKey: ["fleet", businessId], queryFn: async () => (await api.getFleetVehicles(businessId)).data ?? [] });
  const { data: stats } = useQuery({ queryKey: ["industry-stats", businessId], queryFn: async () => (await api.getIndustryStats(businessId)).data });

  const createShip = useMutation({
    mutationFn: (d: Partial<Shipment>) => api.createShipment(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shipments", businessId] }); setShipForm({ senderName: "", recipientName: "", origin: "", destination: "", weightKg: "" }); toast.success(isAr ? "تم" : "Shipment created"); },
  });
  const updateShip = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateShipment(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipments", businessId] }),
  });
  const createFleet = useMutation({
    mutationFn: (d: Partial<FleetVehicle>) => api.createFleetVehicle(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fleet", businessId] }); setFleetForm({ plateNumber: "", driverName: "", driverPhone: "", vehicleType: "VAN" }); toast.success(isAr ? "تم" : "Vehicle added"); },
  });
  const updateFleet = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateFleetVehicle(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fleet", businessId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "logistics")}</h1>
        {stats && (
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">{stats.activeShipments ?? 0} {isAr ? "نشطة" : "Active"}</span>
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30">{stats.deliveredShipments ?? 0} {isAr ? "مُسلّمة" : "Delivered"}</span>
            <span className="px-3 py-1 rounded-full bg-muted">{stats.availableVehicles ?? 0} {isAr ? "مركبات" : "Vehicles"}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(["shipments", "fleet"] as const).map((t_) => (
          <button key={t_} onClick={() => setTab(t_)} className={cn("px-4 py-2 rounded-xl text-sm font-medium", tab === t_ ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
            {t_ === "shipments" ? (isAr ? "الشحنات" : "Shipments") : (isAr ? "الأسطول" : "Fleet")}
          </button>
        ))}
      </div>

      {tab === "shipments" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <Input placeholder={isAr ? "المرسل" : "Sender"} value={shipForm.senderName} onChange={(e) => setShipForm({ ...shipForm, senderName: e.target.value })} />
            <Input placeholder={isAr ? "المستلم" : "Recipient"} value={shipForm.recipientName} onChange={(e) => setShipForm({ ...shipForm, recipientName: e.target.value })} />
            <Input placeholder={isAr ? "من" : "Origin"} value={shipForm.origin} onChange={(e) => setShipForm({ ...shipForm, origin: e.target.value })} />
            <Input placeholder={isAr ? "إلى" : "Destination"} value={shipForm.destination} onChange={(e) => setShipForm({ ...shipForm, destination: e.target.value })} />
            <Input placeholder="kg" type="number" value={shipForm.weightKg} onChange={(e) => setShipForm({ ...shipForm, weightKg: e.target.value })} />
            <Button onClick={() => shipForm.senderName && shipForm.recipientName && shipForm.origin && shipForm.destination && createShip.mutate({ ...shipForm, weightKg: shipForm.weightKg ? Number(shipForm.weightKg) : undefined, status: "PENDING" })} loading={createShip.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            {shipments.map((s) => (
              <Card key={s.id} className="p-4 flex justify-between gap-3">
                <div className="flex gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{s.trackingNumber}</p>
                    <p className="text-xs text-muted-foreground">{s.origin} → {s.destination} · {s.recipientName}</p>
                  </div>
                </div>
                <select className="text-xs border rounded-lg px-2 py-1" value={s.status} onChange={(e) => updateShip.mutate({ id: s.id, status: e.target.value })}>
                  {SHIP_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "fleet" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input placeholder={isAr ? "رقم اللوحة" : "Plate #"} value={fleetForm.plateNumber} onChange={(e) => setFleetForm({ ...fleetForm, plateNumber: e.target.value })} dir="ltr" />
            <Input placeholder={isAr ? "السائق" : "Driver"} value={fleetForm.driverName} onChange={(e) => setFleetForm({ ...fleetForm, driverName: e.target.value })} />
            <Input placeholder={isAr ? "الهاتف" : "Phone"} value={fleetForm.driverPhone} onChange={(e) => setFleetForm({ ...fleetForm, driverPhone: e.target.value })} dir="ltr" />
            <select className="border rounded-lg px-3 py-2 text-sm" value={fleetForm.vehicleType} onChange={(e) => setFleetForm({ ...fleetForm, vehicleType: e.target.value })}>
              <option value="VAN">Van</option>
              <option value="TRUCK">Truck</option>
              <option value="BIKE">Bike</option>
            </select>
            <Button onClick={() => fleetForm.plateNumber && createFleet.mutate({ ...fleetForm, status: "AVAILABLE" })} loading={createFleet.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-3 gap-3">
            {fleet.map((v) => (
              <Card key={v.id} className="p-4 flex justify-between gap-3">
                <div className="flex gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{v.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">{v.driverName} · {v.vehicleType}</p>
                  </div>
                </div>
                <select className="text-xs border rounded-lg px-2 py-1" value={v.status} onChange={(e) => updateFleet.mutate({ id: v.id, status: e.target.value })}>
                  {FLEET_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
