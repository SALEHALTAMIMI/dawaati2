import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Search, CheckCircle, XCircle, AlertTriangle, Users, Clock, Wifi, WifiOff, Loader2, Camera, CameraOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Guest, Event } from "@shared/schema";
import { Html5Qrcode } from "html5-qrcode";

type CheckInResult = {
  status: "success" | "duplicate" | "invalid";
  guest?: Guest;
  message: string;
  checkedInAt?: string;
  checkedInBy?: string;
};

export function OrganizerDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localGuests, setLocalGuests] = useState<Guest[]>([]);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/organizer/events"],
  });

  const { data: guests = [], isLoading: isLoadingGuests } = useQuery<Guest[]>({
    queryKey: ["/api/events", selectedEvent, "guests"],
    enabled: !!selectedEvent,
  });

  useEffect(() => {
    if (guests.length > 0) {
      setLocalGuests(guests);
      localStorage.setItem(`guests_${selectedEvent}`, JSON.stringify(guests));
    }
  }, [guests, selectedEvent]);

  useEffect(() => {
    if (selectedEvent) {
      const cached = localStorage.getItem(`guests_${selectedEvent}`);
      if (cached) {
        setLocalGuests(JSON.parse(cached));
      }
    }
  }, [selectedEvent]);

  const checkInMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const res = await apiRequest("POST", `/api/guests/${guestId}/check-in`);
      return res.json();
    },
    onSuccess: (data: CheckInResult) => {
      setCheckInResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEvent, "guests"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الحضور",
        variant: "destructive",
      });
    },
  });

  const checkInByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", `/api/check-in/code`, { code, eventId: selectedEvent });
      return res.json();
    },
    onSuccess: (data: CheckInResult) => {
      setCheckInResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEvent, "guests"] });
    },
    onError: () => {
      setCheckInResult({
        status: "invalid",
        message: "الكود غير صالح أو غير موجود",
      });
    },
  });

  const startScanner = async () => {
    try {
      setScannerError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          checkInByCodeMutation.mutate(decodedText);
          html5QrCode.pause();
          setTimeout(() => {
            if (scannerRef.current) {
              try {
                scannerRef.current.resume();
              } catch (e) {
                console.log("Scanner resume error:", e);
              }
            }
          }, 3000);
        },
        () => {}
      );
      setIsScannerActive(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setScannerError("لا يمكن الوصول للكاميرا. تأكد من منح الإذن للكاميرا.");
      setIsScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.log("Stop scanner error:", e);
      }
    }
    setIsScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedEvent && scannerRef.current) {
      stopScanner();
    }
  }, [selectedEvent]);

  const filteredGuests = localGuests.filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.phone?.includes(searchQuery) ||
      guest.qrCode?.includes(searchQuery.toUpperCase())
  );

  const handleCheckIn = (guest: Guest) => {
    if (guest.isCheckedIn) {
      setCheckInResult({
        status: "duplicate",
        guest,
        message: "تم استخدام هذه الدعوة مسبقاً!",
        checkedInAt: guest.checkedInAt?.toString(),
      });
      return;
    }
    checkInMutation.mutate(guest.id);
  };

  const categoryLabels: Record<string, string> = {
    vip: "VIP",
    regular: "عادي",
    media: "إعلام",
    sponsor: "راعي",
  };

  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
          <span className="text-muted-foreground text-sm">
            {isOnline ? 'متصل بالإنترنت' : 'غير متصل - الوضع المحلي'}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">اختر المناسبة</h1>
        
        {events.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">لم يتم تعيينك لأي مناسبة حالياً</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedEvent(event.id)}
                className="glass-card rounded-2xl p-6 cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                    <QrCode className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{event.name}</h3>
                    <p className="text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentEvent = events.find((e) => e.id === selectedEvent);
  const checkedInCount = localGuests.filter((g) => g.isCheckedIn).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-500" />
          ) : (
            <WifiOff className="w-5 h-5 text-orange-500" />
          )}
          <span className="text-sm text-muted-foreground">
            {isOnline ? 'متصل' : 'غير متصل'}
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            stopScanner();
            setSelectedEvent(null);
          }}
          className="text-muted-foreground"
        >
          تغيير المناسبة
        </Button>
      </div>

      {/* Event Info */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">{currentEvent?.name}</h2>
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{checkedInCount} / {localGuests.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{currentEvent?.startTime} - {currentEvent?.endTime}</span>
          </div>
        </div>
      </div>

      {/* QR Scanner Section */}
      <div className="glass-card rounded-2xl p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            مسح الكيو آر
          </h3>
          <Button
            onClick={isScannerActive ? stopScanner : startScanner}
            variant={isScannerActive ? "destructive" : "default"}
            className={isScannerActive ? "" : "gradient-primary"}
            data-testid="button-toggle-scanner"
          >
            {isScannerActive ? (
              <>
                <CameraOff className="w-4 h-4 ml-2" />
                إيقاف الكاميرا
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 ml-2" />
                تشغيل الكاميرا
              </>
            )}
          </Button>
        </div>

        {scannerError && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded-xl mb-4 text-center">
            {scannerError}
          </div>
        )}

        <div 
          id="qr-reader" 
          className={`w-full rounded-xl overflow-hidden ${isScannerActive ? 'min-h-[300px]' : 'h-0'}`}
          style={{ transition: 'height 0.3s ease' }}
        />

        {!isScannerActive && !scannerError && (
          <div className="bg-white/5 rounded-xl p-8 text-center">
            <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">اضغط على تشغيل الكاميرا لمسح كود الضيف</p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الجوال أو الكود..."
          className="glass-input h-14 pr-12 text-lg rounded-2xl text-white placeholder:text-muted-foreground"
          data-testid="input-search-guest"
        />
      </div>

      {/* Check-in Result Modal */}
      <AnimatePresence>
        {checkInResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setCheckInResult(null)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className={`w-full max-w-md rounded-3xl p-8 ${
                checkInResult.status === "success"
                  ? "status-success"
                  : checkInResult.status === "duplicate"
                  ? "status-error"
                  : "status-warning"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center text-white">
                {checkInResult.status === "success" && (
                  <CheckCircle className="w-20 h-20 mx-auto mb-4" />
                )}
                {checkInResult.status === "duplicate" && (
                  <XCircle className="w-20 h-20 mx-auto mb-4" />
                )}
                {checkInResult.status === "invalid" && (
                  <AlertTriangle className="w-20 h-20 mx-auto mb-4" />
                )}

                <h2 className="text-2xl font-bold mb-4">
                  {checkInResult.status === "success" && "تم التسجيل بنجاح"}
                  {checkInResult.status === "duplicate" && "تنبيه!"}
                  {checkInResult.status === "invalid" && "غير صالح"}
                </h2>

                {checkInResult.guest && (
                  <div className="space-y-3 text-right bg-white/20 rounded-2xl p-6 mb-6">
                    <div className="flex justify-between">
                      <span className="opacity-80">الاسم:</span>
                      <span className="font-bold">{checkInResult.guest.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">الفئة:</span>
                      <Badge variant="secondary" className="bg-white/30 text-white border-none">
                        {categoryLabels[checkInResult.guest.category || "regular"]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">المرافقين:</span>
                      <span className="font-bold">{checkInResult.guest.companions}</span>
                    </div>
                    {checkInResult.guest.notes && (
                      <div className="pt-3 border-t border-white/20">
                        <span className="opacity-80 block mb-1">ملاحظات:</span>
                        <span>{checkInResult.guest.notes}</span>
                      </div>
                    )}
                  </div>
                )}

                <p className="mb-6 opacity-90">{checkInResult.message}</p>

                {checkInResult.status === "duplicate" && checkInResult.checkedInAt && (
                  <p className="text-sm opacity-70 mb-4">
                    دخل الساعة {new Date(checkInResult.checkedInAt).toLocaleTimeString("ar-SA")}
                  </p>
                )}

                <Button
                  onClick={() => setCheckInResult(null)}
                  className="w-full h-14 text-lg bg-white/20 hover:bg-white/30 text-white border-none"
                  data-testid="button-close-result"
                >
                  إغلاق
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guest List */}
      {isLoadingGuests ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGuests.map((guest) => (
            <motion.div
              key={guest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card rounded-2xl p-5 ${
                guest.isCheckedIn ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      guest.isCheckedIn
                        ? "bg-green-500/20"
                        : "gradient-primary"
                    }`}
                  >
                    {guest.isCheckedIn ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Users className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{guest.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          guest.category === "vip"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {categoryLabels[guest.category || "regular"]}
                      </Badge>
                      {(guest.companions ?? 0) > 0 && (
                        <span className="text-muted-foreground text-sm">
                          +{guest.companions} مرافق
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs font-mono">
                        {guest.qrCode}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleCheckIn(guest)}
                  disabled={checkInMutation.isPending}
                  className={`${
                    guest.isCheckedIn
                      ? "bg-gray-500/20 text-gray-400"
                      : "gradient-primary text-white"
                  }`}
                  data-testid={`button-checkin-${guest.id}`}
                >
                  {checkInMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : guest.isCheckedIn ? (
                    "تم الدخول"
                  ) : (
                    "تسجيل"
                  )}
                </Button>
              </div>
            </motion.div>
          ))}

          {filteredGuests.length === 0 && (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد نتائج للبحث</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Calendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
