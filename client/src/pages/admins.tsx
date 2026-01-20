import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserCog, Plus, Search, Loader2, Trash2, Edit, Power, PowerOff, Eye, EyeOff, MoreVertical } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const userFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const editFormSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;
type EditFormData = z.infer<typeof editFormSchema>;

export default function AdminsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const { toast } = useToast();

  const { data: admins = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/admins"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/users", {
        ...data,
        role: "admin",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحساب",
        description: "تم إنشاء حساب المدير بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/admins"] });
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
      const updateData: any = { name: data.name };
      if (data.password && data.password.length >= 6) {
        updateData.password = data.password;
      }
      const res = await apiRequest("PATCH", `/api/users/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات المدير بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/admins"] });
      setIsEditDialogOpen(false);
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

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/toggle-active`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب",
        description: data.isActive ? "تم تفعيل حساب المدير" : "تم تعطيل حساب المدير",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/admins"] });
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
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف حساب المدير بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/admins"] });
      setDeleteConfirmUser(null);
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
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const filteredAdmins = admins.filter((admin) =>
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { key: "name", header: "الاسم" },
    { key: "username", header: "اسم المستخدم" },
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
          {user.isActive ? "نشط" : "غير نشط"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "تاريخ الإنشاء",
      render: (user: User) =>
        user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("ar-SA")
          : "-",
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (user: User) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-actions-${user.id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/10">
            <DropdownMenuItem
              onClick={() => handleEdit(user)}
              className="cursor-pointer"
              data-testid={`button-edit-${user.id}`}
            >
              <Edit className="w-4 h-4 ml-2" />
              تعديل
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toggleMutation.mutate(user.id)}
              className="cursor-pointer"
              data-testid={`button-toggle-${user.id}`}
            >
              {user.isActive ? (
                <>
                  <PowerOff className="w-4 h-4 ml-2" />
                  تعطيل
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 ml-2" />
                  تفعيل
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteConfirmUser(user)}
              className="cursor-pointer text-red-400"
              data-testid={`button-delete-${user.id}`}
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">إدارة المديرين</h1>
          <p className="text-muted-foreground">إضافة وإدارة مديري النظام</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary glow-primary" data-testid="button-add-admin">
              <Plus className="w-5 h-5 ml-2" />
              إضافة مدير
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">إضافة مدير جديد</DialogTitle>
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
                          data-testid="input-admin-name"
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
                          data-testid="input-admin-username"
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
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 h-12 gradient-primary"
                    data-testid="button-submit-admin"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                    ) : (
                      <UserCog className="w-5 h-5 ml-2" />
                    )}
                    إنشاء الحساب
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مدير..."
          className="glass-input pr-12 h-12 rounded-xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-admins"
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredAdmins}
        isLoading={isLoading}
        emptyMessage="لا يوجد مديرون"
      />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">تعديل المدير</DialogTitle>
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
                        placeholder="أدخل الاسم الكامل"
                        className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-edit-name"
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
                        placeholder="اتركها فارغة للإبقاء على كلمة المرور الحالية"
                        className="glass-input h-12 rounded-xl text-white placeholder:text-muted-foreground"
                        data-testid="input-edit-password"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 h-12 gradient-primary"
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <Edit className="w-5 h-5 ml-2" />
                  )}
                  حفظ التغييرات
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <AlertDialogContent className="glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              هل أنت متأكد من حذف المدير "{deleteConfirmUser?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="glass-input" data-testid="button-cancel-delete">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmUser && deleteMutation.mutate(deleteConfirmUser.id)}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
