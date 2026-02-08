import { useState } from "react";
import { CalendarDays, MapPin, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type EventType = "Battle" | "Workshop" | "Cypher";

interface DanceEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  month: string;
  day: string;
  time: string;
  location: string;
  attendees: number;
  prizePool?: string;
}

const MOCK_EVENTS: DanceEvent[] = [
  { id: "1", title: "Underground Kings B-Boy Battle", type: "Battle", date: "2026-03-15", month: "MAR", day: "15", time: "7:00 PM", location: "Brooklyn Warehouse, NYC", attendees: 128, prizePool: "500 USDC" },
  { id: "2", title: "Popping Fundamentals Workshop", type: "Workshop", date: "2026-03-18", month: "MAR", day: "18", time: "2:00 PM", location: "Dance Lab, LA", attendees: 32 },
  { id: "3", title: "Friday Night Cypher", type: "Cypher", date: "2026-03-21", month: "MAR", day: "21", time: "9:00 PM", location: "The Circle, Chicago", attendees: 64 },
  { id: "4", title: "All Styles 1v1 Championship", type: "Battle", date: "2026-03-28", month: "MAR", day: "28", time: "6:00 PM", location: "Red Bull Arena, London", attendees: 256, prizePool: "2,000 USDC" },
  { id: "5", title: "House Dance Intensive", type: "Workshop", date: "2026-04-02", month: "APR", day: "02", time: "11:00 AM", location: "Rhythm Room, Tokyo", attendees: 24 },
  { id: "6", title: "Open Air Cypher", type: "Cypher", date: "2026-04-05", month: "APR", day: "05", time: "4:00 PM", location: "Venice Beach, LA", attendees: 80 },
  { id: "7", title: "Locking vs Waacking Face-Off", type: "Battle", date: "2026-04-12", month: "APR", day: "12", time: "8:00 PM", location: "Studio 54, Berlin", attendees: 96, prizePool: "800 USDC" },
  { id: "8", title: "Animation Masterclass", type: "Workshop", date: "2026-04-15", month: "APR", day: "15", time: "3:00 PM", location: "The Lab, Seoul", attendees: 20 },
];

const TYPE_COLORS: Record<EventType, string> = {
  Battle: "bg-destructive/10 text-destructive border-destructive/20",
  Workshop: "bg-primary/10 text-primary border-primary/20",
  Cypher: "bg-accent/10 text-accent border-accent/20",
};

const EventCard = ({ event }: { event: DanceEvent }) => (
  <Card className="bg-gradient-card">
    <CardContent className="p-4 sm:p-5 flex gap-4">
      {/* Date Badge */}
      <div className="flex flex-col items-center justify-center rounded-xl bg-secondary/40 px-3 py-2 min-w-[56px]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{event.month}</span>
        <span className="font-display text-xl font-bold text-foreground">{event.day}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-foreground leading-tight">{event.title}</h3>
          <Badge variant="outline" className={`shrink-0 text-xs ${TYPE_COLORS[event.type]}`}>
            {event.type}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.attendees} attending</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {event.prizePool ? (
            <Badge variant="secondary" className="font-mono text-xs">🏆 {event.prizePool}</Badge>
          ) : (
            <span />
          )}
          <Button size="sm" disabled className="opacity-60">
            RSVP · Coming Soon
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const Events = () => {
  const [tab, setTab] = useState("all");

  const filtered = tab === "all"
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter((e) => e.type.toLowerCase() === tab);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">Events</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Dance battles, cyphers, and workshops near you</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="battle">Battles</TabsTrigger>
          <TabsTrigger value="workshop">Workshops</TabsTrigger>
          <TabsTrigger value="cypher">Cyphers</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No events in this category yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Events;
