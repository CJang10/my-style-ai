import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["All", "Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"];

const INITIAL_ITEMS = [
  { id: "1", name: "White Oxford Shirt", category: "Tops", color: "#FAFAFA", season: "All" },
  { id: "2", name: "Navy Blazer", category: "Outerwear", color: "#1B2838", season: "Fall" },
  { id: "3", name: "Dark Wash Jeans", category: "Bottoms", color: "#2C3A4A", season: "All" },
  { id: "4", name: "Cream Knit Sweater", category: "Tops", color: "#F5E6D3", season: "Winter" },
  { id: "5", name: "Tan Chinos", category: "Bottoms", color: "#C4A882", season: "Spring" },
  { id: "6", name: "Black Chelsea Boots", category: "Shoes", color: "#1A1A1A", season: "Fall" },
  { id: "7", name: "Linen Button-Down", category: "Tops", color: "#E8DDD0", season: "Summer" },
  { id: "8", name: "Gold Chain Necklace", category: "Accessories", color: "#D4A843", season: "All" },
  { id: "9", name: "White Sneakers", category: "Shoes", color: "#F8F8F8", season: "All" },
  { id: "10", name: "Olive Cargo Pants", category: "Bottoms", color: "#5C6B4E", season: "Fall" },
  { id: "11", name: "Camel Coat", category: "Outerwear", color: "#C4A06A", season: "Winter" },
  { id: "12", name: "Striped Tee", category: "Tops", color: "#E0E0E0", season: "Summer" },
];

const Closet = () => {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Tops", color: "#C4A882" });

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === "All" || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addItem = () => {
    if (!newItem.name) return;
    setItems([...items, { ...newItem, id: Date.now().toString(), season: "All" }]);
    setNewItem({ name: "", category: "Tops", color: "#C4A882" });
    setDialogOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-display font-semibold">
              My <span className="text-gold italic">Closet</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{items.length} pieces</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-gold text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add to Closet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Black Leather Jacket"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="mt-1"
                  />
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
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={newItem.color}
                      onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input value={newItem.color} onChange={(e) => setNewItem({ ...newItem, color: e.target.value })} />
                  </div>
                </div>
                <Button onClick={addItem} className="w-full gradient-gold text-primary-foreground">
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your closet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
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
              className="group animate-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="aspect-square rounded-xl border border-border overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.03]"
                style={{ backgroundColor: item.color }}
              />
              <p className="mt-2 text-xs font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Closet;
