import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from './ui/utils';
import {
  RealtimeAnalyticsService,
  RealtimeOrderService,
  RealtimeProductService,
} from '../../firebase';
import { Order, Product } from '../../firebase';

// ─── Skeleton Components ─────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="shadow-sm xl:col-span-2">
      <CardHeader className="border-b pb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56 mt-1" />
      </CardHeader>
      <CardContent className="pt-6 px-2 pb-4">
        <div className="h-[260px] w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[40px] text-muted-foreground/30 animate-pulse">monitoring</span>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopItemsSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-24 flex-1" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="pl-9">
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56 mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </CardHeader>
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AlertsSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
            <Skeleton className="size-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CategorySkeleton() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, trend, trendUp, accent,
}: {
  icon: string; label: string; value: string; sub?: string;
  trend?: string; trendUp?: boolean; accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-md group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2 rounded-xl transition-transform duration-300 group-hover:scale-110', accent ?? 'bg-primary/10 text-primary')}>
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </div>
          {trend && (
            <span className={cn(
              'text-[11px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full',
              trendUp ? 'text-green-700 bg-green-50 dark:bg-green-500/15 dark:text-green-400' : 'text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400'
            )}>
              <span className="material-symbols-outlined text-[12px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    PAID:    'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/25',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25',
    DEBT:    'bg-red-50  text-red-700  border-red-200  dark:bg-red-500/15  dark:text-red-400  dark:border-red-500/25',
  };
  const dots: Record<string, string> = {
    PAID: 'bg-green-500', PENDING: 'bg-amber-500', DEBT: 'bg-red-500',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border', cfg[status] ?? 'bg-muted text-muted-foreground')}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dots[status])} />
      {status}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 dark:shadow-xl dark:shadow-black/40">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any, index: number) => (
        <p key={`${p.dataKey}-${index}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold">₱{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Empty States ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[24px] text-muted-foreground/50">{icon}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DashboardContent() {
  const navigate = useNavigate();
  const [txFilter, setTxFilter] = useState('all');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);

  // Real-time data state
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Transform Firestore data to UI format
  const transformedTransactions = transactions.map(tx => ({
    user: tx.userName,
    initials: tx.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    rfid: tx.rfidUid ? `#${tx.rfidUid}` : '#N/A',
    items: tx.items.map(item => `${item.productName} x${item.quantity}`).join(', '),
    time: tx.createdAt ? formatTimestamp(tx.createdAt) : 'Unknown',
    amount: `₱${tx.totalAmount.toFixed(2)}`,
    status: tx.paymentStatus.toUpperCase(),
    avatar: getAvatarColor(tx.userName),
  }));

  const filtered = transformedTransactions.filter(t =>
    txFilter === 'all' || t.status.toLowerCase() === txFilter
  );

  // Subscribe to real-time data
  useEffect(() => {
    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    // Subscribe to dashboard summary
    unsubscribers.push(
      RealtimeAnalyticsService.subscribeToDashboardSummary((summary) => {
        setDashboardSummary(summary);
      })
    );

    // Subscribe to today's orders
    unsubscribers.push(
      RealtimeOrderService.subscribeToTodaysOrders((orders) => {
        setTransactions(orders);
      })
    );

    // Subscribe to products
    unsubscribers.push(
      RealtimeProductService.subscribeToProducts((productList) => {
        setProducts(productList);
      })
    );

    // Subscribe to low stock products
    unsubscribers.push(
      RealtimeProductService.subscribeToLowStockProducts((lowStock) => {
        setLowStockProducts(lowStock);
      })
    );

    // Give a small delay for data to arrive before removing loading state
    const timer = setTimeout(() => {
      setLoading(false);
      setDataLoaded(true);
    }, 800);

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  const transformedTopItems = products.slice(0, 5).map((product, index) => ({
    rank: index + 1,
    name: product.name,
    category: product.category,
    units: product.stock,
    stock: product.status === 'in_stock' ? 'IN STOCK' : product.status === 'low_stock' ? 'LOW STOCK' : 'OUT OF STOCK',
    stockOk: product.status === 'in_stock',
    pct: Math.min((product.stock / 30) * 100, 100),
  }));

  const transformedAlerts = [
    ...lowStockProducts.slice(0, 3).map(product => ({
      icon: 'inventory',
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400',
      text: `${product.name} is running low (${product.stock} units left)`,
      time: 'Just now',
    })),
    ...transactions.filter(t => t.paymentStatus === 'pending').slice(0, 2).map(tx => ({
      icon: 'account_balance_wallet',
      color: 'text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400',
      text: `${tx.userName} has pending payment of ₱${tx.totalAmount.toFixed(2)}`,
      time: 'Recently',
    })),
  ];

  // Calculate category breakdown from products
  const categoryBreakdown = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalProducts = Object.values(categoryBreakdown).reduce((sum, count) => sum + count, 0);
  const transformedCategoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value: Math.round((value / totalProducts) * 100),
  }));

  // Calculate hourly sales data from transactions
  const hourlySalesData = transactions.reduce((acc, tx) => {
    if (tx.createdAt) {
      // Handle both Date and Firestore Timestamp
      const date = tx.createdAt instanceof Date ? tx.createdAt : (tx.createdAt?.toDate?.() ?? new Date());
      const hour = date.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;

      if (!acc[hourKey]) {
        acc[hourKey] = { time: hourKey, revenue: 0, debt: 0 };
      }

      if (tx.paymentStatus === 'paid') {
        acc[hourKey].revenue += tx.totalAmount;
      } else if (tx.paymentStatus === 'pending') {
        acc[hourKey].debt += tx.totalAmount;
      }
    }
    return acc;
  }, {} as Record<string, { time: string; revenue: number; debt: number }>);

  const transformedSalesData = Object.values(hourlySalesData).sort((a, b) =>
    parseInt(a.time) - parseInt(b.time)
  );

  // Helper functions
  function formatTimestamp(timestamp: any): string {
    // Handle both Firestore Timestamp and JavaScript Date objects
    const date = timestamp instanceof Date ? timestamp : (timestamp?.toDate?.() ?? new Date());
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) {
      return `Today, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (diffHours < 24) {
      return `Today, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getAvatarColor(name: string): string {
    const colors = [
      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
      'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 shadow-lg dark:shadow-xl dark:shadow-primary/10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full bg-white/50 animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-primary-foreground/70 text-sm font-medium">{greeting}, Admin 👋</p>
            <h2 className="text-2xl font-bold mt-0.5">HonestyStore - Dashboard</h2>
            <p className="text-primary-foreground/60 text-sm mt-1">
              {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="secondary" className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/20 border transition-all hover:scale-105 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              Last 24 Hours
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </Button>
            <Button variant="secondary" className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/20 border transition-all hover:scale-105 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon="payments"              label="Total Sales Today"    value={`₱${dashboardSummary?.todaySales?.toLocaleString() || '0'}`} sub={`${transactions.length} transactions`}   trend="+12%" trendUp accent="bg-primary/10 text-primary dark:bg-primary/20" />
          <StatCard icon="receipt_long"          label="Transactions"         value={dashboardSummary?.todayOrders || '0'}      sub="today"   trend="+5"   trendUp accent="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" />
          <StatCard icon="request_quote"         label="Debt Outstanding"     value={`₱${dashboardSummary?.todayDebt?.toLocaleString() || '0'}`}  sub="pending payments"       trend="-2%"  trendUp={false} accent="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" />
          <StatCard icon="group"                 label="Active Users"    value={dashboardSummary?.totalUsers || '0'}     sub="registered"                   accent="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" />
          <StatCard icon="inventory"             label="Low Stock Alerts"     value={lowStockProducts.length.toString()}       sub="items need restock"               accent="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" />
          <StatCard icon="account_balance_wallet" label="Monthly Revenue"     value={`₱${(dashboardSummary?.monthSales / 1000)?.toFixed(0) || '0'}k`}   sub="this month"  trend="+18%" trendUp accent="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" />
        </div>
      )}

      {/* ── Row 2: Chart + Top Items ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Sales Area Chart */}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <Card className="xl:col-span-2 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Sales Trend — Today</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Hourly revenue vs. outstanding debt</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded-full bg-primary inline-block" /> Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded-full bg-rose-400 inline-block" /> Debt
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 px-2 pb-4">
              {transformedSalesData.length === 0 ? (
                <EmptyState icon="monitoring" title="No sales data yet" description="Transactions will appear here as they come in throughout the day." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={transformedSalesData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} width={42} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" className="stroke-primary fill-primary" strokeWidth={2.5} fillOpacity={0.12} dot={false} activeDot={{ r: 5, strokeWidth: 2, className: 'stroke-card' }} />
                    <Area type="monotone" dataKey="debt" name="Debt" stroke="#f43f5e" strokeWidth={2} fill="#f43f5e" fillOpacity={0.08} dot={false} activeDot={{ r: 4, strokeWidth: 2, className: 'stroke-card' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Stock Items */}
        {loading ? (
          <TopItemsSkeleton />
        ) : (
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Inventory Status</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Current stock levels</p>
                </div>
                <Button variant="link" className="text-primary font-semibold p-0 h-auto text-xs hover:underline" onClick={() => navigate('/products')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {transformedTopItems.length === 0 ? (
                <EmptyState icon="inventory" title="No products" description="Add products to see stock levels here." />
              ) : (
                transformedTopItems.map((item) => (
                  <div key={item.rank} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-transform duration-200 group-hover:scale-110',
                        item.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                        item.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' :
                        item.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {item.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.category}</p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                        item.stockOk
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/25'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25'
                      )}>
                        {item.stock}
                      </span>
                    </div>
                    {/* velocity bar */}
                    <div className="flex items-center gap-2 pl-9">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', item.stockOk ? 'bg-primary' : 'bg-amber-400')}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground w-12 text-right">{item.units} left</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Row 3: Transactions + Alerts ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Recent Transactions */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <Card className="xl:col-span-2 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Live feed from RFID tap events</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={txFilter} onValueChange={setTxFilter}>
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-muted/50 border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 text-xs transition-all hover:scale-105 active:scale-95"
                    onClick={() => navigate('/transactions')}
                  >
                    View Full History
                  </Button>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Time</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((tx, i) => (
                    <tr key={i} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-transform duration-200 group-hover:scale-110', tx.avatar)}>
                            {tx.initials}
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">{tx.user}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">RFID {tx.rfid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs max-w-[180px] truncate">{tx.items}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">{tx.time}</td>
                      <td className="px-5 py-3.5 font-bold text-right font-mono">{tx.amount}</td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={tx.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="relative">
                          <button
                            onClick={() => setOpenActionMenu(openActionMenu === i ? null : i)}
                            className="material-symbols-outlined text-[20px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-muted"
                          >
                            more_vert
                          </button>
                          {openActionMenu === i && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenActionMenu(null)}
                              />
                              <div className="absolute right-0 top-8 z-50 w-44 bg-card border border-border rounded-lg shadow-lg overflow-hidden dark:shadow-xl dark:shadow-black/40">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setOpenActionMenu(null);
                                      // View details action
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenActionMenu(null);
                                      // Print receipt action
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">print</span>
                                    Print Receipt
                                  </button>
                                  {tx.status === 'PENDING' && (
                                    <button
                                      onClick={() => {
                                        setOpenActionMenu(null);
                                        // Mark as paid action
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                      Mark as Paid
                                    </button>
                                  )}
                                  {tx.status === 'DEBT' && (
                                    <button
                                      onClick={() => {
                                        setOpenActionMenu(null);
                                        // Send reminder action
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                                      Send Reminder
                                    </button>
                                  )}
                                  <div className="h-px bg-border my-1" />
                                  <button
                                    onClick={() => {
                                      setOpenActionMenu(null);
                                      // Refund action
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">undo</span>
                                    Refund Transaction
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-[40px] text-muted-foreground/30 mb-2">receipt_long</span>
                          <p className="text-sm font-semibold text-foreground">No transactions found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Transactions will appear here once they come in.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Alerts + Category Breakdown */}
        <div className="space-y-6">
          {/* Live Alerts */}
          {loading ? (
            <AlertsSkeleton />
          ) : (
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Live Alerts</CardTitle>
                  <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{transformedAlerts.length} new</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {transformedAlerts.length === 0 ? (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-[32px] text-muted-foreground/30 mb-2">check_circle</span>
                    <p className="text-sm font-semibold text-foreground">All clear</p>
                    <p className="text-xs text-muted-foreground mt-0.5">No alerts at the moment.</p>
                  </div>
                ) : (
                  transformedAlerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer">
                      <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', alert.color)}>
                        <span className="material-symbols-outlined text-[16px]">{alert.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug">{alert.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          {loading ? (
            <CategorySkeleton />
          ) : (
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">Products by Category</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {transformedCategoryData.length === 0 ? (
                  <div className="text-center py-6">
                    <span className="material-symbols-outlined text-[32px] text-muted-foreground/30 mb-2">category</span>
                    <p className="text-sm font-semibold text-foreground">No categories</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Add products to see category breakdown.</p>
                  </div>
                ) : (
                  transformedCategoryData.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground font-mono">{cat.value}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${cat.value}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
