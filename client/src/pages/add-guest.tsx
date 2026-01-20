import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

const guestFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  category: z.enum(["vip", "regular", "media", "sponsor"]),
  companions: z.number().min(0).default(0),
  notes: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

export default function AddGuestPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      category: "regular",
      companions: 0,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GuestFormData) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/guests`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إضافة الضيف",
        description: "تم إضافة الضيف بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      navigate(`/events/${eventId}`);
    },
    onError: () => {
      toast({
        title: "فشل الإضافة",
        description: "حدث خطأ أثناء إضافة الضيف",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
          <h1 className="text-3xl font-bold text-white mb-2">إضافة ضيف</h1>
          <p className="text-muted-foreground">{event?.name || "جاري التحميل..."}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">اسم الضيف *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="أدخل اسم الضيف"
                      className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                      data-testid="input-guest-name"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">رقم الجوال</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="05XXXXXXXX"
                      className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                      data-testid="input-guest-phone"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">الفئة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className="glass-input h-12 rounded-xl text-white"
                        data-testid="select-guest-category"
                      >
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass border-white/10">
                      <SelectItem value="regular">عادي</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="media">إعلام</SelectItem>
                      <SelectItem value="sponsor">راعي</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">عدد المرافقين</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className="glass-input h-12 rounded-xl text-white"
                      data-testid="input-guest-companions"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="أي ملاحظات إضافية..."
                      className="glass-input rounded-xl text-white placeholder:text-muted-foreground resize-none"
                      rows={3}
                      data-testid="input-guest-notes"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-12 gradient-primary"
                data-testid="button-submit-guest"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <UserPlus className="w-5 h-5 ml-2" />
                )}
                إضافة الضيف
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/events/${eventId}`)}
                className="h-12 border-white/20 text-white hover:bg-white/10"
                data-testid="button-cancel"
              >
                إلغاء
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
