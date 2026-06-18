"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BedDouble, CalendarCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, HotelRoom, HotelReservation } from "@/lib/api";
import { cn } from "@/lib/utils";

const RES_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"];

export default function HotelPage() {
  const { businessId } = useParams() as { businessId: string };
  const { locale } = useApp();
  const isAr = locale === "ar";
  const qc = useQueryClient();
  const [tab, setTab] = useState<"rooms" | "reservations">("rooms");
  const [roomForm, setRoomForm] = useState({ roomNumber: "", roomType: "STANDARD", pricePerNight: "", maxGuests: "2" });
  const [resForm, setResForm] = useState({ roomId: "", guestName: "", guestPhone: "", checkIn: "", checkOut: "", guests: "1" });

  const { data: rooms = [] } = useQuery({ queryKey: ["hotel-rooms", businessId], queryFn: async () => (await api.getHotelRooms(businessId)).data ?? [] });
  const { data: reservations = [] } = useQuery({ queryKey: ["hotel-reservations", businessId], queryFn: async () => (await api.getHotelReservations(businessId)).data ?? [] });
  const { data: stats } = useQuery({ queryKey: ["industry-stats", businessId], queryFn: async () => (await api.getIndustryStats(businessId)).data });

  const createRoom = useMutation({
    mutationFn: (d: Partial<HotelRoom>) => api.createHotelRoom(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-rooms", businessId] }); setRoomForm({ roomNumber: "", roomType: "STANDARD", pricePerNight: "", maxGuests: "2" }); toast.success(isAr ? "تم" : "Room added"); },
  });
  const createRes = useMutation({
    mutationFn: (d: Partial<HotelReservation>) => api.createHotelReservation(businessId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-reservations", businessId] }); toast.success(isAr ? "تم الحجز" : "Reservation created"); },
  });
  const updateRes = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateHotelReservation(businessId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hotel-reservations", businessId] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "hotel")}</h1>
        {stats && (
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-muted">{stats.totalRooms ?? 0} {isAr ? "غرف" : "Rooms"}</span>
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30">{stats.occupiedRooms ?? 0} {isAr ? "مشغولة" : "Occupied"}</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">{stats.upcomingReservations ?? 0} {isAr ? "حجوزات" : "Bookings"}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(["rooms", "reservations"] as const).map((t_) => (
          <button key={t_} onClick={() => setTab(t_)} className={cn("px-4 py-2 rounded-xl text-sm font-medium", tab === t_ ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
            {t_ === "rooms" ? (isAr ? "الغرف" : "Rooms") : (isAr ? "الحجوزات" : "Reservations")}
          </button>
        ))}
      </div>

      {tab === "rooms" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input placeholder={isAr ? "رقم الغرفة" : "Room #"} value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={roomForm.roomType} onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}>
              <option value="STANDARD">{isAr ? "عادية" : "Standard"}</option>
              <option value="DELUXE">{isAr ? "ديلوكس" : "Deluxe"}</option>
              <option value="SUITE">{isAr ? "جناح" : "Suite"}</option>
            </select>
            <Input placeholder={isAr ? "السعر/ليلة" : "Price/night"} type="number" value={roomForm.pricePerNight} onChange={(e) => setRoomForm({ ...roomForm, pricePerNight: e.target.value })} />
            <Input placeholder={isAr ? "الضيوف" : "Max guests"} type="number" value={roomForm.maxGuests} onChange={(e) => setRoomForm({ ...roomForm, maxGuests: e.target.value })} />
            <Button onClick={() => roomForm.roomNumber && createRoom.mutate({ roomNumber: roomForm.roomNumber, roomType: roomForm.roomType, pricePerNight: Number(roomForm.pricePerNight), maxGuests: Number(roomForm.maxGuests), isAvailable: true })} loading={createRoom.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-3 gap-3">
            {rooms.map((r) => (
              <Card key={r.id} className="p-4 flex gap-3">
                <BedDouble className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">#{r.roomNumber} — {r.roomType}</p>
                  <p className="text-xs text-muted-foreground">{r.pricePerNight} SAR/night · {r.maxGuests} guests · {r.isAvailable ? (isAr ? "متاحة" : "Available") : (isAr ? "محجوزة" : "Booked")}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "reservations" && (
        <>
          <Card className="p-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={resForm.roomId} onChange={(e) => setResForm({ ...resForm, roomId: e.target.value })}>
              <option value="">{isAr ? "الغرفة" : "Room"}</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>#{r.roomNumber}</option>)}
            </select>
            <Input placeholder={isAr ? "اسم الضيف" : "Guest"} value={resForm.guestName} onChange={(e) => setResForm({ ...resForm, guestName: e.target.value })} />
            <Input placeholder={isAr ? "الهاتف" : "Phone"} value={resForm.guestPhone} onChange={(e) => setResForm({ ...resForm, guestPhone: e.target.value })} dir="ltr" />
            <Input type="date" value={resForm.checkIn} onChange={(e) => setResForm({ ...resForm, checkIn: e.target.value })} />
            <Input type="date" value={resForm.checkOut} onChange={(e) => setResForm({ ...resForm, checkOut: e.target.value })} />
            <Button onClick={() => resForm.roomId && resForm.guestName && resForm.checkIn && resForm.checkOut && createRes.mutate({ ...resForm, guests: Number(resForm.guests), status: "PENDING" })} loading={createRes.isPending}><Plus className="w-4 h-4" /></Button>
          </Card>
          <div className="grid md:grid-cols-2 gap-3">
            {reservations.map((r) => (
              <Card key={r.id} className="p-4 flex justify-between gap-3">
                <div className="flex gap-3">
                  <CalendarCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{r.guestName} — #{r.room?.roomNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.checkIn).toLocaleDateString()} → {new Date(r.checkOut).toLocaleDateString()}</p>
                  </div>
                </div>
                <select className="text-xs border rounded-lg px-2 py-1" value={r.status} onChange={(e) => updateRes.mutate({ id: r.id, status: e.target.value })}>
                  {RES_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
