import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { Loader2, LogOut, Search, Shield, ShieldAlert, Trash2, CheckCircle2, UserCheck, Play, Pause, SearchX, Star, MapPin, Globe } from "lucide-react";
import { FSPractitionerProfile, subscribePractitioners, computeStats, verifyPractitioner, toggleSubscription, deletePractitioner, AdminStats } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Dashboard() {
  const { user, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [practitioners, setPractitioners] = useState<FSPractitionerProfile[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      setLocation("/");
    }
  }, [user, isAdmin, loading, setLocation]);

  useEffect(() => {
    if (user && isAdmin) {
      const unsubscribe = subscribePractitioners((data) => {
        setPractitioners(data);
        setIsSubscribed(true);
      });
      return () => unsubscribe();
    }
  }, [user, isAdmin]);

  const stats: AdminStats = useMemo(() => computeStats(practitioners), [practitioners]);

  const filteredPractitioners = useMemo(() => {
    return practitioners.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (statusFilter === "verified") return p.verified;
      if (statusFilter === "unverified") return !p.verified;
      if (statusFilter === "active") return p.subscriptionActive;
      if (statusFilter === "inactive") return !p.subscriptionActive;
      
      return true;
    });
  }, [practitioners, searchQuery, statusFilter]);

  const handleVerifyToggle = async (p: FSPractitionerProfile) => {
    try {
      await verifyPractitioner(p.userId, !p.verified);
      toast({ title: "Success", description: `Practitioner ${!p.verified ? 'verified' : 'unverified'}.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update verification status.", variant: "destructive" });
    }
  };

  const handleSubToggle = async (p: FSPractitionerProfile) => {
    try {
      await toggleSubscription(p.userId, !p.subscriptionActive);
      toast({ title: "Success", description: `Subscription ${!p.subscriptionActive ? 'activated' : 'deactivated'}.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update subscription status.", variant: "destructive" });
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deletePractitioner(userId);
      toast({ title: "Success", description: "Practitioner removed." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete practitioner.", variant: "destructive" });
    }
  };

  const toggleRow = (userId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
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
      <header className="border-b border-border/40 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-serif text-sm">
              SR
            </div>
            <h1 className="font-serif font-semibold text-lg text-foreground">Soul Remembrance <span className="text-muted-foreground font-sans font-normal text-sm ml-2">Admin</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Practitioners" value={stats.total} icon={<UserCheck className="h-4 w-4 text-primary" />} />
          <StatCard title="Verified" value={stats.verified} icon={<Shield className="h-4 w-4 text-emerald-600" />} />
          <StatCard title="Active Subscriptions" value={stats.activeSubscriptions} icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} />
          <StatCard title="Online Sessions" value={stats.online} icon={<Play className="h-4 w-4 text-purple-600" />} />
        </div>

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
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Practitioners</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="active">Active Subscription</SelectItem>
                <SelectItem value="inactive">Inactive Subscription</SelectItem>
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
               <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                 When practitioners register on the platform, they will appear here for review.
               </p>
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
                    <Collapsible 
                      key={p.userId} 
                      asChild 
                      open={expandedRows.has(p.userId)} 
                      onOpenChange={() => toggleRow(p.userId)}
                    >
                      <>
                        <TableRow className="group cursor-pointer">
                          <TableCell className="font-medium" onClick={() => toggleRow(p.userId)}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border">
                                <AvatarFallback style={{ backgroundColor: p.avatarColor?.[0] || 'var(--muted)', color: p.avatarColor?.[1] || 'inherit' }}>
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
                              {p.verified ? 
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified</Badge> : 
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending Review</Badge>
                              }
                              {p.subscriptionActive ? 
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active Sub</Badge> : 
                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Inactive Sub</Badge>
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); handleVerifyToggle(p); }}
                                title={p.verified ? "Remove Verification" : "Verify Practitioner"}
                              >
                                {p.verified ? <ShieldAlert className="h-4 w-4 text-amber-600" /> : <Shield className="h-4 w-4 text-emerald-600" />}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleSubToggle(p); }}
                                title={p.subscriptionActive ? "Pause Subscription" : "Activate Subscription"}
                              >
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
                                    <AlertDialogDescription>
                                      This will permanently remove {p.name} from the platform. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(p.userId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Delete
                                    </AlertDialogAction>
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
                                      {p.modalities?.length > 0 ? p.modalities.map(m => (
                                        <Badge key={m} variant="secondary" className="font-normal text-xs">{m}</Badge>
                                      )) : <span className="text-sm text-muted-foreground">No modalities listed.</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4 border-l border-border/40 pl-6">
                                  <div>
                                    <h4 className="text-sm font-semibold text-foreground mb-2">Platform Details</h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                      <div className="flex justify-between">
                                        <span>User ID:</span>
                                        <span className="font-mono text-xs">{p.userId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Numeric ID:</span>
                                        <span className="font-mono text-xs">{p.numericId}</span>
                                      </div>
                                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/40">
                                        <span>Online Sessions:</span>
                                        {p.online ? 
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 py-0 h-5">Available</Badge> : 
                                          <span className="text-xs">Unavailable</span>
                                        }
                                      </div>
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
      </main>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-card p-5 rounded-lg border border-border/40 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div className="p-2 bg-muted/50 rounded-md">
        {icon}
      </div>
    </div>
  );
}
