import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RealtimeOrderService } from '../../firebase/services/realtime-order.service';
import { RealtimeProductService } from '../../firebase/services/realtime-product.service';
import { RealtimeUserService } from '../../firebase/services/realtime-user.service';
import { Order, Product, User } from '../../firebase/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-red-100 text-red-700',
];

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function toDate(ts: any): Date {
  try { return ts?.toDate ? ts.toDate() : new Date(ts); } catch { return new Date(); }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// Build date range based on time range selection
function getDateRange(range: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - 6);
  else if (range === 'month') start.setDate(1);
  else if (range === 'quarter') start.setMonth(start.getMonth() - 2, 1);
  else if (range === 'year') start.setMonth(0, 1);
  return { start, end };
}

// Build per-day sales chart data
function buildSalesChart(orders: Order[], range: string) {
  const { start, end } = getDateRange(range);
  const days: { date: Date; label: string }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({ date: new Date(cur), label: formatDate(cur) });
    cur.setDate(cur.getDate() + 1);
  }
  // Limit to max 30 data points for readability
  const step = Math.max(1, Math.ceil(days.length / 30));
  const sampled = days.filter((_, i) => i % step === 0);

  return sampled.map(({ date, label }) => {
    const dayOrders = orders.filter((o) => {
      const od = toDate(o.createdAt);
      return (
        od.getDate() === date.getDate() &&
        od.getMonth() === date.getMonth() &&
        od.getFullYear() === date.getFullYear()
      );
    });
    return {
      date: label,
      revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
      transactions: dayOrders.length,
    };
  });
}

// Build peak-hours chart: count transactions per hour
function buildPeakHours(orders: Order[]) {
  const HOURS = [
    { id: 'h7', hour: '7AM', key: 7 },
    { id: 'h8', hour: '8AM', key: 8 },
    { id: 'h9', hour: '9AM', key: 9 },
    { id: 'h10', hour: '10AM', key: 10 },
    { id: 'h11', hour: '11AM', key: 11 },
    { id: 'h12', hour: '12PM', key: 12 },
    { id: 'h13', hour: '1PM', key: 13 },
    { id: 'h14', hour: '2PM', key: 14 },
    { id: 'h15', hour: '3PM', key: 15 },
    { id: 'h16', hour: '4PM', key: 16 },
    { id: 'h17', hour: '5PM', key: 17 },
    { id: 'h18', hour: '6PM', key: 18 },
  ];
  return HOURS.map((h) => ({
    ...h,
    transactions: orders.filter((o) => toDate(o.createdAt).getHours() === h.key).length,
  }));
}

// Aggregate top-selling products from order items
function buildTopItems(orders: Order[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      map[item.productName] = (map[item.productName] || 0) + item.quantity;
    });
  });
  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = sorted[0]?.[1] || 1;
  return sorted.map(([name, units], i) => ({
    name,
    units,
    percentage: Math.round((units / max) * 100),
    rank: i + 1,
  }));
}

const CATEGORY_MAP: Record<string, string> = {
  'Snacks & Quick Food': 'Snacks',
  'Personal & Office Essentials': 'Personal Essentials',
};

// Build category breakdown from order items
function buildCategoryBreakdown(orders: Order[], products: Product[]) {
  const productCategoryMap: Record<string, string> = {};
  products.forEach((p) => {
    const mappedCat = CATEGORY_MAP[p.category] || p.category;
    productCategoryMap[p.name] = mappedCat;
  });

  const categoryTotals: Record<string, number> = {};
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      const cat = productCategoryMap[item.productName] || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + item.subtotal;
    });
  });

  const COLORS = ['#15803d', '#2563eb', '#f59e0b', '#e11d48', '#7c3aed', '#0891b2'];
  const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({
      id: `cat-${i}`,
      name,
      value: Math.round((value / total) * 100),
      color: COLORS[i % COLORS.length],
    }));
}

