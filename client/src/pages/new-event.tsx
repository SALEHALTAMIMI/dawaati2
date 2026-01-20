import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Calendar, MapPin, Clock, Loader2, ArrowRight, Package, AlertCircle, Infinity } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

interface CapacityTier {
  id: string;
  name: string;
  minGuests: number;
  maxGuests: number | null;
  isUnlimited: boolean;
}

interface QuotaInfo {
  hasQuota: boolean;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
}

const eventFormSchema = z.object({
  name: z.string().min(1, "اسم المناسبة مطلوب"),
  description: z.string().optional(),
  date: z.string().min(1, "تاريخ المناسبة مطلوب"),
  location: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  capacityTierId: z.string().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

export default function NewEventPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: capacityTiers = [] } = useQuery<CapacityTier[]>({
    queryKey: ["/api/capacity-tiers"],
  });

  const { data: quotaInfo } = useQuery<QuotaInfo>({
    queryKey: ["/api/quota/info"],
    enabled: user?.role === "event_manager",
  });

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      location: "",
      startTime: "",
      endTime: "",
      capacityTierId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await apiRequest("POST", "/api/events", {
        ...data,
        date: new Date(data.date).toISOString(),
        capacityTierId: data.capacityTierId || null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم إنشاء المناسبة",
        description: "تم إنشاء المناسبة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setLocation(`/events/${data.id}`);
    },
    onError: () => {
      toast({
        title: "فشل إنشاء المناسبة",
        description: "حدث خطأ أثناء إنشاء المناسبة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate(data);
  };

  // Check if user has exceeded quota
  const isQuotaExceeded = quotaInfo?.hasQuota && quotaInfo.remainingQuota <= 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/events">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">مناسبة جديدة</h1>
          <p className="text-muted-foreground">أنشئ مناسبة جديدة وابدأ بإضافة الضيوف</p>
        </div>
      </div>

      {/* Quota Info Card for Event Managers */}
      {quotaInfo?.hasQuota && (
        <Card className={`glass-card border-white/10 mb-6 ${isQuotaExceeded ? "border-red-500/50" : ""}`} data-testid="card-quota-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isQuotaExceeded ? (
                <AlertCircle className="w-6 h-6 text-red-400" />
              ) : (
                <Package className="w-6 h-6 text-primary" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${isQuotaExceeded ? "text-red-400" : "text-white"}`} data-testid="text-quota-status">
                  {isQuotaExceeded
                    ? "لقد استنفذت حصتك من المناسبات"
                    : `رصيد المناسبات المتبقي: ${quotaInfo.remainingQuota} من ${quotaInfo.totalQuota}`}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-quota-used">
                  المستخدم: {quotaInfo.usedQuota} مناسبة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">اسم المناسبة *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="مثال: حفل زفاف أحمد وسارة"
                        className="glass-input pr-10 h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-event-name"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">الوصف</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="وصف المناسبة..."
                      className="glass-input rounded-xl text-white placeholder:text-muted-foreground min-h-24 resize-none"
                      data-testid="input-event-description"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">التاريخ *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="glass-input h-12 rounded-xl text-white"
                      data-testid="input-event-date"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">الموقع</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="مثال: فندق الريتز كارلتون، الرياض"
                        className="glass-input pr-10 h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-event-location"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">وقت البداية</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="time"
                          className="glass-input pr-10 h-12 rounded-xl text-white"
                          data-testid="input-event-start-time"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">وقت النهاية</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          {...field}
                          type="time"
                          className="glass-input pr-10 h-12 rounded-xl text-white"
                          data-testid="input-event-end-time"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            {/* Capacity Tier Selection - Required for Event Managers */}
            {capacityTiers.length > 0 && (
              <FormField
                control={form.control}
                name="capacityTierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      باقة السعة {user?.role === "event_manager" && "*"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="glass-input h-12 rounded-xl text-white border-white/10" data-testid="select-capacity-tier">
                          <SelectValue placeholder="اختر باقة السعة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-card border-white/10">
                        {capacityTiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id} className="text-white" data-testid={`tier-option-${tier.id}`}>
                            <span className="flex items-center gap-2">
                              {tier.name}
                              <span className="text-muted-foreground text-sm">
                                {tier.isUnlimited ? (
                                  <span className="flex items-center gap-1">
                                    (<Infinity className="w-3 h-3" /> غير محدود)
                                  </span>
                                ) : (
                                  `(${tier.minGuests} - ${tier.maxGuests} ضيف)`
                                )}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={createMutation.isPending || isQuotaExceeded}
                className="flex-1 h-12 gradient-primary text-white font-semibold rounded-xl glow-primary"
                data-testid="button-submit-event"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <Calendar className="w-5 h-5 ml-2" />
                )}
                إنشاء المناسبة
              </Button>
              <Link href="/events">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-8 border-white/20 text-white hover:bg-white/10 rounded-xl"
                >
                  إلغاء
                </Button>
              </Link>
            </div>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
