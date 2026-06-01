import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import {
  Loader2, LogOut, Search, Shield, ShieldAlert, Trash2, CheckCircle2,
  UserCheck, Play, Pause, SearchX, Star, StarOff, Plus, Pencil, CalendarDays, Tag,
} from "lucide-react";
import {
  FSPractitionerProfile, FSEvent,
  subscribePractitioners, subscribeEvents,
  computeStats, isFeaturedActive, verifyPractitioner, toggleSubscription,
  deletePractitioner, setFeaturedUntil, saveEvent, deleteEvent,
  AdminStats,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

// ── Avatar colour palette for new events ─────────────────────────────────────
const AVATAR_COLOURS: [string, string][] = [
  ["#2D1B69", "#7B5EA7"],
  ["#3D2496", "#9B7FD4"],
  ["#6B4FA8", "#C9A84C"],
  ["#1A4D2E", "#3A8C5C"],
  ["#6B1F6B", "#A855A8"],
  ["#0D3B6E", "#1A6EAD"],
];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ── Blank event form ──────────────────────────────────────────────────────────
const BLANK_FORM = {
  title: "",
  host: "",
  date: "",
  time: "",
  type: "Live Online",
  location: "",
  tagsRaw: "",
};

type EventForm = typeof BLANK_FORM;

function eventFromForm(form: EventForm, existing?: FSEvent): FSEvent {
  const tags = form.tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const typeValue =
    form.type === "In-Person" && form.location
      ? `In-Person · ${form.location}`
      : form.type;
  const colour = existing?.avatarColor ?? AVATAR_COLOURS[Math.floor(Math.random() * AVATAR_COLOURS.length)];
  return {
    id: existing?.id ?? Date.now(),
    title: form.title.trim(),
    host: form.host.trim(),
    hostInitials: initials(form.host),
    avatarColor: colour,
    date: form.date,
    time: form.time.trim(),
    type: typeValue,
    attendees: existing?.attendees ?? 0,
    tags,
  };
}

function formFromEvent(ev: FSEvent): EventForm {
  const isInPerson = ev.type.startsWith("In-Person");
  const location = isInPerson ? ev.type.replace("In-Person · ", "") : "";
  return {
    title: ev.title,
    host: ev.host,
    date: ev.date,
    time: ev.time,
    type: isInPerson ? "In-Person" : "Live Online",
    location,
    tagsRaw: ev.tags.join(", "),
  };
}

// ── Event dialog ──────────────────────────────────────────────────────────────
function EventDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: FSEvent;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<EventForm>(existing ? formFromEvent(existing) : BLANK_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(existing ? formFromEvent(existing) : BLANK_FORM);
  }, [existing, open]);

  function set(key: keyof EventForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title || !form.host || !form.date || !form.time) {
      toast({ title: "Missing fields", description: "Title, host, date and time are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveEvent(eventFromForm(form, existing));
      toast({ title: existing ? "Event updated" : "Event created", description: form.title });
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to save event.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Full Moon Meditation Circle" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Host name *</Label>
            <Input placeholder="Luna Ashford" value={form.host} onChange={(e) => set("host", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time *</Label>
              <Input placeholder="7:00 PM" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Session type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Live Online">Live Online</SelectItem>
                <SelectItem value="In-Person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.type === "In-Person" && (
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="Bristol, UK" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <Input placeholder="meditation, breathwork, healing" value={form.tagsRaw} onChange={(e) => set("tagsRaw", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existing ? "Save changes" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [practitioners, setPractitioners] = useState<FSPractitionerProfile[]>([]);
  const [events, setEvents] = useState<FSEvent[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FSEvent | undefined>();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) setLocation("/");
  }, [user, isAdmin, loading, setLocation]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const unsubPractitioners = subscribePractitioners((data) => {
      setPractitioners(data);
      setIsSubscribed(true);
    });
    const unsubEvents = subscribeEvents(setEvents);
    return () => { unsubPractitioners(); unsubEvents(); };
  }, [user, isAdmin]);

  const stats: AdminStats = useMemo(() => computeStats(practitioners), [practitioners]);

  const filteredPractitioners = useMemo(() => {
    return practitioners.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === "verified") return p.verified;
      if (statusFilter === "unverified") return !p.verified;
      if (statusFilter === "active") return p.subscriptionActive;
      if (statusFilter === "inactive") return !p.subscriptionActive;
      if (statusFilter === "featured") return isFeaturedActive(p);
      return true;
    });
  }, [practitioners, searchQuery, statusFilter]);

  const handleVerifyToggle = async (p: FSPractitionerProfile) => {
    try {
      await verifyPractitioner(p.userId, !p.verified);
      toast({ title: "Success", description: `Practitioner ${!p.verified ? "verified" : "unverified"}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update verification status.", variant: "destructive" });
    }
  };

  const handleSubToggle = async (p: FSPractitionerProfile) => {
    try {
      await toggleSubscription(p.userId, !p.subscriptionActive);
      toast({ title: "Success", description: `Subscription ${!p.subscriptionActive ? "activated" : "deactivated"}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update subscription status.", variant: "destructive" });
    }
  };

  const handleDeletePractitioner = async (userId: string) => {
    try {
      await deletePractitioner(userId);
      toast({ title: "Success", description: "Practitioner removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete practitioner.", variant: "destructive" });
    }
  };

  const handleExtendFeatured = async (p: FSPractitionerProfile, days: number) => {
    try {
      const base = isFeaturedActive(p) ? p.featuredUntil!.toDate() : new Date();
      const until = new Date(base);
      until.setDate(until.getDate() + days);
      await setFeaturedUntil(p.userId, until);
      toast({ title: "Featured updated", description: `${p.name} featured until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update featured status.", variant: "destructive" });
    }
  };

  const handleRemoveFeatured = async (p: FSPractitionerProfile) => {
    try {
      await setFeaturedUntil(p.userId, null);
      toast({ title: "Featured removed", description: `${p.name} is no longer featured.` });
    } catch {
      toast({ title: "Error", description: "Failed to remove featured status.", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await deleteEvent(id);
      toast({ title: "Event deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    }
  };

  const toggleRow = (userId: string) => {
    const next = new Set(expandedRows);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    setExpandedRows(next);
  };

  const openNew = () => { setEditingEvent(undefined); setEventDialogOpen(true); };
  const openEdit = (ev: FSEvent) => { setEditingEvent(ev); setEventDialogOpen(true); };

  if (loading || !isSubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-serif text-sm">SR</div>
            <h1 className="font-serif font-semibold text-lg text-foreground">
              Soul Remembrance <span className="text-muted-foreground font-sans font-normal text-sm ml-2">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Practitioners" value={stats.total} icon={<UserCheck className="h-4 w-4 text-primary" />} />
          <StatCard title="Verified" value={stats.verified} icon={<Shield className="h-4 w-4 text-emerald-600" />} />
          <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} />
          <StatCard title="Currently Featured" value={stats.featured} icon={<Star className="h-4 w-4 text-yellow-500" />} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="practitioners">
          <TabsList className="mb-2">
            <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          {/* ── Practitioners tab ─────────────────────────────────────── */}
          <TabsContent value="practitioners" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border/40">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Filter status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Practitioners</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="active">Active Subscription</SelectItem>
                    <SelectItem value="inactive">Inactive Subscription</SelectItem>
                    <SelectItem value="featured">Currently Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border/40 overflow-hidden shadow-sm">
              {practitioners.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <SearchX className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No practitioners yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">When practitioners register on the platform, they will appear here for review.</p>
                </div>
              ) : filteredPractitioners.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <p className="text-muted-foreground">No practitioners match your search criteria.</p>
                  <Button variant="link" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>Clear filters</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[250px]">Practitioner</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPractitioners.map((p) => (
                        <Collapsible key={p.userId} asChild open={expandedRows.has(p.userId)} onOpenChange={() => toggleRow(p.userId)}>
                          <>
                            <TableRow className="group cursor-pointer">
                              <TableCell className="font-medium" onClick={() => toggleRow(p.userId)}>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-border">
                                    <AvatarFallback style={{ backgroundColor: p.avatarColor?.[0] || "var(--muted)", color: p.avatarColor?.[1] || "inherit" }}>
                                      {p.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-foreground">{p.name}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[180px]">{p.title}</div>
                                    {p.email && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{p.email}</div>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell onClick={() => toggleRow(p.userId)}>
                                <div className="text-sm">{p.city || p.location}</div>
                                <div className="text-xs text-muted-foreground">{p.country}</div>
                              </TableCell>
                              <TableCell onClick={() => toggleRow(p.userId)}>
                                <div className="text-sm font-medium">£{p.rate}/hr</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  {p.years} exp &bull; <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {p.rating} ({p.reviewCount})
                                </div>
                              </TableCell>
                              <TableCell onClick={() => toggleRow(p.userId)}>
                                <div className="flex flex-col gap-1.5 items-start">
                                  {p.verified
                                    ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified</Badge>
                                    : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending Review</Badge>}
                                  {p.subscriptionActive
                                    ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active Sub</Badge>
                                    : <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Inactive Sub</Badge>}
                                  {isFeaturedActive(p) && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                      Featured
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleVerifyToggle(p); }} title={p.verified ? "Remove Verification" : "Verify Practitioner"}>
                                    {p.verified ? <ShieldAlert className="h-4 w-4 text-amber-600" /> : <Shield className="h-4 w-4 text-emerald-600" />}
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleSubToggle(p); }} title={p.subscriptionActive ? "Pause Subscription" : "Activate Subscription"}>
                                    {p.subscriptionActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-blue-600" />}
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Practitioner?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently remove {p.name} from the platform. This action cannot be undone.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePractitioner(p.userId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                            <CollapsibleContent asChild>
                              <TableRow className="bg-muted/10 border-b border-border/40">
                                <TableCell colSpan={5} className="p-0">
                                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 space-y-4">
                                      <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2">Biography</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.bio || "No biography provided."}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2">Modalities</h4>
                                        <div className="flex flex-wrap gap-2">
                                          {p.modalities?.length > 0
                                            ? p.modalities.map((m) => <Badge key={m} variant="secondary" className="font-normal text-xs">{m}</Badge>)
                                            : <span className="text-sm text-muted-foreground">No modalities listed.</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-4 border-l border-border/40 pl-6">
                                      <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-2">Platform Details</h4>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                          <div className="flex justify-between"><span>User ID:</span><span className="font-mono text-xs">{p.userId}</span></div>
                                          <div className="flex justify-between"><span>Numeric ID:</span><span className="font-mono text-xs">{p.numericId}</span></div>
                                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/40">
                                            <span>Online Sessions:</span>
                                            {p.online
                                              ? <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 py-0 h-5">Available</Badge>
                                              : <span className="text-xs">Unavailable</span>}
                                          </div>
                                        </div>
                                      </div>

                                      {/* ── Featured placement ─────────────── */}
                                      <div className="pt-2 border-t border-border/40">
                                        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                          Featured Placement
                                        </h4>
                                        <div className="text-sm text-muted-foreground mb-3">
                                          {isFeaturedActive(p)
                                            ? <>Active — expires <span className="font-medium text-foreground">{p.featuredUntil!.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></>
                                            : p.featuredUntil
                                              ? <span className="text-destructive/70">Expired {p.featuredUntil.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                              : "Not featured"}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          <Button
                                            size="sm" variant="outline"
                                            className="text-xs h-7 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                            onClick={() => handleExtendFeatured(p, 30)}
                                          >
                                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                            {isFeaturedActive(p) ? "Extend 30 days" : "Feature for 30 days"}
                                          </Button>
                                          {(isFeaturedActive(p) || p.featuredUntil) && (
                                            <Button
                                              size="sm" variant="outline"
                                              className="text-xs h-7 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                                              onClick={() => handleRemoveFeatured(p)}
                                            >
                                              <StarOff className="h-3 w-3 mr-1" />
                                              Remove
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Events tab ────────────────────────────────────────────── */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {events.length === 0 ? "No events yet." : `${events.length} event${events.length !== 1 ? "s" : ""}`}
              </p>
              <Button onClick={openNew} size="sm">
                <Plus className="h-4 w-4 mr-2" />Add Event
              </Button>
            </div>

            {events.length === 0 ? (
              <div className="bg-card rounded-lg border border-border/40 py-24 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center">
                  <CalendarDays className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground">No events yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Add an event here and it will appear in the app's home screen for the next 7 days.
                </p>
                <Button onClick={openNew} className="mt-2"><Plus className="h-4 w-4 mr-2" />Add First Event</Button>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border/40 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[280px]">Event</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => (
                      <TableRow key={ev.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${ev.avatarColor[0]}, ${ev.avatarColor[1]})` }}
                            >
                              {ev.hostInitials}
                            </div>
                            <span className="text-sm leading-snug">{ev.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{ev.host}</TableCell>
                        <TableCell className="text-sm">
                          <div>{new Date(ev.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                          <div className="text-xs text-muted-foreground">{ev.time}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {ev.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ev.tags.slice(0, 3).map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Tag className="h-3 w-3" />{t}
                              </span>
                            ))}
                            {ev.tags.length > 3 && <span className="text-xs text-muted-foreground">+{ev.tags.length - 3}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" onClick={() => openEdit(ev)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{ev.title}" will be removed from the app immediately. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteEvent(ev.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <EventDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        existing={editingEvent}
      />
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-card p-5 rounded-lg border border-border/40 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div className="p-2 bg-muted/50 rounded-md">{icon}</div>
    </div>
  );
}
