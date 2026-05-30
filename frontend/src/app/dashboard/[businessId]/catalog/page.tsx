"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ImageIcon,
  Star,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/context";
import { t } from "@/lib/i18n";
import { api, CatalogItem } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface ItemForm {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: string;
  discountPrice: string;
  category: string;
  duration: string;
  image: string;
}

const emptyForm: ItemForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  discountPrice: "",
  category: "",
  duration: "",
  image: "",
};

export default function CatalogPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { locale } = useApp();
  const queryClient = useQueryClient();
  const isAr = locale === "ar";

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ["catalog", businessId],
    queryFn: async () => {
      const res = await api.getCatalog(businessId);
      return res.data ?? [];
    },
  });

  const allItems = useMemo(() => {
    const items = catalogs.flatMap((c) =>
      c.items.map((item) => ({ ...item, catalogId: item.catalogId || c.id }))
    );
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [catalogs]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return ["all", ...Array.from(cats)];
  }, [allItems]);

  const filteredItems =
    activeCategory === "all"
      ? allItems
      : allItems.filter((item) => item.category === activeCategory);

  const defaultCatalogId = catalogs[0]?.id ?? "";

  const createMutation = useMutation({
    mutationFn: (data: Partial<CatalogItem>) =>
      api.createCatalogItem(businessId, { ...data, catalogId: defaultCatalogId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", businessId] });
      toast.success(isAr ? "تمت الإضافة" : "Item added");
      closeModal();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CatalogItem> }) =>
      api.updateCatalogItem(businessId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", businessId] });
      toast.success(isAr ? "تم التحديث" : "Item updated");
      closeModal();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCatalogItem(businessId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", businessId] });
      toast.success(isAr ? "تم الحذف" : "Item deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleAvailability = (item: CatalogItem) => {
    updateMutation.mutate({ id: item.id, data: { isAvailable: !item.isAvailable } });
  };

  const handleReorder = (newOrder: CatalogItem[]) => {
    newOrder.forEach((item, index) => {
      if (item.sortOrder !== index) {
        updateMutation.mutate({ id: item.id, data: { sortOrder: index } });
      }
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setForm({
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      descriptionAr: item.descriptionAr ?? "",
      descriptionEn: item.descriptionEn ?? "",
      price: String(item.price),
      discountPrice: item.discountPrice ? String(item.discountPrice) : "",
      category: item.category ?? "",
      duration: item.duration ? String(item.duration) : "",
      image: item.image ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<CatalogItem> = {
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      descriptionAr: form.descriptionAr || undefined,
      descriptionEn: form.descriptionEn || undefined,
      price: parseFloat(form.price) || 0,
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : undefined,
      category: form.category || undefined,
      duration: form.duration ? parseInt(form.duration, 10) : undefined,
      image: form.image || undefined,
      isAvailable: true,
      isFeatured: false,
      sortOrder: editingItem?.sortOrder ?? allItems.length,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t(locale, "dashboard", "catalog")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "إدارة القائمة والخدمات" : "Manage menu items and services"}
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4" />
          {t(locale, "dashboard", "add")}
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              activeCategory === cat
                ? "bg-gradient-primary text-white shadow-glow-green"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
          >
            {cat === "all" ? t(locale, "dashboard", "all") : cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : filteredItems.length === 0 ? (
        <Card className="text-center py-16">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t(locale, "dashboard", "noData")}</p>
          <Button className="mt-4" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            {t(locale, "dashboard", "add")}
          </Button>
        </Card>
      ) : (
        <Reorder.Group
          axis="y"
          values={filteredItems}
          onReorder={handleReorder}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filteredItems.map((item) => (
            <Reorder.Item
              key={item.id}
              value={item}
              className="glass-card !p-0 overflow-hidden cursor-grab active:cursor-grabbing"
            >
              <div className="relative h-36 bg-muted/40 flex items-center justify-center">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                )}
                <div className="absolute top-2 start-2 flex gap-1">
                  <span className="p-1.5 rounded-lg bg-black/40 text-white">
                    <GripVertical className="w-4 h-4" />
                  </span>
                  {item.isFeatured && (
                    <span className="p-1.5 rounded-lg bg-secondary text-white">
                      <Star className="w-4 h-4" />
                    </span>
                  )}
                </div>
                {!item.isAvailable && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                    {isAr ? "نفذت الكمية" : "Sold Out"}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold truncate">
                    {isAr ? item.nameAr : item.nameEn}
                  </h3>
                  {item.category && (
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.discountPrice ? (
                    <>
                      <span className="font-bold text-primary">
                        {formatCurrency(item.discountPrice, locale === "ar" ? "ar-SA" : "en-SA")}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(item.price, locale === "ar" ? "ar-SA" : "en-SA")}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-primary">
                      {formatCurrency(item.price, locale === "ar" ? "ar-SA" : "en-SA")}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isAvailable}
                      onChange={() => toggleAvailability(item)}
                      className="rounded accent-primary"
                    />
                    {isAr ? "متوفر" : "Available"}
                  </label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(isAr ? "حذف هذا العنصر؟" : "Delete this item?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] md:inset-x-auto md:start-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50 glass-card max-h-[80vh] overflow-y-auto"
            >
              <CardHeader>
                <CardTitle>
                  {editingItem
                    ? t(locale, "dashboard", "edit")
                    : isAr
                      ? "إضافة عنصر"
                      : "Add Item"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={isAr ? "الاسم (عربي)" : "Name (Arabic)"}
                    value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    required
                  />
                  <Input
                    label={isAr ? "الاسم (إنجليزي)" : "Name (English)"}
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label={t(locale, "common", "total")}
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                    <Input
                      label={isAr ? "سعر مخفض" : "Discount Price"}
                      type="number"
                      step="0.01"
                      value={form.discountPrice}
                      onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                    />
                  </div>
                  <Input
                    label={isAr ? "الفئة" : "Category"}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  <Input
                    label={isAr ? "المدة (دقائق)" : "Duration (min)"}
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                  <Input
                    label={isAr ? "رابط الصورة" : "Image URL"}
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      loading={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                    >
                      {t(locale, "dashboard", "save")}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                      {t(locale, "dashboard", "cancel")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
