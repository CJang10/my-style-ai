import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Camera, X, Trash2, Sparkles, Loader2, ArrowLeftRight, Clock } from "lucide-react";
import heic2any from "heic2any";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const CATEGORIES = ["All", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Dresses"];
const SEASONS = ["All-Season", "Spring", "Summer", "Fall", "Winter"];

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  image_path: string | null;
  imageUrl?: string;
  is_public: boolean;
  available_to_trade: boolean;
  available_to_borrow: boolean;
  estimated_value: number | null;
}

function isHeicFile(file: File) {
  return file.type === "image/heic" || file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif");
}

async function compressImage(file: File) {
  let sourceBlob: Blob = file;
  if (isHeicFile(file)) {
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }
  const blobUrl = URL.createObjectURL(sourceBlob);
  return new Promise<{ base64: string; mediaType: string; blobUrl: string; canvasBlob: Blob }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1024;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      canvas.toBlob((canvasBlob) => {
        if (!canvasBlob) { reject(new Error("Canvas conversion failed")); return; }
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg", blobUrl, canvasBlob });
      }, "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = blobUrl;
  });
}

const Toggle = ({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc: string }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-background hover:bg-secondary/60 transition-colors"
  >
    <div className="text-left">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
    <div className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0 ${value ? "bg-gold" : "bg-border"}`}>
      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0"}`} />
    </div>
  </button>
);

const inputClass = "w-full rounded-xl bg-background border border-border/60 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold/40 transition-all";

