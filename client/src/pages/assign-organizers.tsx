import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, UserPlus, Users, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Event } from "@shared/schema";

export default function AssignOrganizersPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch event details
  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
  });

  // Fetch all organizers created by this event manager
  const { data: allOrganizers = [], isLoading: loadingOrganizers } = useQuery<User[]>({
    queryKey: ["/api/users/organizers"],
  });

  // Fetch organizers already assigned to this event
  const { data: assignedOrganizers = [], isLoading: loadingAssigned } = useQuery<User[]>({
    queryKey: ["/api/events", eventId, "organizers"],
  });

  const assignMutation = useMutation({
    mutationFn: async (organizerId: string) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/organizers`, {
        organizerId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التعيين",
        description: "تم تعيين المنظم للمناسبة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "organizers"] });
    },
    onError: () => {
      toast({
        title: "فشل التعيين",
        description: "حدث خطأ أثناء تعيين المنظم",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (organizerId: string) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/organizers/${organizerId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء تعيين المنظم",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "organizers"] });
    },
    onError: () => {
      toast({
        title: "فشل الإلغاء",
        description: "حدث خطأ أثناء إلغاء التعيين",
        variant: "destructive",
      });
    },
  });

  const assignedIds = assignedOrganizers.map((o) => o.id);

  const filteredOrganizers = allOrganizers.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingOrganizers || loadingAssigned;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/events/${eventId}`)}
          className="text-white hover:bg-white/10"
          data-testid="button-back"
        >
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">تعيين المنظمين</h1>
          <p className="text-muted-foreground">
            {event?.name || "جاري التحميل..."}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن منظم..."
          className="glass-input pr-12 h-12 rounded-xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-organizers"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="glass-card rounded-xl px-6 py-4">
          <p className="text-muted-foreground text-sm">المنظمون المتاحون</p>
          <p className="text-2xl font-bold text-white">{allOrganizers.length}</p>
        </div>
        <div className="glass-card rounded-xl px-6 py-4">
          <p className="text-muted-foreground text-sm">المعينون لهذه المناسبة</p>
          <p className="text-2xl font-bold text-primary">{assignedOrganizers.length}</p>
        </div>
      </div>

      {/* Organizers List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredOrganizers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">
            {allOrganizers.length === 0
              ? "لا يوجد منظمون. قم بإنشاء منظمين من صفحة فريق العمل أولاً."
              : "لا توجد نتائج للبحث"}
          </p>
          {allOrganizers.length === 0 && (
            <Button
              className="mt-4 gradient-primary"
              onClick={() => navigate("/organizers")}
              data-testid="button-go-to-organizers"
            >
              <UserPlus className="w-5 h-5 ml-2" />
              إنشاء منظم جديد
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrganizers.map((organizer) => {
            const isAssigned = assignedIds.includes(organizer.id);
            const isPending =
              (assignMutation.isPending && assignMutation.variables === organizer.id) ||
              (removeMutation.isPending && removeMutation.variables === organizer.id);

            return (
              <motion.div
                key={organizer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-xl p-4 transition-all ${
                  isAssigned ? "ring-2 ring-primary/50" : ""
                }`}
                data-testid={`organizer-card-${organizer.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {organizer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{organizer.name}</p>
                    <p className="text-muted-foreground text-sm truncate">
                      @{organizer.username}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isAssigned ? "secondary" : "default"}
                    disabled={isPending}
                    onClick={() => {
                      if (isAssigned) {
                        removeMutation.mutate(organizer.id);
                      } else {
                        assignMutation.mutate(organizer.id);
                      }
                    }}
                    className={
                      isAssigned
                        ? "bg-primary/20 text-primary hover:bg-primary/30"
                        : "gradient-primary"
                    }
                    data-testid={`button-${isAssigned ? "remove" : "assign"}-${organizer.id}`}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isAssigned ? (
                      <>
                        <Check className="w-4 h-4 ml-1" />
                        معين
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 ml-1" />
                        تعيين
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
