import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Camera, X, Trash2, Sparkles, Loader2 } from "lucide-react";
import heic2any from "heic2any";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

async function compressImage(file: File): Promise<{ base64: string; mediaType: string; blobUrl: string; canvasBlob: Blob }> {
  let sourceBlob: Blob = file;

  // Convert HEIC/HEIF to JPEG so browsers and Claude can read it
  if (isHeicFile(file)) {
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  const blobUrl = URL.createObjectURL(sourceBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1024;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      canvas.toBlob(
        (canvasBlob) => {
          if (!canvasBlob) { reject(new Error("Canvas conversion failed")); return; }
          resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg", blobUrl, canvasBlob });
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = blobUrl;
  });
}

const Closet = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Tops", color: "#C4A882", season: "All-Season" });
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [isScanned, setIsScanned] = useState(false);
  const [editingItem, setEditingItem] = useState<ClosetItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({ name: "", category: "Tops", color: "#C4A882", season: "All-Season" });

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("closet_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      const withUrls = data.map((item: any) => ({
        ...item,
        imageUrl: item.image_path
          ? supabase.storage.from("closet-items").getPublicUrl(item.image_path).data.publicUrl
          : null,
      }));
      setItems(withUrls);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setItemPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleScanSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (scanFileInputRef.current) scanFileInputRef.current.value = "";

    const heic = isHeicFile(file);
    const rawPreview = URL.createObjectURL(file);
    setScanPreview(rawPreview);
    setScanning(true);

    try {
      const { base64, mediaType, blobUrl, canvasBlob } = await compressImage(file);

      // Always store a JPEG for upload — this fixes HEIC files which can't be displayed by browsers
      const baseName = file.name.replace(/\.[^.]+$/, ".jpg");
      const storageFile = new File([canvasBlob], baseName, { type: "image/jpeg" });
      setItemPhoto(storageFile);
      setPhotoPreview(blobUrl);

      const { data, error } = await supabase.functions.invoke("style-ai", {
        body: { type: "identify-item", imageBase64: base64, mediaType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNewItem({
        name: data.name || "",
        category: CATEGORIES.slice(1).includes(data.category) ? data.category : "Tops",
        color: /^#[0-9A-Fa-f]{6}$/.test(data.color) ? data.color : "#C4A882",
        season: SEASONS.includes(data.season) ? data.season : "All-Season",
      });
      setIsScanned(true);
    } catch (e: any) {
      if (heic) {
        toast.error("HEIC photo couldn't be processed. Try saving as JPEG from the Photos app, or take a screenshot first.");
      } else {
        toast.error("Couldn't identify item — fill in the details manually");
      }
      setNewItem({ name: "", category: "Tops", color: "#C4A882", season: "All-Season" });
      setIsScanned(false);
    } finally {
      setScanning(false);
      setScanPreview(null);
      setDialogOpen(true);
    }
  };

  const resetDialog = () => {
    setNewItem({ name: "", category: "Tops", color: "#C4A882", season: "All-Season" });
    setItemPhoto(null);
    setPhotoPreview(null);
    setIsScanned(false);
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
        const { error: uploadErr } = await supabase.storage
          .from("closet-items")
          .upload(imagePath, itemPhoto);
        if (uploadErr) throw uploadErr;
      }

      const { error } = await supabase.from("closet_items").insert({
        user_id: user.id,
        name: newItem.name,
        category: newItem.category,
        color: newItem.color,
        season: newItem.season,
        image_path: imagePath,
      });
      if (error) throw error;

      toast.success("Added to closet");
      resetDialog();
      setDialogOpen(false);
      loadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: ClosetItem) => {
    setEditingItem(item);
    setEditData({
      name: item.name,
      category: item.category,
      color: item.color || "#C4A882",
      season: item.season || "All-Season",
    });
    setEditDialogOpen(true);
  };

  const updateItem = async () => {
    if (!editingItem || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("closet_items").update({
        name: editData.name,
        category: editData.category,
        color: editData.color,
        season: editData.season,
      }).eq("id", editingItem.id);
      if (error) throw error;
      toast.success("Item updated");
      setEditDialogOpen(false);
      setEditingItem(null);
      loadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: ClosetItem) => {
    if (!user) return;
    if (item.image_path) {
      await supabase.storage.from("closet-items").remove([item.image_path]);
    }
    await supabase.from("closet_items").delete().eq("id", item.id);
    setItems(items.filter((i) => i.id !== item.id));
    toast.success("Removed from closet");
  };

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AppLayout>
      {/* AI Scanning overlay */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="card-elevated rounded-3xl p-8 w-full max-w-xs flex flex-col items-center gap-5">
            {scanPreview && (
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden">
                <img src={scanPreview} alt="Scanning" className="w-full h-full object-cover" />
                <div className="absolute inset-0 rounded-2xl ring-2 ring-gold/70 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent rounded-2xl" />
              </div>
            )}
            <div className="text-center space-y-1.5">
              <p className="font-display font-semibold text-lg">Identifying item...</p>
              <p className="text-sm text-muted-foreground">AI is analyzing your clothing piece</p>
            </div>
            <div className="flex items-center gap-2 text-gold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium uppercase tracking-widest">Analyzing</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-semibold">
              My <span className="text-gold italic">Closet</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{items.length} pieces</p>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Scan button */}
            <input
              ref={scanFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleScanSelect}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-gold hover:text-gold/80 hover:bg-gold/5 rounded-xl transition-all"
              onClick={() => scanFileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Scan
            </Button>

            {/* Manual add button */}
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-gold text-primary-foreground rounded-xl shadow-gold">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </DialogTrigger>

              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <div className="flex items-center gap-3 flex-wrap">
                    <DialogTitle className="font-display">
                      {isScanned ? "Review Item" : "Add to Closet"}
                    </DialogTitle>
                    {isScanned && (
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{
                          background: "hsl(var(--gold) / 0.12)",
                          border: "1px solid hsl(var(--gold) / 0.3)",
                        }}
                      >
                        <Sparkles className="w-3 h-3 text-gold" />
                        <span className="text-xs font-medium text-gold">AI Identified</span>
                      </div>
                    )}
                  </div>
                  {isScanned && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Review and edit the details below before saving.
                    </p>
                  )}
                </DialogHeader>

                <div className="space-y-4 mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />

                  {/* Photo preview */}
                  {photoPreview ? (
                    <div className="relative aspect-square w-full max-w-[180px] mx-auto rounded-2xl overflow-hidden">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      {isScanned && (
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-gold/50" />
                      )}
                      <button
                        onClick={() => {
                          setItemPhoto(null);
                          setPhotoPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/70 backdrop-blur-sm flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5 text-background" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-gold/40 transition-colors"
                    >
                      <Camera className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Add a photo</p>
                    </button>
                  )}

                  {/* Name */}
                  <div>
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      Name
                    </Label>
                    <Input
                      placeholder="e.g. Black Leather Jacket"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="mt-1.5 bg-card rounded-xl"
                    />
                  </div>

                  {/* Category + Season row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        Category
                      </Label>
                      <Select
                        value={newItem.category}
                        onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                      >
                        <SelectTrigger className="mt-1.5 bg-card rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c !== "All").map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        Season
                      </Label>
                      <Select
                        value={newItem.season}
                        onValueChange={(v) => setNewItem({ ...newItem, season: v })}
                      >
                        <SelectTrigger className="mt-1.5 bg-card rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEASONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                      Primary Color
                    </Label>
                    <div className="flex gap-2 mt-1.5 items-center">
                      <input
                        type="color"
                        value={newItem.color}
                        onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-border cursor-pointer flex-shrink-0"
                      />
                      <Input
                        value={newItem.color}
                        onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                        className="bg-card rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={addItem}
                    disabled={saving || !newItem.name}
                    className="w-full gradient-gold text-primary-foreground rounded-xl shadow-gold mt-2"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {isScanned && <Sparkles className="w-4 h-4" />}
                        {isScanned ? "Add to Closet" : "Add Item"}
                      </span>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit item dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingItem(null); }}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-1">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Name</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1.5 bg-card rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Category</Label>
                  <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                    <SelectTrigger className="mt-1.5 bg-card rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Season</Label>
                  <Select value={editData.season} onValueChange={(v) => setEditData({ ...editData, season: v })}>
                    <SelectTrigger className="mt-1.5 bg-card rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Primary Color</Label>
                <div className="flex gap-2 mt-1.5 items-center">
                  <input
                    type="color"
                    value={editData.color}
                    onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-border cursor-pointer flex-shrink-0"
                  />
                  <Input
                    value={editData.color}
                    onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                    className="bg-card rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={updateItem}
                  disabled={saving || !editData.name}
                  className="flex-1 gradient-gold text-primary-foreground rounded-xl shadow-gold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setEditDialogOpen(false); if (editingItem) deleteItem(editingItem); }}
                  className="rounded-xl border-border/70 text-destructive hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your closet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card rounded-xl"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? "gradient-gold text-primary-foreground shadow-gold"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className="group opacity-0 animate-fade-in relative cursor-pointer"
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => openEdit(item)}
            >
              <div className="aspect-square rounded-2xl overflow-hidden shadow-sm ring-1 ring-border/40 transition-transform duration-200 group-hover:scale-[1.04] group-hover:shadow-md">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: item.color }} />
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteItem(item); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/70 backdrop-blur-sm items-center justify-center hidden group-hover:flex transition-all"
              >
                <Trash2 className="w-3 h-3 text-background" />
              </button>
              <p className="mt-2 text-xs font-semibold truncate leading-snug">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="card-elevated rounded-2xl text-center py-14 space-y-3">
            <div
              className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: "hsl(var(--gold) / 0.1)" }}
            >
              <Camera className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {items.length === 0 ? "Your closet is empty" : "No items match your filter"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {items.length === 0
                  ? "Tap Scan to photograph a piece and let AI add it instantly"
                  : "Try a different category or search term"}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Closet;
