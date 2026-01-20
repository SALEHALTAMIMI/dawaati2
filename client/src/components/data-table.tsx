import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyMessage = "لا توجد بيانات",
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className="text-white/70 font-medium">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i} className="border-white/5">
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-6 w-full bg-white/10" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.key} className="text-white/70 font-medium">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <motion.tr
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRowClick?.(item)}
              className={`border-white/5 text-white ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
            >
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </TableCell>
              ))}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
