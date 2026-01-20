import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Save, Loader2, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Guest } from "@shared/schema";

const guestFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  category: z.enum(["vip", "regular", "media", "sponsor"]),
  companions: z.number().min(0).default(0),
  notes: z.string().optional(),
});

type GuestFormData = z.infer<typeof guestFormSchema>;

export default function EditGuestPage() {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: guest, isLoading } = useQuery<Guest>({
    queryKey: ["/api/guests", guestId],
    enabled: !!guestId,
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

  useEffect(() => {
    if (guest) {
      form.reset({
        name: guest.name || "",
        phone: guest.phone || "",
        category: guest.category || "regular",
        companions: guest.companions || 0,
        notes: guest.notes || "",
      });
    }
  }, [guest, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: GuestFormData) => {
      const res = await apiRequest("PATCH", `/api/guests/${guestId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات الضيف بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      navigate(`/events/${eventId}`);
    },
    onError: () => {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث بيانات الضيف",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/guests/${guestId}`);
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف الضيف بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      navigate(`/events/${eventId}`);
    },
    onError: () => {
      toast({
        title: "فشل الحذف",
        description: "حدث خطأ أثناء حذف الضيف",
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
      <div className="flex items-center justify-between">
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
          <h1 className="text-3xl font-bold text-white">تعديل الضيف</h1>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              data-testid="button-delete-guest"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">حذف الضيف</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                هل أنت متأكد من حذف هذا الضيف؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "حذف"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                  <FormLabel className="text-white">اسم الضيف *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="glass-input h-12 rounded-xl text-white"
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
                      className="glass-input h-12 rounded-xl text-white"
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                      className="glass-input rounded-xl text-white resize-none"
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
                disabled={updateMutation.isPending}
                className="flex-1 h-12 gradient-primary"
                data-testid="button-submit-guest"
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
