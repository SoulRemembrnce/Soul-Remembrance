import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import {
  Loader2, LogOut, Search, Shield, ShieldAlert, Trash2, CheckCircle2,
  UserCheck, Play, Pause, SearchX, Star, StarOff, Plus, Pencil, CalendarDays, Tag,
  FileSearch, Eye, XCircle,
} from "lucide-react";
import {
  FSPractitionerProfile, FSEvent, FSVerificationApplication,
  subscribePractitioners, subscribeEvents, subscribeVerificationApplications,
  computeStats, isFeaturedActive, verifyPractitioner, toggleSubscription,
  deletePractitioner, setFeaturedUntil, saveEvent, deleteEvent,
  approveVerificationApplication, rejectVerificationApplication,
  rejectCredentialsReview,
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

// ── Credential document labels ────────────────────────────────────────────────
const DOC_LABELS: Record<string, string> = {
  qualification: "Qualification / Certificate",
  insurance: "Professional Insurance",
  membership: "Professional Body",
  dbs: "DBS Check",
};

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
  const [verificationApplications, setVerificationApplications] = useState<FSVerificationApplication[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<FSVerificationApplication | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FSEvent | undefined>();

  const [credentialPractitioner, setCredentialPractitioner] = useState<FSPractitionerProfile | null>(null);
  const [credentialRejectionNote, setCredentialRejectionNote] = useState("");
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [credentialRejecting, setCredentialRejecting] = useState(false);

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
    const unsubVerifications = subscribeVerificationApplications(setVerificationApplications);
    return () => { unsubPractitioners(); unsubEvents(); unsubVerifications(); };
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
      if (statusFilter === "has-credentials") return !!p.credentialURLs && Object.keys(p.credentialURLs).length > 0;
      return true;
    });
  }, [practitioners, searchQuery, statusFilter]);

  const handleApproveCredentials = async (p: FSPractitionerProfile) => {
    setCredentialLoading(true);
    try {
      await verifyPractitioner(p.userId, true);
      toast({ title: "Approved ✓", description: `${p.name} is now verified.` });
      setCredentialPractitioner(null);
    } catch {
      toast({ title: "Error", description: "Failed to verify practitioner.", variant: "destructive" });
    } finally {
      setCredentialLoading(false);
    }
  };

  const handleRejectCredentials = async (p: FSPractitionerProfile) => {
    setCredentialRejecting(true);
    try {
      await rejectCredentialsReview(p.userId, credentialRejectionNote);
      toast({ title: "Rejection saved", description: "The practitioner has been notified." });
      setCredentialPractitioner(null);
      setCredentialRejectionNote("");
    } catch {
      toast({ title: "Error", description: "Failed to save rejection.", variant: "destructive" });
    } finally {
      setCredentialRejecting(false);
    }
  };

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

  const pendingVerificationCount = useMemo(
    () => verificationApplications.filter((a) => a.status === "pending").length,
    [verificationApplications]
  );

  const handleApproveVerification = async (app: FSVerificationApplication) => {
    try {
      const name = practitioners.find((p) => p.userId === app.practitionerUid)?.name ?? "Practitioner";
      await approveVerificationApplication(app.id, app.practitionerUid);
      toast({ title: "Verified!", description: `${name} is now verified and will appear first in listings.` });
    } catch {
      toast({ title: "Error", description: "Failed to approve verification.", variant: "destructive" });
    }
  };

  const handleOpenReject = (app: FSVerificationApplication) => {
    setRejectingApp(app);
    setRejectNote("");
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingApp) return;
    try {
      await rejectVerificationApplication(rejectingApp.id, rejectNote);
      toast({ title: "Application rejected" });
      setRejectDialogOpen(false);
      setRejectingApp(null);
      setRejectNote("");
    } catch {
      toast({ title: "Error", description: "Failed to reject application.", variant: "destructive" });
    }
  };

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
            <TabsTrigger value="verifications" className="gap-1.5">
              Verifications
              {pendingVerificationCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {pendingVerificationCount}
                </span>
              )}
            </TabsTrigger>
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
                    <SelectItem value="has-credentials">Has Uploaded Docs</SelectItem>
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
                                  {p.credentialURLs && Object.keys(p.credentialURLs).length > 0 && !p.verified && (
                                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setCredentialPractitioner(p); setCredentialRejectionNote(""); }}>
                                      <FileSearch className="h-3 w-3" />
                                      {Object.keys(p.credentialURLs).length} Doc{Object.keys(p.credentialURLs).length > 1 ? "s" : ""} to Review
                                    </Badge>
                                  )}
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
                                  {p.credentialURLs && Object.keys(p.credentialURLs).length > 0 && (
                                    <Button
                                      variant="outline" size="sm"
                                      onClick={(e) => { e.stopPropagation(); setCredentialPractitioner(p); setCredentialRejectionNote(""); }}
                                      title="Review credential documents"
                                      className="border-violet-200 text-violet-700 hover:bg-violet-50"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
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
                              style={{ background: ev.avatarColor ? `linear-gradient(135deg, ${ev.avatarColor[0]}, ${ev.avatarColor[1]})` : "linear-gradient(135deg, #2D1B69, #6B4FA8)" }}
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
                            {(ev.tags ?? []).slice(0, 3).map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Tag className="h-3 w-3" />{t}
                              </span>
                            ))}
                            {(ev.tags ?? []).length > 3 && <span className="text-xs text-muted-foreground">+{(ev.tags ?? []).length - 3}</span>}
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

          {/* ── Verifications tab ──────────────────────────────────────── */}
          <TabsContent value="verifications" className="space-y-4">
            {verificationApplications.length === 0 ? (
              <div className="bg-card rounded-lg border border-border/40 py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No verification applications yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Applications from practitioners will appear here once submitted.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {verificationApplications.map((app) => {
                  const practitioner = practitioners.find((p) => p.userId === app.practitionerUid);
                  const name = practitioner?.name ?? app.practitionerUid;
                  const statusCls =
                    app.status === "pending"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : app.status === "approved"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-red-100 text-red-800 border-red-200";
                  return (
                    <div key={app.id} className="bg-card rounded-lg border border-border/40 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {new Date(app.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                              {app.reviewedAt && (
                                <> · Reviewed {new Date(app.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge className={`border ${statusCls} capitalize font-medium shrink-0`}>
                          {app.status}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Uploaded Documents</p>
                        <div className="flex flex-wrap gap-3">
                          {app.documents.certificates.map((url, i) => (
                            <a key={`cert-${i}`} href={url} target="_blank" rel="noopener noreferrer" title={`Certificate ${i + 1}`}>
                              <div className="relative">
                                <img src={url} alt={`Certificate ${i + 1}`} className="w-20 h-20 object-cover rounded-md border border-border hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer" />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[9px] text-center py-0.5 rounded-b-md">Cert {i + 1}</span>
                              </div>
                            </a>
                          ))}
                          {app.documents.insurance ? (
                            <a href={app.documents.insurance} target="_blank" rel="noopener noreferrer" title="Insurance">
                              <div className="relative">
                                <img src={app.documents.insurance} alt="Insurance" className="w-20 h-20 object-cover rounded-md border border-border hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer" />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[9px] text-center py-0.5 rounded-b-md">Insurance</span>
                              </div>
                            </a>
                          ) : null}
                          {app.documents.dbs ? (
                            <a href={app.documents.dbs} target="_blank" rel="noopener noreferrer" title="DBS">
                              <div className="relative">
                                <img src={app.documents.dbs} alt="DBS" className="w-20 h-20 object-cover rounded-md border border-border hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer" />
                                <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[9px] text-center py-0.5 rounded-b-md">DBS</span>
                              </div>
                            </a>
                          ) : null}
                          {app.documents.certificates.length === 0 && !app.documents.insurance && !app.documents.dbs && (
                            <p className="text-sm text-muted-foreground italic">No documents uploaded</p>
                          )}
                        </div>
                      </div>

                      {app.status === "rejected" && app.rejectionNote && (
                        <div className="bg-red-50 border border-red-100 rounded-md p-3">
                          <p className="text-xs font-medium text-red-700 mb-1">Rejection note sent to practitioner</p>
                          <p className="text-sm text-red-600">{app.rejectionNote}</p>
                        </div>
                      )}

                      {app.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApproveVerification(app)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                            onClick={() => handleOpenReject(app)}
                          >
                            <ShieldAlert className="h-4 w-4 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Reject verification dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(o) => { if (!o) { setRejectDialogOpen(false); setRejectingApp(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Optionally provide a reason — it will be shown to the practitioner so they can reapply correctly.
            </p>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="e.g. Insurance document appears expired. Please reapply with a current certificate."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectingApp(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        existing={editingEvent}
      />

      {/* ── Credential Review Dialog ───────────────────────────────── */}
      <Dialog
        open={!!credentialPractitioner}
        onOpenChange={(o) => { if (!o) { setCredentialPractitioner(null); setCredentialRejectionNote(""); } }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-violet-600" />
              Review Credentials — {credentialPractitioner?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Already verified notice */}
            {credentialPractitioner?.verified && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-700 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                This practitioner is already verified. You can still view their documents below.
              </div>
            )}

            {/* Prior rejection note */}
            {credentialPractitioner?.credentialReviewNote && !credentialPractitioner.verified && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm">
                <p className="font-medium mb-0.5">Previous rejection note:</p>
                <p>{credentialPractitioner.credentialReviewNote}</p>
              </div>
            )}

            {/* Document thumbnails */}
            <div className="grid grid-cols-2 gap-3">
              {credentialPractitioner && Object.entries(credentialPractitioner.credentialURLs ?? {}).map(([docId, url]) => (
                <a key={docId} href={url} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="border border-border rounded-lg overflow-hidden hover:border-violet-400 transition-colors">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      <img
                        src={url}
                        alt={DOC_LABELS[docId] ?? docId}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <Eye className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                      </div>
                    </div>
                    <div className="p-2.5 bg-background">
                      <p className="text-xs font-semibold text-foreground">{DOC_LABELS[docId] ?? docId}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Click to open full size ↗</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Rejection note textarea (only shown if not yet verified) */}
            {credentialPractitioner && !credentialPractitioner.verified && (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Rejection note <span className="font-normal text-muted-foreground">(optional — shown to practitioner)</span>
                </Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  placeholder="e.g. Insurance document appears expired. Please reapply with a current certificate."
                  value={credentialRejectionNote}
                  onChange={(e) => setCredentialRejectionNote(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCredentialPractitioner(null); setCredentialRejectionNote(""); }}>
              Close
            </Button>
            {credentialPractitioner && !credentialPractitioner.verified && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleRejectCredentials(credentialPractitioner)}
                  disabled={credentialRejecting || credentialLoading}
                >
                  {credentialRejecting
                    ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    : <XCircle className="h-4 w-4 mr-1.5" />}
                  Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleApproveCredentials(credentialPractitioner)}
                  disabled={credentialLoading || credentialRejecting}
                >
                  {credentialLoading
                    ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Approve & Verify
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
