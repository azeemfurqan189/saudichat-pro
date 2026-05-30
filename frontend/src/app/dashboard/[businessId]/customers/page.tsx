"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  Crown,
  ShoppingBag,
  MessageSquare,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Customer } from "@/lib/api";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";

const SEGMENTS = [
  { id: "all", labelEn: "All Customers", labelAr: "كل العملاء", icon: Users },
  { id: "vip", labelEn: "VIP", labelAr: "VIP", icon: Crown, filter: (c: Customer) => c.totalSpent >= 5000 },
  { id: "active", labelEn: "Active", labelAr: "نشط", icon: ShoppingBag, filter: (c: Customer) => c.totalOrders >= 3 },
  { id: "new", labelEn: "New", labelAr: "جدد", icon: Users, filter: (c: Customer) => c.totalOrders === 0 },
];

export default function CustomersPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const isAr = locale === "ar";

  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", businessId],
    queryFn: async () => {
      const res = await api.getCustomers(businessId);
      return res.data ?? [];
    },
  });

  const { data: customerDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["customer", businessId, selectedId],
    queryFn: async () => {
      const res = await api.getCustomer(businessId, selectedId!);
      return res.data;
    },
    enabled: !!selectedId,
  });

  const filtered = useMemo(() => {
    const seg = SEGMENTS.find((s) => s.id === segment);
    let list = customers;

    if (seg?.filter) list = list.filter(seg.filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customers, segment, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "customers")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? `${filtered.length} عميل` : `${filtered.length} customers`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Segments sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-2">
          {SEGMENTS.map(({ id, labelEn, labelAr, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSegment(id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                segment === id
                  ? "bg-gradient-primary text-white shadow-glow-green"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {isAr ? labelAr : labelEn}
            </button>
          ))}
        </aside>

        <div className="flex-1 space-y-4 min-w-0">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث بالاسم أو الجوال..." : "Search by name or phone..."}
              className="w-full h-11 ps-10 pe-4 rounded-xl border border-border bg-white/50 dark:bg-gray-900/50 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <Card className="text-center py-16">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((customer, i) => (
                <motion.button
                  key={customer.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedId(customer.id)}
                  className="glass-card text-start hover:ring-2 hover:ring-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {getInitials(customer.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground" dir="ltr">
                        {customer.phone}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="font-bold">{customer.totalOrders}</p>
                      <p className="text-muted-foreground">{isAr ? "طلبات" : "Orders"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="font-bold">
                        {formatCurrency(customer.totalSpent, isAr ? "ar-SA" : "en-SA")}
                      </p>
                      <p className="text-muted-foreground">{isAr ? "إنفاق" : "Spent"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="font-bold">{customer.loyaltyPoints}</p>
                      <p className="text-muted-foreground">{isAr ? "نقاط" : "Points"}</p>
                    </div>
                  </div>
                  {customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {customer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="glass-card overflow-x-auto !p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-start p-4">{t(locale, "common", "name")}</th>
                    <th className="text-start p-4">{t(locale, "common", "phone")}</th>
                    <th className="text-start p-4">{isAr ? "الطلبات" : "Orders"}</th>
                    <th className="text-start p-4">{isAr ? "الإنفاق" : "Spent"}</th>
                    <th className="text-start p-4">{isAr ? "آخر تفاعل" : "Last Active"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedId(customer.id)}
                      className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-medium">{customer.name}</td>
                      <td className="p-4" dir="ltr">
                        {customer.phone}
                      </td>
                      <td className="p-4">{customer.totalOrders}</td>
                      <td className="p-4">
                        {formatCurrency(customer.totalSpent, isAr ? "ar-SA" : "en-SA")}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {customer.lastInteraction
                          ? formatDate(customer.lastInteraction, locale)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Profile drawer */}
      <AnimatePresence>
        {selectedId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedId(null)}
            />
            <motion.aside
              initial={{ x: isAr ? -400 : 400 }}
              animate={{ x: 0 }}
              exit={{ x: isAr ? -400 : 400 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 end-0 w-full max-w-md glass z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-lg">
                      {getInitials(customerDetail?.name || "?")}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{customerDetail?.name}</h2>
                      <p className="text-sm text-muted-foreground" dir="ltr">
                        {customerDetail?.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-2 rounded-lg hover:bg-muted"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {detailLoading ? (
                  <TableSkeleton rows={4} />
                ) : customerDetail ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="!p-4 text-center">
                        <p className="text-2xl font-bold">{customerDetail.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? "طلبات" : "Orders"}</p>
                      </Card>
                      <Card className="!p-4 text-center">
                        <p className="text-2xl font-bold">{customerDetail.loyaltyPoints}</p>
                        <p className="text-xs text-muted-foreground">{isAr ? "نقاط" : "Points"}</p>
                      </Card>
                    </div>

                    {customerDetail.notes && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">{isAr ? "ملاحظات" : "Notes"}</h3>
                        <p className="text-sm text-muted-foreground">{customerDetail.notes}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        {isAr ? "سجل الطلبات" : "Order History"}
                      </h3>
                      {customerDetail.orders?.length ? (
                        <div className="space-y-2">
                          {customerDetail.orders.slice(0, 5).map((order) => (
                            <div
                              key={order.id}
                              className="flex justify-between items-center p-3 rounded-xl bg-muted/40 text-sm"
                            >
                              <span>#{order.orderNumber}</span>
                              <span className="font-medium">
                                {formatCurrency(order.total, isAr ? "ar-SA" : "en-SA")}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {isAr ? "المحادثات" : "Conversations"}
                      </h3>
                      {customerDetail.conversations?.length ? (
                        <div className="space-y-2">
                          {customerDetail.conversations.slice(0, 3).map((conv) => (
                            <div
                              key={conv.id}
                              className="p-3 rounded-xl bg-muted/40 text-sm flex justify-between"
                            >
                              <span className="capitalize">{conv.status}</span>
                              <span className="text-muted-foreground">
                                {formatDate(conv.lastMessageAt, locale)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
