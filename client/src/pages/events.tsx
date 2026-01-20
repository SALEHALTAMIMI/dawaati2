import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Users, Plus, Search, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Event } from "@shared/schema";

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingEvents = filteredEvents.filter((e) => new Date(e.date) >= new Date());
  const pastEvents = filteredEvents.filter((e) => new Date(e.date) < new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">المناسبات</h1>
          <p className="text-muted-foreground">إدارة وتتبع جميع مناسباتك</p>
        </div>
        <Link href="/events/new">
          <Button className="gradient-primary glow-primary" data-testid="button-create-event">
            <Plus className="w-5 h-5 ml-2" />
            مناسبة جديدة
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مناسبة..."
          className="glass-input pr-12 h-12 rounded-xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-events"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-6 animate-pulse">
              <div className="h-6 bg-white/10 rounded mb-4 w-3/4" />
              <div className="h-4 bg-white/10 rounded mb-2 w-1/2" />
              <div className="h-4 bg-white/10 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">المناسبات القادمة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">المناسبات السابقة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastEvents.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} isPast />
                ))}
              </div>
            </div>
          )}

          {filteredEvents.length === 0 && (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-4">لا توجد مناسبات</p>
              <Link href="/events/new">
                <Button className="gradient-primary">
                  <Plus className="w-5 h-5 ml-2" />
                  أنشئ مناسبة جديدة
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, index, isPast }: { event: Event; index: number; isPast?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card rounded-2xl p-6 ${isPast ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/10">
            <Link href={`/events/${event.id}`}>
              <DropdownMenuItem className="text-white cursor-pointer">
                <Eye className="w-4 h-4 ml-2" />
                عرض التفاصيل
              </DropdownMenuItem>
            </Link>
            <Link href={`/events/${event.id}/edit`}>
              <DropdownMenuItem className="text-white cursor-pointer">
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="text-red-400 cursor-pointer">
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>
      <p className="text-muted-foreground text-sm mb-4">
        {new Date(event.date).toLocaleDateString("ar-SA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {event.location && (
        <p className="text-muted-foreground text-sm mb-4">{event.location}</p>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Badge
          variant="secondary"
          className={`${
            event.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {event.isActive ? "نشط" : "غير نشط"}
        </Badge>
        <Link href={`/events/${event.id}`}>
          <Button variant="ghost" size="sm" className="text-primary">
            عرض التفاصيل
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
