"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  LayoutGrid,
  List,
  Search,
  X,
  ChevronRight,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, Order } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TABS = ["ALL", "PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"] as const;

const statusLabels: Record<string, { en: string; ar: string }> = {
  ALL: { en: "All", ar: "الكل" },
  PENDING: { en: "Pending", ar: "معلق" },
  CONFIRMED: { en: "Confirmed", ar: "مؤكد" },
  PREPARING: { en: "Preparing", ar: "قيد التحضير" },
  READY: { en: "Ready", ar: "جاهز" },
  DELIVERED: { en: "Delivered", ar: "تم التوصيل" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
};

function statusColor(status: string) {
  const s = status.toUpperCase();
  if (s === "PENDING") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (s === "CONFIRMED" || s === "PREPARING") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (s === "READY" || s === "DELIVERED") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "CANCELLED") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

function OrderDrawer({
  order,
  locale,
  onClose,
  onStatusUpdate,
}: {
  order: Order;
  locale: "en" | "ar";
  onClose: () => void;
  onStatusUpdate: (status: string) => void;
}) {
  const nextStatuses = STATUS_TABS.filter(
    (s) => s !== "ALL" && s !== order.status.toUpperCase()
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />
      <motion.aside
        initial={{ x: locale === "ar" ? -400 : 400 }}
        animate={{ x: 0 }}
        exit={{ x: locale === "ar" ? -400 : 400 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 end-0 w-full max-w-md glass z-50 overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">#{order.orderNumber}</h2>
              <p className="text-sm text-muted-foreground">{formatDate(order.createdAt, locale)}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-xs px-3 py-1 rounded-full capitalize", statusColor(order.status))}>
              {order.status.toLowerCase()}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-muted capitalize">
              {order.paymentStatus.toLowerCase()}
            </span>
          </div>

          {/* Customer */}
          <div className="glass-card !p-4 !scale-100">
            <p className="text-sm text-muted-foreground mb-1">{t(locale, "common", "name")}</p>
            <p className="font-medium">{order.customer?.name || order.customerId}</p>
            {order.customer?.phone && (
              <p className="text-sm text-muted-foreground mt-1" dir="ltr">
                {order.customer.phone}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-3">{locale === "ar" ? "العناصر" : "Items"}</h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="w-full h-full rounded-lg object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {formatCurrency(item.price * item.quantity, locale === "ar" ? "ar-SA" : "en-SA")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{locale === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
              <span>{formatCurrency(order.subtotal, locale === "ar" ? "ar-SA" : "en-SA")}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{locale === "ar" ? "الضريبة" : "Tax"}</span>
                <span>{formatCurrency(order.tax, locale === "ar" ? "ar-SA" : "en-SA")}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{locale === "ar" ? "التوصيل" : "Delivery"}</span>
                <span>{formatCurrency(order.deliveryFee, locale === "ar" ? "ar-SA" : "en-SA")}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{locale === "ar" ? "الخصم" : "Discount"}</span>
                <span>-{formatCurrency(order.discount, locale === "ar" ? "ar-SA" : "en-SA")}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>{t(locale, "common", "total")}</span>
              <span>{formatCurrency(order.total, locale === "ar" ? "ar-SA" : "en-SA")}</span>
            </div>
          </div>

          {order.specialInstructions && (
            <div className="glass-card !p-4 !scale-100">
              <p className="text-sm text-muted-foreground mb-1">{locale === "ar" ? "ملاحظات" : "Notes"}</p>
              <p className="text-sm">{order.specialInstructions}</p>
            </div>
          )}

          {/* Status update */}
          <div>
            <h3 className="font-semibold mb-3">{t(locale, "common", "status")}</h3>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusUpdate(status)}
                >
                  {statusLabels[status]?.[locale] ?? status}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export default function OrdersPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", businessId, activeTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "ALL") params.status = activeTab;
      const res = await api.getOrders(businessId, params);
      return res.data ?? [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.updateOrderStatus(businessId, orderId, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["orders", businessId] });
      if (res.data) setSelectedOrder(res.data);
      toast.success(locale === "ar" ? "تم تحديث الحالة" : "Status updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t(locale, "dashboard", "error"));
    },
  });

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q)
    );
  }, [orders, search]);

  const handleExport = () => {
    const csv = [
      ["Order #", "Customer", "Total", "Status", "Date"].join(","),
      ...filteredOrders.map((o) =>
        [o.orderNumber, o.customer?.name || "", o.total, o.status, o.createdAt].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(locale === "ar" ? "تم التصدير" : "Exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t(locale, "dashboard", "orders")}</h1>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t(locale, "dashboard", "export")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              activeTab === tab
                ? "bg-gradient-primary text-white shadow-glow-green"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {statusLabels[tab]?.[locale] ?? tab}
          </button>
        ))}
      </div>

      {/* Filters */}
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
        <div className="flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : isError ? (
        <div className="glass-card text-center py-16 space-y-4">
          <p className="text-muted-foreground">{t(locale, "dashboard", "error")}</p>
          <Button onClick={() => refetch()}>{t(locale, "dashboard", "retry")}</Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card text-center py-16">
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="!hover:scale-100 overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-start p-4 font-medium">{locale === "ar" ? "الطلب" : "Order"}</th>
                  <th className="text-start p-4 font-medium">{t(locale, "common", "name")}</th>
                  <th className="text-start p-4 font-medium">{t(locale, "common", "total")}</th>
                  <th className="text-start p-4 font-medium">{t(locale, "common", "status")}</th>
                  <th className="text-start p-4 font-medium">{t(locale, "common", "date")}</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-medium">#{order.orderNumber}</td>
                    <td className="p-4">{order.customer?.name || "—"}</td>
                    <td className="p-4">{formatCurrency(order.total, locale === "ar" ? "ar-SA" : "en-SA")}</td>
                    <td className="p-4">
                      <span className={cn("text-xs px-2 py-1 rounded-full capitalize", statusColor(order.status))}>
                        {order.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(order.createdAt, locale)}</td>
                    <td className="p-4">
                      <ChevronRight className="w-4 h-4 text-muted-foreground rtl-flip" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order, i) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="!hover:scale-[1.01] cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.customer?.name}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-1 rounded-full capitalize", statusColor(order.status))}>
                      {order.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {formatCurrency(order.total, locale === "ar" ? "ar-SA" : "en-SA")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(order.createdAt, locale)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {order.items.length} {locale === "ar" ? "عناصر" : "items"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDrawer
            order={selectedOrder}
            locale={locale}
            onClose={() => setSelectedOrder(null)}
            onStatusUpdate={(status) =>
              statusMutation.mutate({ orderId: selectedOrder.id, status })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
