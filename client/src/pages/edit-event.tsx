import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Save, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event } from "@shared/schema";

const eventFormSchema = z.object({
  name: z.string().min(1, "اسم المناسبة مطلوب"),
  description: z.string().optional(),
  date: z.string().min(1, "التاريخ مطلوب"),
  location: z.string().min(1, "الموقع مطلوب"),
  startTime: z.string().min(1, "وقت البداية مطلوب"),
  endTime: z.string().min(1, "وقت النهاية مطلوب"),
});

type EventFormData = z.infer<typeof eventFormSchema>;

export default function EditEventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
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
    },
  });

  useEffect(() => {
    if (event) {
      const dateStr = event.date ? new Date(event.date).toISOString().split("T")[0] : "";
      form.reset({
        name: event.name || "",
        description: event.description || "",
        date: dateStr,
        location: event.location || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
      });
    }
  }, [event, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const res = await apiRequest("PATCH", `/api/events/${eventId}`, {
        ...data,
        date: new Date(data.date).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث المناسبة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      navigate(`/events/${eventId}`);
    },
    onError: () => {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث المناسبة",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-white">تعديل المناسبة</h1>
      </div>

      <div className="glass-card rounded-2xl p-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">اسم المناسبة *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="glass-input h-12 rounded-xl text-white"
                      data-testid="input-event-name"
                    />
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
                      className="glass-input rounded-xl text-white resize-none"
                      rows={3}
                      data-testid="input-event-description"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">التاريخ *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
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
                    <FormLabel className="text-white">الموقع *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="glass-input h-12 rounded-xl text-white"
                        data-testid="input-event-location"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">وقت البداية *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="glass-input h-12 rounded-xl text-white"
                        data-testid="input-event-start-time"
                      />
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
                    <FormLabel className="text-white">وقت النهاية *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        className="glass-input h-12 rounded-xl text-white"
                        data-testid="input-event-end-time"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 h-12 gradient-primary"
                data-testid="button-submit-event"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <Save className="w-5 h-5 ml-2" />
                )}
                حفظ التغييرات
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/events/${eventId}`)}
                className="h-12 border-white/20 text-white hover:bg-white/10"
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
