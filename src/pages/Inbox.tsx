import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, MessageCircle, ArrowLeftRight, Clock, Check, X, Send } from "lucide-react";
import { toast } from "sonner";

type RequestStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

interface TradeRequest {
  id: string;
  type: "trade" | "borrow";
  status: RequestStatus;
  message: string | null;
  meet_or_ship: "meetup" | "ship" | null;
  created_at: string;
  requester_id: string;
  owner_id: string;
  requested_item: { id: string; name: string; category: string; color: string; image_path: string | null; imageUrl?: string } | null;
  offered_item: { id: string; name: string; category: string; color: string; image_path: string | null; imageUrl?: string } | null;
  other_user: { username: string | null; name: string | null } | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  declined: "bg-red-50 text-red-600 ring-1 ring-red-200",
  completed: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  cancelled: "bg-secondary text-muted-foreground ring-1 ring-border",
};

const ItemThumb = ({ item }: { item: TradeRequest["requested_item"] }) => {
  if (!item) return null;
  return (
    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-border/40">
      {item.imageUrl
        ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        : <div className="w-full h-full" style={{ backgroundColor: item.color || "#C4A882" }} />
      }
    </div>
  );
};

const Inbox = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [requests, setRequests] = useState<TradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TradeRequest | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => { if (user) loadRequests(); }, [user, tab]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    const filterCol = tab === "received" ? "owner_id" : "requester_id";
    const otherCol = tab === "received" ? "requester_id" : "owner_id";

    const { data, error } = await supabase
      .from("trade_requests")
      .select(`id, type, status, message, meet_or_ship, created_at, requester_id, owner_id,
        requested_item:requested_item_id(id, name, category, color, image_path),
        offered_item:offered_item_id(id, name, category, color, image_path)`)
      .eq(filterCol, user.id)
      .order("created_at", { ascending: false });

    if (error || !data) { setLoading(false); return; }

    const otherIds = [...new Set((data as any[]).map((r) => r[otherCol]))];
    const { data: profiles } = otherIds.length
      ? await supabase.from("profiles").select("user_id, username, name").in("user_id", otherIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, { username: p.username, name: p.name }]));

    const getUrl = (path: string | null) => path ? supabase.storage.from("closet-items").getPublicUrl(path).data.publicUrl : undefined;

    setRequests((data as any[]).map((r) => ({
      ...r,
      requested_item: r.requested_item ? { ...r.requested_item, imageUrl: getUrl(r.requested_item.image_path) } : null,
      offered_item: r.offered_item ? { ...r.offered_item, imageUrl: getUrl(r.offered_item.image_path) } : null,
      other_user: profileMap[r[otherCol]] || null,
    })));
    setLoading(false);
  };

  const openThread = async (req: TradeRequest) => {
    setSelected(req); setSheetOpen(true);
    const { data } = await supabase.from("messages").select("id, sender_id, content, created_at").eq("trade_request_id", req.id).order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!user || !selected || !newMsg.trim()) return;
    setSendingMsg(true);
    const { error } = await supabase.from("messages").insert({ trade_request_id: selected.id, sender_id: user.id, content: newMsg.trim() });
    if (error) { toast.error("Failed to send"); }
    else {
      setNewMsg("");
      const { data } = await supabase.from("messages").select("id, sender_id, content, created_at").eq("trade_request_id", selected.id).order("created_at", { ascending: true });
      setMessages(data || []);
    }
    setSendingMsg(false);
  };

  const updateStatus = async (status: RequestStatus) => {
    if (!selected) return;
    setUpdatingStatus(true);
    const { error } = await supabase.from("trade_requests").update({ status }).eq("id", selected.id);
    if (error) { toast.error("Failed to update"); }
    else {
      setSelected((r) => r ? { ...r, status } : r);
      setRequests((rs) => rs.map((r) => r.id === selected.id ? { ...r, status } : r));
      toast.success(status === "accepted" ? "Request accepted!" : status === "declined" ? "Declined" : "Cancelled");
    }
    setUpdatingStatus(false);
  };

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-display font-bold">
            In<span className="text-gold italic">box</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Trade & borrow requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-secondary/70 rounded-xl p-1">
          {(["received", "sent"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "received" ? "Received" : "Sent"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-3xl text-center py-16 space-y-3 ring-1 ring-border/40 shadow-sm">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "hsl(var(--gold)/0.09)" }}>
              <MessageCircle className="w-7 h-7 text-gold" />
            </div>
            <div>
              <p className="font-display font-semibold text-base">{tab === "received" ? "No requests yet" : "Nothing sent yet"}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-[180px] mx-auto">
                {tab === "received" ? "When someone requests a trade or borrow, it'll show here" : "Browse Discover to find pieces you love"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((req) => (
              <button key={req.id} onClick={() => openThread(req)}
                className="w-full bg-white rounded-2xl p-4 text-left shadow-sm ring-1 ring-border/40 hover:ring-gold/25 hover:shadow-md transition-all duration-150">
                <div className="flex items-center gap-3">
                  <ItemThumb item={req.requested_item} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[req.status]}`}>
                        {req.status}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {req.type === "trade" ? <ArrowLeftRight className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {req.type}
                      </span>
                    </div>
                    <p className="font-semibold text-sm truncate">{req.requested_item?.name || "Item"}</p>
                    <p className="text-xs text-muted-foreground">@{req.other_user?.username || req.other_user?.name || "user"}</p>
                  </div>
                  <div className="text-gold text-xs font-semibold flex-shrink-0">View →</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] flex flex-col gap-0">
          {selected && (
            <>
              <SheetHeader className="flex-shrink-0 pb-3 border-b border-border/50">
                <SheetTitle className="font-display flex items-center gap-2 text-lg">
                  {selected.type === "trade" ? <ArrowLeftRight className="w-4 h-4 text-gold" /> : <Clock className="w-4 h-4 text-gold" />}
                  {selected.type === "trade" ? "Trade" : "Borrow"} · {selected.requested_item?.name}
                </SheetTitle>
              </SheetHeader>

              {/* Summary cards */}
              <div className="flex-shrink-0 space-y-2 py-3">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-background">
                  <ItemThumb item={selected.requested_item} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Requested item</p>
                    <p className="text-sm font-semibold truncate">{selected.requested_item?.name}</p>
                    <p className="text-xs text-muted-foreground">@{selected.other_user?.username || selected.other_user?.name || "user"}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${STATUS_STYLES[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
                {selected.type === "trade" && selected.offered_item && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-background">
                    <ArrowLeftRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <ItemThumb item={selected.offered_item} />
                    <div>
                      <p className="text-xs text-muted-foreground">Offered in exchange</p>
                      <p className="text-sm font-semibold">{selected.offered_item.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 min-h-0">
                {messages.length === 0
                  ? <p className="text-xs text-muted-foreground text-center py-6">No messages yet</p>
                  : messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "gradient-gold text-white rounded-tr-sm" : "bg-background text-foreground rounded-tl-sm"}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Accept / Decline */}
              {tab === "received" && selected.status === "pending" && (
                <div className="flex-shrink-0 flex gap-2 pt-2 border-t border-border/50">
                  <button onClick={() => updateStatus("accepted")} disabled={updatingStatus}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl gradient-gold text-white font-semibold text-sm shadow-gold">
                    {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accept</>}
                  </button>
                  <button onClick={() => updateStatus("declined")} disabled={updatingStatus}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border-2 border-border bg-white font-semibold text-sm text-destructive hover:border-destructive/40 transition-all">
                    <X className="w-4 h-4" /> Decline
                  </button>
                </div>
              )}
              {tab === "sent" && selected.status === "pending" && (
                <div className="flex-shrink-0 pt-2 border-t border-border/50">
                  <button onClick={() => updateStatus("cancelled")} disabled={updatingStatus}
                    className="w-full py-3 rounded-2xl border-2 border-border bg-white font-semibold text-sm text-destructive hover:border-destructive/40 transition-all">
                    Cancel Request
                  </button>
                </div>
              )}

              {/* Message input */}
              {(selected.status === "pending" || selected.status === "accepted") && (
                <div className="flex-shrink-0 flex gap-2 pt-2">
                  <textarea
                    placeholder="Send a message…"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    rows={2}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    className="flex-1 rounded-2xl bg-background border border-border/60 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold/25 focus:border-gold/40 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sendingMsg || !newMsg.trim()}
                    className="w-12 h-12 rounded-2xl gradient-gold text-white flex items-center justify-center shadow-gold self-end disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
                  >
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default Inbox;
