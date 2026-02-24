import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeftRight, Clock, Loader2, MapPin, Package } from "lucide-react";
import { toast } from "sonner";

interface RequestedItem {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl?: string;
  estimated_value: number | null;
}

interface MyItem {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl?: string;
  is_public: boolean;
  available_to_trade: boolean;
}

interface TradeRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "trade" | "borrow";
  requestedItem: RequestedItem;
  ownerId: string;
  ownerUsername: string;
  onSuccess: () => void;
}

const TradeRequestSheet = ({
  open,
  onOpenChange,
  type,
  requestedItem,
  ownerId,
  ownerUsername,
  onSuccess,
}: TradeRequestSheetProps) => {
  const { user } = useAuth();

  const [myItems, setMyItems] = useState<MyItem[]>([]);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [meetOrShip, setMeetOrShip] = useState<"meetup" | "ship">("meetup");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user || type !== "trade") return;
    loadMyItems();
  }, [open, user, type]);

  const loadMyItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("closet_items")
      .select("id, name, category, color, image_path, is_public, available_to_trade")
      .eq("user_id", user.id)
      .eq("available_to_trade", true)
      .order("created_at", { ascending: false });

    if (data) {
      setMyItems(
        data.map((item: any) => ({
          ...item,
          imageUrl: item.image_path
            ? supabase.storage.from("closet-items").getPublicUrl(item.image_path).data.publicUrl
            : null,
        }))
      );
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (type === "trade" && !selectedMyItemId) {
      toast.error("Select an item to offer");
      return;
    }
    setSubmitting(true);
    try {
      const { data: reqData, error } = await supabase
        .from("trade_requests")
        .insert({
          requester_id: user.id,
          owner_id: ownerId,
          requested_item_id: requestedItem.id,
          offered_item_id: type === "trade" ? selectedMyItemId : null,
          type,
          status: "pending",
          message: message.trim() || null,
          meet_or_ship: meetOrShip,
        })
        .select()
        .single();

      if (error) throw error;

      if (message.trim() && reqData) {
        await supabase.from("messages").insert({
          trade_request_id: reqData.id,
          sender_id: user.id,
          content: message.trim(),
        });
      }

      onSuccess();
      // Reset
      setSelectedMyItemId(null);
      setMessage("");
      setMeetOrShip("meetup");
    } catch (e: any) {
      toast.error(e.message || "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  const deposit = requestedItem.estimated_value
    ? `$${(requestedItem.estimated_value / 100).toFixed(0)}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-5 pb-6">
          <SheetHeader>
            <SheetTitle className="font-display text-xl flex items-center gap-2">
              {type === "trade" ? (
                <><ArrowLeftRight className="w-5 h-5 text-gold" /> Request Trade</>
              ) : (
                <><Clock className="w-5 h-5 text-gold" /> Request Borrow</>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Target item summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              {requestedItem.imageUrl ? (
                <img src={requestedItem.imageUrl} alt={requestedItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ backgroundColor: requestedItem.color || "#C4A882" }} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{requestedItem.name}</p>
              <p className="text-xs text-muted-foreground">
                from @{ownerUsername} · {requestedItem.category}
              </p>
            </div>
          </div>

          {/* Trade: pick your item to offer */}
          {type === "trade" && (
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Offer one of your items
              </Label>
              {myItems.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">
                  You have no items marked as available to trade. Enable trading on items in your closet first.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {myItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedMyItemId(item.id)}
                      className={`rounded-xl overflow-hidden ring-2 transition-all duration-150 ${
                        selectedMyItemId === item.id
                          ? "ring-gold shadow-gold"
                          : "ring-transparent hover:ring-border"
                      }`}
                    >
                      <div className="aspect-square">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full" style={{ backgroundColor: item.color || "#C4A882" }} />
                        )}
                      </div>
                      <p className="text-[10px] font-medium text-center py-1 px-1 truncate bg-card">{item.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Borrow: show deposit info */}
          {type === "borrow" && deposit && (
            <div className="p-3 rounded-xl bg-secondary/60">
              <p className="text-sm font-medium">Deposit: {deposit}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Coordinate deposit & return details with the owner over messages.
              </p>
            </div>
          )}

          {/* Meet or ship */}
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Exchange method
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["meetup", "ship"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setMeetOrShip(opt)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    meetOrShip === opt
                      ? "border-primary bg-primary/10 shadow-gold"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {opt === "meetup" ? (
                    <MapPin className="w-4 h-4 text-gold" />
                  ) : (
                    <Package className="w-4 h-4 text-gold" />
                  )}
                  {opt === "meetup" ? "Meet up" : "Ship it"}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Message (optional)
            </Label>
            <Textarea
              placeholder={`Introduce yourself and tell @${ownerUsername} why you'd love this piece…`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 bg-card rounded-xl resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || (type === "trade" && !selectedMyItemId)}
            className="w-full gradient-gold text-primary-foreground rounded-xl shadow-gold"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
            ) : (
              `Send ${type === "trade" ? "Trade" : "Borrow"} Request`
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TradeRequestSheet;