// Build most-active users leaderboard
function buildActiveUsers(orders: Order[]) {
  const map: Record<string, { name: string; userId: string; count: number }> = {};
  orders.forEach((o) => {
    if (!map[o.userId]) map[o.userId] = { name: o.userName, userId: o.userId, count: 0 };
    map[o.userId].count++;
  });
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold mb-1">{payload[0].payload.date || payload[0].payload.hour}</p>
      {payload.map((p: any, index: number) => (
        <p key={`${p.dataKey}-${index}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.stroke || p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold">
            {p.dataKey === 'revenue' ? `₱${p.value.toLocaleString()}` : p.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse rounded-lg', className)} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SystemAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month');

  // Firestore state
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<User | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Subscribe to a large window of orders (500) to compute analytics
    const unsubOrders = RealtimeOrderService.subscribeToOrders(
      (data) => { setAllOrders(data); setLoading(false); },
      { limitCount: 500 }
    );
    const unsubProducts = RealtimeProductService.subscribeToProducts((data) => setProducts(data));
    const unsubUsers = RealtimeUserService.subscribeToUsers((data) => setUsers(data));

    return () => { unsubOrders(); unsubProducts(); unsubUsers(); };
  }, []);

  // ── Filtered orders for the selected time range ────────────────────────────
  const rangeOrders = useMemo(() => {
    const { start, end } = getDateRange(timeRange);
    return allOrders.filter((o) => {
      const d = toDate(o.createdAt);
      return d >= start && d <= end;
    });
  }, [allOrders, timeRange]);

  // ── KPI Stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalSales = rangeOrders.reduce((s, o) => s + o.totalAmount, 0);
    const txCount = rangeOrders.length;
    const avgTicket = txCount > 0 ? totalSales / txCount : 0;

    const paidOrders = rangeOrders.filter((o) => o.paymentStatus === 'paid');
    const debtOrders = rangeOrders.filter((o) => o.paymentMethod === 'debt');
    const honestyRate = txCount > 0 ? Math.round((paidOrders.length / txCount) * 100) : 0;

    const { start, end } = getDateRange(timeRange);
    const daySpan = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const avgPerDay = Math.round(txCount / daySpan);

    const outstandingDebt = users.filter(u => (u.currentDebt ?? 0) > 0)
      .reduce((s, u) => s + (u.currentDebt ?? 0), 0);

    // Recovered = all debt that was paid (payment transactions)
    const recoveredDebt = debtOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);

    // Payment method breakdown (paid orders only)
    const gcashPaid = paidOrders.filter((o) => o.paymentMethod === 'gcash').reduce((s, o) => s + o.totalAmount, 0);
    const cashPaid = paidOrders.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = gcashPaid + cashPaid;
    const gcashPct = totalPaid > 0 ? Math.round((gcashPaid / totalPaid) * 100) : 0;

    return {
      totalSales, txCount, avgTicket, honestyRate,
      avgPerDay, outstandingDebt, recoveredDebt,
      gcashPct, cashPct: 100 - gcashPct,
      netCashFlow: totalSales - outstandingDebt,
    };
  }, [rangeOrders, users]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const salesChart = useMemo(() => buildSalesChart(rangeOrders, timeRange), [rangeOrders, timeRange]);
  const peakHours = useMemo(() => buildPeakHours(rangeOrders), [rangeOrders]);
  const topItems = useMemo(() => buildTopItems(rangeOrders), [rangeOrders]);
  const categoryData = useMemo(() => buildCategoryBreakdown(rangeOrders, products), [rangeOrders, products]);
  const activeUsersList = useMemo(() => buildActiveUsers(rangeOrders), [rangeOrders]);

  // ── Inventory (stock health) ────────────────────────────────────────────────
  const lowStockProducts = useMemo(() => products.filter((p) => p.status === 'low_stock'), [products]);
  const outOfStockProducts = useMemo(() => products.filter((p) => p.status === 'out_of_stock'), [products]);

  // Inventory turnover rows: products sorted by stock (lowest first)
  const inventoryRows = useMemo(() => {
    return [...products]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        qty: p.stock,
        category: CATEGORY_MAP[p.category] || p.category,
        status: p.status === 'out_of_stock' ? 'Out of Stock' : p.status === 'low_stock' ? 'Low Stock' : 'In Stock',
        statusColor: p.status === 'out_of_stock' ? 'red' : p.status === 'low_stock' ? 'amber' : 'green',
      }));
  }, [products]);

  // ── High-risk debtors (faculty with high currentDebt) ─────────────────────
  const debtors = useMemo(() => {
    return users
      .filter((u) => (u.currentDebt ?? 0) > 0)
      .sort((a, b) => (b.currentDebt ?? 0) - (a.currentDebt ?? 0))
      .slice(0, 6)
      .map((u) => ({
        user: u,
        statusColor: (u.currentDebt ?? 0) > 500 ? 'red' : 'amber',
      }));
  }, [users]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">System Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Comprehensive insights and performance metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5 text-sm"
            onClick={() => console.log('Exporting analytics report for:', timeRange)}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Total Sales</p>
            {loading ? <Skeleton className="h-8 w-28 mt-1" /> : (
              <p className="text-2xl font-bold mt-1 tabular-nums">
                ₱{stats.totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1 capitalize">{timeRange === 'month' ? 'This month' : timeRange === 'week' ? 'This week' : timeRange === 'quarter' ? 'This quarter' : 'This year'}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Transactions</p>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-bold mt-1 tabular-nums">{stats.txCount.toLocaleString()}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Avg. {stats.avgPerDay} per day</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Avg. Ticket</p>
            {loading ? <Skeleton className="h-8 w-20 mt-1" /> : (
              <p className="text-2xl font-bold mt-1 tabular-nums">
                ₱{stats.avgTicket.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Honesty Rate</p>
            {loading ? <Skeleton className="h-8 w-16 mt-1" /> : (
              <p className="text-2xl font-bold mt-1 tabular-nums">{stats.honestyRate}%</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Paid on time</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Sales Performance</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Daily revenue and transaction volume</p>
              </div>
              {!loading && (
                <p className="text-xs text-muted-foreground">
                  Avg: ₱{salesChart.length > 0
                    ? Math.round(salesChart.reduce((s, d) => s + d.revenue, 0) / salesChart.length).toLocaleString()
                    : 0}/day
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6 px-2 pb-4">
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : salesChart.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                <span className="material-symbols-outlined text-3xl mb-2 block text-center opacity-30">bar_chart</span>
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesChart} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" className="stroke-primary" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="transactions" name="Transactions" stroke="#64748b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle className="text-base">Top Selling Items</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">By units sold</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : topItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <span className="material-symbols-outlined block text-3xl mb-2 opacity-30">inventory_2</span>
                No sales data yet
              </div>
            ) : (
              topItems.map((item) => (
                <div key={item.name} className="group">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                      item.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      item.rank === 2 ? 'bg-slate-100 text-slate-600' :
                      item.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {item.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight">{item.name}</p>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{item.units} units</span>
                  </div>
                  <div className="flex items-center gap-2 pl-9">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Health */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">inventory</span>
              Stock Health
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-800 text-[11px] font-bold uppercase mb-1">Low Stock</p>
                {loading ? <Skeleton className="h-8 w-8" /> : (
                  <p className="text-3xl font-bold text-amber-900">{lowStockProducts.length}</p>
                )}
                <p className="text-[10px] text-amber-700 mt-1">Restock needed</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-800 text-[11px] font-bold uppercase mb-1">Out of Stock</p>
                {loading ? <Skeleton className="h-8 w-8" /> : (
                  <p className="text-3xl font-bold text-red-900">{outOfStockProducts.length}</p>
                )}
                <p className="text-[10px] text-red-700 mt-1">Critical priority</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => setShowInventoryModal(true)}
            >
              View Full Inventory
            </Button>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-[180px] w-full mb-4" />
            ) : categoryData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-2 mt-4">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                    <span className="font-medium truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <span className="font-bold">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Turnover */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Stock Levels</CardTitle>
              <Badge variant="outline" className="text-[10px]">Live</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : inventoryRows.slice(0, 4).map((item) => (
                <div key={item.id} className="p-3 bg-muted/40 rounded-lg border border-border hover:bg-muted/60 transition-colors">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-sm leading-tight flex-1 truncate">{item.name}</p>
                    <Badge className={cn(
                      'text-[10px] font-bold shrink-0 ml-2',
                      item.statusColor === 'green' && 'bg-green-100 text-green-700 border-green-200',
                      item.statusColor === 'amber' && 'bg-amber-100 text-amber-700 border-amber-200',
                      item.statusColor === 'red' && 'bg-red-100 text-red-700 border-red-200'
                    )}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Qty: {item.qty} pcs</span>
                    <span className="text-[11px] text-muted-foreground italic">{item.category}</span>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      {/* Debt Analytics & User Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Honesty Metrics */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Honesty System</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="100, 100"
                  strokeWidth="3"
                />
                <path
                  className="text-primary"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${stats.honestyRate}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{stats.honestyRate}%</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Paid Ratio</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>Recovered</span>
                </div>
                <span className="font-bold">₱{stats.recoveredDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  <span>Outstanding</span>
                </div>
                <span className="font-bold text-destructive">₱{stats.outstandingDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border text-center">
              <p className="text-[11px] text-muted-foreground uppercase font-bold mb-1">Payment Methods</p>
              <p className="text-sm font-bold">GCash {stats.gcashPct}% · Cash {stats.cashPct}%</p>
            </div>
          </CardContent>
        </Card>

        {/* High Risk Debtors */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                High-Risk Debtors
              </CardTitle>
              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                {debtors.length} account{debtors.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              : debtors.length === 0
              ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <span className="material-symbols-outlined block text-3xl mb-2 opacity-30">check_circle</span>
                  No outstanding debts
                </div>
              )
              : debtors.map(({ user, statusColor }) => (
                <div key={user.uid} className="p-3 bg-muted/40 rounded-lg border border-border hover:bg-muted/60 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0', avatarColor(user.uid))}>
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{user.rfidUid || user.uid.slice(0, 10)} {user.department ? `• ${user.department}` : ''}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      'text-[10px] font-bold shrink-0 ml-2',
                      statusColor === 'red' && 'bg-red-100 text-red-700 border-red-200',
                      statusColor === 'amber' && 'bg-amber-100 text-amber-700 border-amber-200'
                    )}>
                      {statusColor === 'red' ? 'High Risk' : 'Moderate'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm font-bold tabular-nums', statusColor === 'red' ? 'text-destructive' : 'text-amber-600')}>
                      ₱{(user.currentDebt ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => { setSelectedDebtor(user); setShowReminderModal(true); }}
                    >
                      Send Reminder
                    </Button>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours & Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle className="text-base">Peak Buying Hours</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Transaction volume by hour</p>
            </div>
          </CardHeader>
          <CardContent className="pt-6 px-2 pb-4">
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={peakHours} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="transactions" name="Transactions" className="fill-primary" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Most Active Users */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Most Active Users</CardTitle>
              <Button
                variant="link"
                className="text-primary font-semibold p-0 h-auto text-xs"
                onClick={() => setShowActiveUsersModal(true)}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              : activeUsersList.length === 0
              ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <span className="material-symbols-outlined block text-3xl mb-2 opacity-30">person_off</span>
                  No activity yet
                </div>
              )
              : activeUsersList.slice(0, 4).map((u) => (
                <div key={u.userId} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border hover:bg-muted/60 transition-colors cursor-pointer">
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0', avatarColor(u.userId))}>
                    {getInitials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight truncate">{u.name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.count} purchase{u.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="shadow-sm bg-primary/5 border-primary/20">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold text-primary">Financial Snapshot</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Reconciled live data • {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-wrap gap-8 md:gap-12">
              <div className="text-center md:text-left">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
                {loading ? <Skeleton className="h-9 w-28" /> : (
                  <p className="text-3xl font-bold">₱{stats.totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div className="text-center md:text-left">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Receivables</p>
                {loading ? <Skeleton className="h-9 w-24" /> : (
                  <p className="text-3xl font-bold text-destructive">₱{stats.outstandingDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
              <div className="h-12 w-px bg-border hidden md:block self-center" />
              <div className="text-center md:text-left">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Net Cash Flow</p>
                {loading ? <Skeleton className="h-9 w-28" /> : (
                  <p className="text-3xl font-bold text-primary">₱{stats.netCashFlow.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── View Full Inventory Modal ── */}
      {showInventoryModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowInventoryModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Complete Inventory</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{products.length} products · {lowStockProducts.length} low stock · {outOfStockProducts.length} out of stock</p>
                </div>
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-3">
                  {[...products]
                    .sort((a, b) => a.stock - b.stock)
                    .map((p) => {
                      const statusColor = p.status === 'out_of_stock' ? 'red' : p.status === 'low_stock' ? 'amber' : 'green';
                      const statusLabel = p.status === 'out_of_stock' ? 'Out of Stock' : p.status === 'low_stock' ? 'Low Stock' : 'In Stock';
                      return (
                        <div key={p.id} className="p-4 bg-muted/40 rounded-xl border border-border hover:bg-muted/60 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold leading-tight">{p.name}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs text-muted-foreground">Stock: <span className="font-mono font-bold text-foreground">{p.stock}</span> pcs</span>
                                <span className="text-xs text-muted-foreground">SKU: <span className="font-mono">{p.sku}</span></span>
                                <span className="text-xs text-muted-foreground">₱{p.price.toFixed(2)}</span>
                              </div>
                            </div>
                            <Badge className={cn(
                              'text-xs font-bold shrink-0 ml-2',
                              statusColor === 'green' && 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200',
                              statusColor === 'amber' && 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200',
                              statusColor === 'red' && 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200'
                            )}>
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                statusColor === 'green' ? 'bg-green-500' :
                                statusColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                              )}
                              style={{ width: `${Math.min((p.stock / Math.max(p.reorderLevel * 3, 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowInventoryModal(false)}>Close</Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── View All Active Users Modal ── */}
      {showActiveUsersModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowActiveUsersModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Most Active Users</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Top customers by purchase frequency</p>
                </div>
                <button
                  onClick={() => setShowActiveUsersModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-3">
                  {activeUsersList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">No activity data</div>
                  ) : (
                    activeUsersList.map((u, i) => (
                      <div key={u.userId} className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl border border-border hover:bg-muted/60 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0', avatarColor(u.userId))}>
                          {getInitials(u.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold leading-tight truncate">{u.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{u.count}</p>
                          <p className="text-xs text-muted-foreground">purchases</p>
                        </div>
                        <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20">
                <Button variant="outline" className="w-full" onClick={() => setShowActiveUsersModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Send Reminder Modal ── */}
      {showReminderModal && selectedDebtor && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowReminderModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Send Payment Reminder</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedDebtor.name}</p>
                </div>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className={cn(
                  'rounded-xl p-4 border',
                  (selectedDebtor.currentDebt ?? 0) > 500
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn(
                      'material-symbols-outlined',
                      (selectedDebtor.currentDebt ?? 0) > 500 ? 'text-red-600' : 'text-amber-600'
                    )}>warning</span>
                    <div>
                      <p className="text-sm font-semibold">{selectedDebtor.department || 'Faculty'}</p>
                      <p className="text-xs text-muted-foreground">{selectedDebtor.rfidUid || selectedDebtor.uid.slice(0, 12)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs text-muted-foreground">Outstanding Amount:</p>
                    <p className={cn(
                      'text-2xl font-bold',
                      (selectedDebtor.currentDebt ?? 0) > 500 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                    )}>
                      ₱{(selectedDebtor.currentDebt ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Custom Message (Optional)</label>
                  <textarea
                    placeholder="Add a personalized message to the reminder email..."
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    rows={4}
                  />
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0">info</span>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Email Notification</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      An automated reminder with the outstanding balance and payment instructions will be sent to {selectedDebtor.email}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowReminderModal(false); setReminderMessage(''); }}
                >
                  Cancel
                </Button>
                <Button
                  className={cn(
                    'flex-1 gap-2 text-white',
                    (selectedDebtor.currentDebt ?? 0) > 500 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                  )}
                  onClick={() => {
                    console.log('Sending reminder to', selectedDebtor.name, 'at', selectedDebtor.email, '| Message:', reminderMessage);
                    setShowReminderModal(false);
                    setReminderMessage('');
                    setSelectedDebtor(null);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Send Reminder
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="pt-4 text-center text-muted-foreground text-xs border-t border-border">
        © 2024 Notre Dame of Kidapawan College — Honesty Store System
      </footer>
    </div>
  );
}
