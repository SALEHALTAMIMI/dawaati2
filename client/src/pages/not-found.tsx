import { motion } from "framer-motion";
import { Link } from "wouter";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative text-center"
      >
        <motion.h1
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-9xl font-bold text-gradient mb-4"
        >
          404
        </motion.h1>
        <h2 className="text-2xl font-bold text-white mb-4">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <Link href="/">
          <Button className="gradient-primary glow-primary" data-testid="button-go-home">
            <Home className="w-5 h-5 ml-2" />
            العودة للرئيسية
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
