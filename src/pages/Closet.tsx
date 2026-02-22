import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Camera, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = ["All", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Dresses"];

interface ClosetItem {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  image_path: string | null;
  imageUrl?: string;
}

const Closet = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Tops", color: "#C4A882" });
  const [itemPhoto, setItemPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase.from("closet_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
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

  const addItem = async () => {
    if (!newItem.name || !user) return;
    setSaving(true);

    try {
      let imagePath: string | null = null;
      if (itemPhoto) {
        const ext = itemPhoto.name.split(".").pop();
        imagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("closet-items").upload(imagePath, itemPhoto);
        if (uploadErr) throw uploadErr;
      }

      const { error } = await supabase.from("closet_items").insert({
        user_id: user.id,
        name: newItem.name,
        category: newItem.category,
        color: newItem.color,
        image_path: imagePath,
      });
      if (error) throw error;

      toast.success("Added to closet");
      setNewItem({ name: "", category: "Tops", color: "#C4A882" });
      setItemPhoto(null);
      setPhotoPreview(null);
      setDialogOpen(false);
      loadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to add item");
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-semibold">My <span className="text-gold italic">Closet</span></h2>
            <p className="text-sm text-muted-foreground mt-1">{items.length} pieces</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-gold text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add to Closet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

                {photoPreview ? (
                  <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border border-border">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => { setItemPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/70 flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-background" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Add a photo</p>
                  </button>
                )}

                <div>
                  <Label>Name</Label>
                  <Input placeholder="e.g. Black Leather Jacket" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={newItem.color} onChange={(e) => setNewItem({ ...newItem, color: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <Input value={newItem.color} onChange={(e) => setNewItem({ ...newItem, color: e.target.value })} />
                  </div>
                </div>
                <Button onClick={addItem} disabled={saving || !newItem.name} className="w-full gradient-gold text-primary-foreground">
                  {saving ? "Saving..." : "Add Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search your closet..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat ? "gradient-gold text-primary-foreground shadow-gold" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {filtered.map((item, i) => (
            <div key={item.id} className="group opacity-0 animate-fade-in relative" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="aspect-square rounded-2xl overflow-hidden shadow-sm ring-1 ring-border/40 transition-transform duration-200 group-hover:scale-[1.04] group-hover:shadow-md">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: item.color }} />
                )}
              </div>
              <button
                onClick={() => deleteItem(item)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-foreground/70 backdrop-blur-sm items-center justify-center hidden group-hover:flex transition-all"
              >
                <Trash2 className="w-3 h-3 text-background" />
              </button>
              <p className="mt-2 text-xs font-semibold truncate leading-snug">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="card-elevated rounded-2xl text-center py-14">
            <p className="text-muted-foreground text-sm">
              {items.length === 0 ? "Your closet is empty. Start adding pieces!" : "No items match your filter."}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Closet;
