import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
}

export function StatsCard({ title, value, icon: Icon, description, trend, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card rounded-2xl p-6 hover:bg-white/10 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {description && (
            <p className="text-muted-foreground text-xs mt-2">{description}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}