const Closet = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Tops", color: "#C4A882", season: "All-Season", is_public: false, available_to_trade: false, available_to_borrow: false, estimated_value: "" });
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [isScanned, setIsScanned] = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", category: "Tops", color: "#C4A882", season: "All-Season", is_public: false, available_to_trade: false, available_to_borrow: false, estimated_value: "" });

  useEffect(() => { if (user) loadItems(); }, [user]);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase.from("closet_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setItems(data.map((item: any) => ({
      ...item,
      imageUrl: item.image_path ? supabase.storage.from("closet-items").getPublicUrl(item.image_path).data.publicUrl : null,
    })));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setItemPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const handleScanSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (scanFileInputRef.current) scanFileInputRef.current.value = "";
    const heic = isHeicFile(file);
    setScanPreview(URL.createObjectURL(file));
    setScanning(true);
    try {
      const { base64, mediaType, blobUrl, canvasBlob } = await compressImage(file);
      const baseName = file.name.replace(/\.[^.]+$/, ".jpg");
      setItemPhoto(new File([canvasBlob], baseName, { type: "image/jpeg" }));
      setPhotoPreview(blobUrl);
      const { data, error } = await supabase.functions.invoke("style-ai", { body: { type: "identify-item", imageBase64: base64, mediaType } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNewItem((n) => ({
        ...n,
        name: data.name || "",
        category: CATEGORIES.slice(1).includes(data.category) ? data.category : "Tops",
        color: /^#[0-9A-Fa-f]{6}$/.test(data.color) ? data.color : "#C4A882",
        season: SEASONS.includes(data.season) ? data.season : "All-Season",
      }));
      setIsScanned(true);
    } catch {
      toast.error(heic ? "HEIC photo couldn't be processed. Try saving as JPEG first." : "Couldn't identify item — fill in details manually");
      setIsScanned(false);
    } finally {
      setScanning(false);
      setScanPreview(null);
      setDialogOpen(true);
    }
  };

  const resetDialog = () => {
    setNewItem({ name: "", category: "Tops", color: "#C4A882", season: "All-Season", is_public: false, available_to_trade: false, available_to_borrow: false, estimated_value: "" });
    setItemPhoto(null); setPhotoPreview(null); setIsScanned(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addItem = async () => {
    if (!newItem.name || !user) return;
    setSaving(true);
    try {
      let imagePath: string | null = null;
      if (itemPhoto) {
        const ext = itemPhoto.name.split(".").pop() || "jpg";
        imagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("closet-items").upload(imagePath, itemPhoto);
        if (uploadErr) throw uploadErr;
      }
      const { error } = await supabase.from("closet_items").insert({
        user_id: user.id, name: newItem.name, category: newItem.category, color: newItem.color,
        season: newItem.season, image_path: imagePath, is_public: newItem.is_public,
        available_to_trade: newItem.available_to_trade, available_to_borrow: newItem.available_to_borrow,
        estimated_value: newItem.available_to_borrow && newItem.estimated_value ? Math.round(parseFloat(newItem.estimated_value) * 100) : null,
      });
      if (error) throw error;
      toast.success("Added to closet");
      resetDialog(); setDialogOpen(false); loadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to add item");
    } finally { setSaving(false); }
  };

  const openEdit = (item: ClosetItem) => {
    setEditingItem(item);
    setEditData({ name: item.name, category: item.category, color: item.color || "#C4A882", season: item.season || "All-Season", is_public: item.is_public ?? false, available_to_trade: item.available_to_trade ?? false, available_to_borrow: item.available_to_borrow ?? false, estimated_value: item.estimated_value ? String(item.estimated_value / 100) : "" });
    setEditDialogOpen(true);
  };

  const updateItem = async () => {
    if (!editingItem || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("closet_items").update({
        name: editData.name, category: editData.category, color: editData.color, season: editData.season,
        is_public: editData.is_public, available_to_trade: editData.available_to_trade, available_to_borrow: editData.available_to_borrow,
        estimated_value: editData.available_to_borrow && editData.estimated_value ? Math.round(parseFloat(editData.estimated_value) * 100) : null,
      }).eq("id", editingItem.id);
      if (error) throw error;
      toast.success("Item updated"); setEditDialogOpen(false); setEditingItem(null); loadItems();
    } catch (e: any) { toast.error(e.message || "Failed to update item"); }
    finally { setSaving(false); }
  };

  const deleteItem = async (item: ClosetItem) => {
    if (!user) return;
    if (item.image_path) await supabase.storage.from("closet-items").remove([item.image_path]);
    await supabase.from("closet_items").delete().eq("id", item.id);
    setItems(items.filter((i) => i.id !== item.id));
    toast.success("Removed from closet");
  };

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const ItemFormFields = ({ data, setData }: { data: typeof newItem; setData: (d: typeof newItem) => void }) => (
    <div className="space-y-4">
      <input placeholder="Item name" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Category</p>
          <Select value={data.category} onValueChange={(v) => setData({ ...data, category: v })}>
            <SelectTrigger className="rounded-xl bg-background border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.filter((c) => c !== "All").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Season</p>
          <Select value={data.season} onValueChange={(v) => setData({ ...data, season: v })}>
            <SelectTrigger className="rounded-xl bg-background border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>{SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Color</p>
        <div className="flex gap-2 items-center">
          <input type="color" value={data.color} onChange={(e) => setData({ ...data, color: e.target.value })} className="w-10 h-10 rounded-xl border border-border/60 cursor-pointer flex-shrink-0" />
          <input value={data.color} onChange={(e) => setData({ ...data, color: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="border-t border-border/50 pt-3 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Sharing</p>
        <Toggle value={data.is_public} onChange={(v) => setData({ ...data, is_public: v })} label="Show in Discover" desc="Others can see this item" />
        <Toggle value={data.available_to_trade} onChange={(v) => setData({ ...data, available_to_trade: v })} label="Available to trade" desc="Open for swaps" />
        <Toggle value={data.available_to_borrow} onChange={(v) => setData({ ...data, available_to_borrow: v })} label="Available to borrow" desc="Others can request it" />
        {data.available_to_borrow && (
          <div className="pt-1 pb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Estimated Value ($)</p>
            <input type="number" min="0" step="0.01" placeholder="e.g. 45.00" value={data.estimated_value} onChange={(e) => setData({ ...data, estimated_value: e.target.value })} className={inputClass} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout>
      {/* Scanning overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs flex flex-col items-center gap-5 shadow-xl">
            {scanPreview && (
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden">
                <img src={scanPreview} alt="Scanning" className="w-full h-full object-cover" />
                <div className="absolute inset-0 rounded-2xl ring-2 ring-gold/60 animate-pulse" />
              </div>
            )}
            <div className="text-center">
              <p className="font-display font-semibold text-lg">Identifying item…</p>
              <p className="text-sm text-muted-foreground mt-1">AI is reading your piece</p>
            </div>
            <div className="flex items-center gap-2 text-gold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-widest">Analyzing</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold">
              My <span className="text-gold italic">Closet</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{items.length} pieces</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={scanFileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanSelect} />
            <button
              onClick={() => scanFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-border bg-white text-sm font-semibold hover:border-gold/40 transition-all"
            >
              <Camera className="w-4 h-4 text-gold" /> Scan
            </button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-gold text-white text-sm font-semibold shadow-gold hover:shadow-[0_4px_20px_-4px_hsl(var(--gold)/0.5)] transition-all">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="font-display text-xl">{isScanned ? "Review Item" : "Add to Closet"}</DialogTitle>
                    {isScanned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "hsl(var(--gold)/0.1)", color: "hsl(var(--gold))" }}>
                        <Sparkles className="w-3 h-3" /> AI Identified
                      </span>
                    )}
                  </div>
                </DialogHeader>
                <div className="space-y-4 mt-1">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                  {photoPreview ? (
                    <div className="relative aspect-square w-40 mx-auto rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => { setItemPhoto(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-2 hover:border-gold/40 hover:bg-background transition-all">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Add a photo</p>
                    </button>
                  )}
                  <ItemFormFields data={newItem} setData={setNewItem} />
                  <button onClick={addItem} disabled={saving || !newItem.name} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl gradient-gold text-white font-semibold text-sm shadow-gold disabled:opacity-40 disabled:pointer-events-none transition-all mt-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isScanned ? <><Sparkles className="w-4 h-4" /> Add to Closet</> : "Add Item"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingItem(null); }}>
          <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display text-xl">Edit Item</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-1">
              <ItemFormFields data={editData} setData={setEditData} />
              <div className="flex gap-2 pt-1">
                <button onClick={updateItem} disabled={saving || !editData.name} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl gradient-gold text-white font-semibold text-sm shadow-gold disabled:opacity-40 disabled:pointer-events-none">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </button>
                <button onClick={() => { setEditDialogOpen(false); if (editingItem) deleteItem(editingItem); }} className="px-4 py-3.5 rounded-2xl border-2 border-border bg-white hover:border-destructive/40 hover:text-destructive transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search your closet…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-11 bg-white`} />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                activeCategory === cat ? "gradient-gold text-white shadow-gold" : "bg-white border border-border/70 text-muted-foreground hover:border-gold/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className="group opacity-0 animate-fade-in cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm ring-1 ring-border/50 hover:ring-gold/25 hover:shadow-md transition-all duration-200"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => openEdit(item)}
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: item.color }} />
                  )}
                  {/* Badges */}
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    {item.available_to_trade && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[9px] font-bold text-foreground">
                        <ArrowLeftRight className="w-2 h-2" /> Trade
                      </span>
                    )}
                    {item.available_to_borrow && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[9px] font-bold text-foreground">
                        <Clock className="w-2 h-2" /> Borrow
                      </span>
                    )}
                  </div>
                  {/* Delete on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm items-center justify-center hidden group-hover:flex transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl text-center py-16 space-y-3 shadow-sm ring-1 ring-border/40">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "hsl(var(--gold)/0.09)" }}>
              <Camera className="w-7 h-7 text-gold" />
            </div>
            <div>
              <p className="font-display font-semibold text-base">
                {items.length === 0 ? "Your closet is empty" : "Nothing matches"}
              </p>
              <p className="text-muted-foreground text-sm mt-1 leading-relaxed max-w-[200px] mx-auto">
                {items.length === 0 ? "Tap Scan to photograph a piece" : "Try a different filter"}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Closet;
