import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Plus, Search, Loader2, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const userFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  eventQuota: z.number().min(1, "الحد الأدنى هو 1").max(100, "الحد الأقصى هو 100"),
});

const editFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  eventQuota: z.number().min(1, "الحد الأدنى هو 1").max(100, "الحد الأقصى هو 100"),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;
type EditFormData = z.infer<typeof editFormSchema>;

export default function EventManagersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: eventManagers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/event-managers"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      eventQuota: 5,
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      eventQuota: 5,
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/users", {
        ...data,
        role: "event_manager",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحساب",
        description: "تم إنشاء حساب مدير المناسبات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/event-managers"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "فشل إنشاء الحساب",
        description: "اسم المستخدم قد يكون مستخدماً مسبقاً",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditFormData }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات مدير المناسبات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/event-managers"] });
      setEditingUser(null);
      editForm.reset();
    },
    onError: () => {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/toggle-active`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isActive ? "تم تفعيل الحساب" : "تم تعليق الحساب",
        description: data.isActive ? "الحساب نشط الآن" : "تم تعليق الحساب",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/event-managers"] });
    },
    onError: () => {
      toast({
        title: "فشلت العملية",
        description: "حدث خطأ أثناء تغيير حالة الحساب",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف الحساب بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/event-managers"] });
    },
    onError: () => {
      toast({
        title: "فشل الحذف",
        description: "حدث خطأ أثناء حذف الحساب",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      eventQuota: user.eventQuota || 5,
      password: "",
    });
  };

  const filteredManagers = eventManagers.filter((manager) =>
    manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    manager.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: "name", header: "الاسم" },
    { key: "username", header: "اسم المستخدم" },
    {
      key: "eventQuota",
      header: "الحصة",
      render: (user: User) => (
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          {user.eventQuota} مناسبات
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "الحالة",
      render: (user: User) => (
        <Badge
          variant="secondary"
          className={`${
            user.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {user.isActive ? "نشط" : "معلق"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (user: User) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEdit(user)}
            className="h-8 w-8 text-muted-foreground hover:text-white"
            data-testid={`button-edit-user-${user.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleActiveMutation.mutate(user.id)}
            disabled={toggleActiveMutation.isPending}
            className={`h-8 w-8 ${user.isActive ? "text-yellow-400 hover:text-yellow-300" : "text-green-400 hover:text-green-300"}`}
            data-testid={`button-toggle-user-${user.id}`}
          >
            {user.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-300"
                data-testid={`button-delete-user-${user.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">حذف الحساب</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  هل أنت متأكد من حذف حساب "{user.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                  إلغاء
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(user.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">مديرو المناسبات</h1>
          <p className="text-muted-foreground">إدارة عملاء ومديري المناسبات</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow-primary" data-testid="button-add-manager">
              <Plus className="w-5 h-5 ml-2" />
              إضافة مدير مناسبات
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">إضافة مدير مناسبات جديد</DialogTitle>
            </DialogHeader>
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
                      <FormLabel className="text-white">الاسم الكامل</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="أدخل الاسم الكامل"
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-name"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">اسم المستخدم</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="أدخل اسم المستخدم"
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-username"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">كلمة المرور</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="أدخل كلمة المرور"
                          className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                          data-testid="input-manager-password"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventQuota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">حصة المناسبات</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                          className="glass-input h-12 rounded-xl text-white"
                          data-testid="input-manager-quota"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full h-12 gradient-primary"
                  data-testid="button-submit-manager"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <Users className="w-5 h-5 ml-2" />
                  )}
                  إنشاء الحساب
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="glass border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">تعديل مدير المناسبات</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                editingUser && updateMutation.mutate({ id: editingUser.id, data })
              )}
              className="space-y-6"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">الاسم الكامل</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="glass-input h-12 rounded-xl text-white"
                        data-testid="input-edit-name"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="eventQuota"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">حصة المناسبات</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                        className="glass-input h-12 rounded-xl text-white"
                        data-testid="input-edit-quota"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">كلمة المرور الجديدة (اختياري)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                        className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-edit-password"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full h-12 gradient-primary"
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                ) : (
                  <Pencil className="w-5 h-5 ml-2" />
                )}
                حفظ التغييرات
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مدير مناسبات..."
          className="glass-input pr-12 h-12 rounded-xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-managers"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredManagers}
        isLoading={isLoading}
        emptyMessage="لا يوجد مديري مناسبات"
      />
    </div>
  );
}
