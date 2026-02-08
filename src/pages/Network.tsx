import { useState } from "react";
import { Globe, Search, Star, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DancerProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  styles: string[];
  karma: number;
  followers: number;
  online: boolean;
}

const MOCK_DANCERS: DancerProfile[] = [
  { id: "1", name: "Maya Groove", handle: "@mayagroove", avatar: "https://placehold.co/80x80/7c3aed/fff?text=MG", styles: ["Breaking", "Popping"], karma: 842, followers: 215, online: true },
  { id: "2", name: "Kenzo Flow", handle: "@kenzoflow", avatar: "https://placehold.co/80x80/3b82f6/fff?text=KF", styles: ["House", "Locking"], karma: 1203, followers: 389, online: true },
  { id: "3", name: "Aria Whirl", handle: "@ariawhirl", avatar: "https://placehold.co/80x80/ec4899/fff?text=AW", styles: ["Contemporary", "Waacking"], karma: 567, followers: 142, online: false },
  { id: "4", name: "DJ Spinback", handle: "@djspinback", avatar: "https://placehold.co/80x80/f59e0b/fff?text=DS", styles: ["Hip-Hop", "Krump"], karma: 2100, followers: 571, online: true },
  { id: "5", name: "Luna Steps", handle: "@lunasteps", avatar: "https://placehold.co/80x80/14b8a6/fff?text=LS", styles: ["Ballet", "Contemporary"], karma: 430, followers: 98, online: false },
  { id: "6", name: "Rex Breaker", handle: "@rexbreaker", avatar: "https://placehold.co/80x80/ef4444/fff?text=RB", styles: ["Breaking", "Tutting"], karma: 1580, followers: 420, online: true },
  { id: "7", name: "Nami Vogue", handle: "@namivogue", avatar: "https://placehold.co/80x80/d946ef/fff?text=NV", styles: ["Voguing", "Waacking"], karma: 960, followers: 310, online: false },
  { id: "8", name: "Zane Pop", handle: "@zanepop", avatar: "https://placehold.co/80x80/06b6d4/fff?text=ZP", styles: ["Popping", "Animation"], karma: 735, followers: 188, online: true },
  { id: "9", name: "Isla Beat", handle: "@islabeat", avatar: "https://placehold.co/80x80/a855f7/fff?text=IB", styles: ["Dancehall", "Afrobeats"], karma: 1120, followers: 345, online: false },
  { id: "10", name: "Takumi Lock", handle: "@takumulock", avatar: "https://placehold.co/80x80/eab308/fff?text=TL", styles: ["Locking", "Hip-Hop"], karma: 890, followers: 267, online: true },
];

const Network = () => {
  const [search, setSearch] = useState("");

  const filtered = search
    ? MOCK_DANCERS.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.styles.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : MOCK_DANCERS;

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Network</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Discover dancers and connect with the community</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or dance style..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Dancer Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((dancer) => (
          <Card key={dancer.id} className="bg-gradient-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={dancer.avatar} alt={dancer.name} />
                    <AvatarFallback>{dancer.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  {dancer.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">{dancer.name}</h3>
                  <p className="text-xs text-muted-foreground">{dancer.handle}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {dancer.styles.map((style) => (
                  <Badge key={style} variant="secondary" className="text-xs">
                    {style}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 text-warning" />{dancer.karma}</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />{dancer.followers}</span>
                </div>
                <Button size="sm" disabled className="opacity-60">
                  Connect · Soon
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">No dancers match your search.</p>
        </div>
      )}
    </div>
  );
};

export default Network;
