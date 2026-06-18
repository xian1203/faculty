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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RealtimeOrderService } from '../../firebase/services/realtime-order.service';
import { RealtimeUserService } from '../../firebase/services/realtime-user.service';
import { DebtService } from '../../firebase/services/debt.service';
import { Order, User } from '../../firebase/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
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

function formatTime(ts: any): string {
  if (!ts) return '—';
  try {
    const date: Date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    const timeStr = date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return isToday
      ? `${timeStr} Today`
      : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ', ' + timeStr;
  } catch {
    return '—';
  }
}

function itemsLabel(order: Order): string {
  return order.items.map((i) => `${i.productName} (${i.quantity})`).join(', ');
}

function capitalizeStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPaymentMethod(method: string): string {
  if (method === 'gcash' || method === 'gcash_qr') return 'GCash';
  if (method === 'paylater') return 'Pay Later';
  if (method === 'cash') return 'Cash';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

// ─── Chart tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold mb-1">{payload[0].payload.day}</p>
      {payload.map((p: any, index: number) => (
        <p key={`${p.dataKey}-${index}`} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold">₱{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Chart data builder ──────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeeklyChart(orders: Order[]) {
  const now = new Date();
  // Build last-7-days array ending today
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return d;
  });

  return days.map((d) => {
    const dayOrders = orders.filter((o) => {
      try {
        const ts: any = o.createdAt;
        const od: Date = ts?.toDate ? ts.toDate() : new Date(ts);
        return (
          od.getDate() === d.getDate() &&
          od.getMonth() === d.getMonth() &&
          od.getFullYear() === d.getFullYear()
        );
      } catch {
        return false;
      }
    });
    const sales = dayOrders.reduce((s, o) => s + o.totalAmount, 0);
    const payments = dayOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);
    const debt = dayOrders
      .filter((o) => o.paymentMethod === 'debt')
      .reduce((s, o) => s + o.totalAmount, 0);
    return { id: d.toISOString(), day: DAY_LABELS[d.getDay()], sales, payments, debt };
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PaymentsPage() {
  // ── Firestore state ─────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [debtUsers, setDebtUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showAllDebtsModal, setShowAllDebtsModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<User | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paymentMethodForDebt, setPaymentMethodForDebt] = useState('cash');
  const ITEMS_PER_PAGE = 6;

  // ── Subscriptions ────────────────────────────────────────────────────────
  useEffect(() => {
    // All recent orders (last 100) for the transaction table
    const unsubOrders = RealtimeOrderService.subscribeToOrders(
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      { limitCount: 100 }
    );

    // Today's orders for today stats
    const unsubToday = RealtimeOrderService.subscribeToTodaysOrders((data) => {
      setTodayOrders(data);
    });

    // All faculty users — filter client-side for those with currentDebt > 0
    const unsubUsers = RealtimeUserService.subscribeToUsers((data) => {
      setDebtUsers(data.filter((u) => (u.currentDebt ?? 0) > 0));
    }, { role: 'faculty' });

    return () => {
      unsubOrders();
      unsubToday();
      unsubUsers();
    };
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todaySales = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
    const todayPaid = todayOrders.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalAmount, 0);

    const totalPayments = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((s, o) => s + o.totalAmount, 0);

    const outstandingDebt = debtUsers.reduce((s, u) => s + (u.currentDebt ?? 0), 0);

    const gcashOrders = orders.filter((o) => (o.paymentMethod === 'gcash' || o.paymentMethod === 'gcash_qr') && o.paymentStatus === 'paid');
    const cashOrders = orders.filter((o) => o.paymentMethod === 'cash' && o.paymentStatus === 'paid');
    const totalPaidCount = gcashOrders.length + cashOrders.length;
    const gcashPercent = totalPaidCount > 0 ? Math.round((gcashOrders.length / totalPaidCount) * 100) : 0;
    const cashPercent = 100 - gcashPercent;

    const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending');

    return {
      todaySales,
      todayPaid,
      totalPayments,
      outstandingDebt,
      gcashPercent,
      cashPercent,
      pendingCount: pendingOrders.length,
      pendingValue: pendingOrders.reduce((s, o) => s + o.totalAmount, 0),
      debtUsersCount: debtUsers.length,
    };
  }, [orders, todayOrders, debtUsers]);

  // ── Weekly chart data ────────────────────────────────────────────────────
  const weeklyChart = useMemo(() => buildWeeklyChart(orders), [orders]);

  // ── Filtered / paginated transactions ────────────────────────────────────
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const userName = o.userName ?? '';
      const rfid = o.rfidUid ?? '';
      const itemsStr = itemsLabel(o);
      const status = capitalizeStatus(o.paymentStatus);

      const matchSearch =
        !search ||
        userName.toLowerCase().includes(search.toLowerCase()) ||
        rfid.toLowerCase().includes(search.toLowerCase()) ||
        itemsStr.toLowerCase().includes(search.toLowerCase()) ||
        o.orderId?.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'All' || status === statusFilter;
      const matchMethod = methodFilter === 'All' || formatPaymentMethod(o.paymentMethod) === methodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [orders, search, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ── Helpers for display ──────────────────────────────────────────────────
  function statusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return '';
    }
  }

  function debtStatusBadge(user: User) {
    const debt = user.currentDebt ?? 0;
    const limit = user.creditLimit ?? 0;
    if (limit > 0 && debt >= limit * 0.9) return { label: 'Overdue', cls: 'bg-red-100 text-red-700 border-red-200' };
    if (debt > 200) return { label: 'Active', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'New', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  }

  // ── Mark debt paid handler ────────────────────────────────────────────────
  async function handleMarkDebtPaid() {
    if (!selectedDebt) return;
    setMarkingPaid(true);
    try {
      await DebtService.processPayment(
        selectedDebt.uid,
        selectedDebt.currentDebt ?? 0,
        'Full debt payment marked by admin',
        paymentMethodForDebt
      );
      setShowMarkPaidModal(false);
      setSelectedDebt(null);
      setPaymentMethodForDebt('cash');
    } catch (err) {
      console.error('Failed to mark debt as paid:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to mark debt as paid'}`);
    } finally {
      setMarkingPaid(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Payments &amp; Financial Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track transactions, payments, and outstanding debts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5 text-sm"
            onClick={() => console.log('Exporting payment data…')}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </Button>
          <Select defaultValue="recent">
            <SelectTrigger className="w-[140px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent 100</SelectItem>
              <SelectItem value="today">Today</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Total Sales Today</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              ₱{stats.todaySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Today Paid</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              ₱{stats.todayPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Total Payments</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              ₱{stats.totalPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              GCash {stats.gcashPercent}% / Cash {stats.cashPercent}%
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-700">
                <span className="material-symbols-outlined text-[20px]">request_quote</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Outstanding Debt</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-destructive">
              ₱{stats.outstandingDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{stats.debtUsersCount} user{stats.debtUsersCount !== 1 ? 's' : ''} active</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
            </div>
            <p className="text-xs text-primary font-bold">Net Revenue</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-primary">
              ₱{stats.totalPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-primary/70 mt-1">Paid transactions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-amber-50 border-amber-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-200 text-amber-800">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
            </div>
            <p className="text-xs text-amber-800 font-bold">Pending Actions</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-amber-800">{stats.pendingCount}</p>
            <p className="text-[11px] text-amber-700 mt-1">
              Value: ₱{stats.pendingValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">search</span>
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-[130px]" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Processing">Processing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={(value) => { setMethodFilter(value); setPage(1); }}>
              <SelectTrigger className="w-[130px]" size="sm">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Methods</SelectItem>
                <SelectItem value="GCash">GCash</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Pay Later">Pay Later</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground lg:ml-auto self-center whitespace-nowrap">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
              <span className="text-sm">Loading transactions…</span>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                      <span className="material-symbols-outlined block text-4xl mb-2 opacity-30">search_off</span>
                      No transactions match your filters
                    </td>
                  </tr>
                ) : (
                  paginated.map((order) => {
                    const status = capitalizeStatus(order.paymentStatus);
                    const method = formatPaymentMethod(order.paymentMethod);
                    const initials = getInitials(order.userName || 'U');
                    const avatar = avatarColor(order.userId);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowTransactionModal(true);
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0', avatar)}>
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold leading-tight">{order.userName}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">{order.rfidUid || order.orderId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs max-w-[200px] truncate">{itemsLabel(order)}</td>
                        <td className="px-5 py-3.5 font-bold font-mono">₱{order.totalAmount.toFixed(2)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className="text-[11px]">{method}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={cn('text-[11px] font-bold', statusBadgeClass(status))}>
                            {status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatTime(order.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="relative flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === order.id ? null : order.id);
                              }}
                              className="material-symbols-outlined text-[20px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            >
                              more_vert
                            </button>
                            {actionMenuOpen === order.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); }}
                                />
                                <div className="absolute right-0 top-8 z-50 w-44 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuOpen(null);
                                        setSelectedOrder(order);
                                        setShowTransactionModal(true);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                                      View Details
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActionMenuOpen(null);
                                        console.log('Printing receipt for', order.orderId);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">print</span>
                                      Print Receipt
                                    </button>
                                    {order.paymentStatus === 'failed' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionMenuOpen(null);
                                          console.log('Retrying payment for', order.orderId);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                                        Retry Payment
                                      </button>
                                    )}
                                    {order.paymentStatus === 'paid' && (
                                      <>
                                        <div className="h-px bg-border my-1" />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuOpen(null);
                                            setSelectedOrder(order);
                                            setShowRefundModal(true);
                                          }}
                                          className="w-full px-4 py-2 text-left text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">undo</span>
                                          Refund
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0
              ? 'No transactions'
              : `Showing ${Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} transactions`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === page ? 'default' : 'outline'}
                className={cn('h-7 w-7 px-0 text-xs', p === page && 'bg-primary text-primary-foreground')}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Daily Sales Trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Last 7 days overview</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: ₱{weeklyChart.length > 0 ? Math.round(weeklyChart.reduce((s, d) => s + d.sales, 0) / weeklyChart.length).toLocaleString() : 0}/day
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-6 px-2 pb-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyChart} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, className: 'fill-muted-foreground' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} width={42} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="sales" name="Sales" className="fill-primary" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" name="Payments" className="fill-secondary" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debt" name="Debt" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Debt Registry */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Outstanding Debts</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Requires attention</p>
              </div>
              <Button
                variant="link"
                className="text-primary font-semibold p-0 h-auto text-xs"
                onClick={() => setShowAllDebtsModal(true)}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {debtUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <span className="material-symbols-outlined block text-3xl mb-2 opacity-30">check_circle</span>
                No outstanding debts
              </div>
            ) : (
              debtUsers.slice(0, 4).map((user) => {
                const badge = debtStatusBadge(user);
                const initials = getInitials(user.name);
                const avatar = avatarColor(user.uid);
                return (
                  <div key={user.uid} className="p-3 bg-muted/40 rounded-lg border border-border hover:bg-muted/60 transition-colors">
                    <div className="flex items-start gap-3 mb-2">
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0', avatar)}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{user.rfidUid || user.uid.slice(0, 8)}</p>
                      </div>
                      <Badge className={cn('text-[10px] font-bold shrink-0', badge.cls)}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between pl-12">
                      <div>
                        <p className={cn('text-sm font-bold tabular-nums', badge.label === 'Overdue' ? 'text-destructive' : 'text-foreground')}>
                          ₱{(user.currentDebt ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedDebt(user);
                          setShowMarkPaidModal(true);
                        }}
                      >
                        Mark Paid
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Transaction Details Modal ── */}
      {showTransactionModal && selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowTransactionModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Transaction Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.orderId}</p>
                </div>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="text-center">
                  <Badge className={cn('text-sm font-bold px-4 py-2', statusBadgeClass(capitalizeStatus(selectedOrder.paymentStatus)))}>
                    {capitalizeStatus(selectedOrder.paymentStatus)}
                  </Badge>
                </div>

                <div className="p-4 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm', avatarColor(selectedOrder.userId))}>
                      {getInitials(selectedOrder.userName || 'U')}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{selectedOrder.userName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{selectedOrder.rfidUid || '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <span className="text-sm font-medium text-right max-w-[240px]">{itemsLabel(selectedOrder)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-lg font-bold font-mono">₱{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Payment Method</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedOrder.paymentMethod.charAt(0).toUpperCase() + selectedOrder.paymentMethod.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Order Status</span>
                    <span className="text-sm font-medium">{capitalizeStatus(selectedOrder.orderStatus)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="text-sm font-medium">{formatTime(selectedOrder.createdAt)}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="flex justify-between py-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Notes</span>
                      <span className="text-sm font-medium text-right max-w-[200px]">{selectedOrder.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowTransactionModal(false)}>Close</Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => console.log('Printing receipt for', selectedOrder.orderId)}
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Mark Paid Modal ── */}
      {showMarkPaidModal && selectedDebt && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMarkPaidModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Mark Debt as Paid</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedDebt.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    setPaymentMethodForDebt('cash');
                  }}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 text-center border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-muted-foreground mb-1">Outstanding Amount</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                ₱{(selectedDebt.currentDebt ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                RFID: {selectedDebt.rfidUid || '—'}
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">
                Payment Method <span className="text-destructive">*</span>
              </label>
              <Select value={paymentMethodForDebt} onValueChange={setPaymentMethodForDebt}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="gcash_qr">GCash QR</SelectItem>
                  <SelectItem value="paylater">Pay Later</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0">info</span>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Confirm Payment</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will mark the debt as paid, update the debt record with the payment method, and update the associated order in Firestore.
                </p>
              </div>
            </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setShowMarkPaidModal(false);
                    setPaymentMethodForDebt('cash');
                  }} 
                  disabled={markingPaid}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-700"
                  onClick={handleMarkDebtPaid}
                  disabled={markingPaid}
                >
                  {markingPaid
                    ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  }
                  {markingPaid ? 'Saving…' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── View All Debts Modal ── */}
      {showAllDebtsModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowAllDebtsModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">All Outstanding Debts</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {debtUsers.length} user{debtUsers.length !== 1 ? 's' : ''} with outstanding balance
                  </p>
                </div>
                <button
                  onClick={() => setShowAllDebtsModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-3">
                  {debtUsers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <span className="material-symbols-outlined block text-4xl mb-2 opacity-30">check_circle</span>
                      No outstanding debts
                    </div>
                  ) : (
                    debtUsers.map((user) => {
                      const badge = debtStatusBadge(user);
                      const initials = getInitials(user.name);
                      const avatar = avatarColor(user.uid);
                      return (
                        <div key={user.uid} className="p-4 bg-muted/40 rounded-xl border border-border hover:bg-muted/60 transition-colors">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0', avatar)}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold leading-tight">{user.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.rfidUid || user.uid.slice(0, 12)}</p>
                              {user.department && (
                                <p className="text-xs text-muted-foreground mt-1">{user.department}</p>
                              )}
                            </div>
                            <Badge className={cn('text-xs font-bold shrink-0', badge.cls)}>{badge.label}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={cn('text-xl font-bold tabular-nums', badge.label === 'Overdue' ? 'text-destructive' : 'text-foreground')}>
                                ₱{(user.currentDebt ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </p>
                              {user.creditLimit && (
                                <p className="text-xs text-muted-foreground">Limit: ₱{user.creditLimit.toLocaleString('en-PH')}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                Send Reminder
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-green-600 text-white hover:bg-green-700"
                                onClick={() => {
                                  setSelectedDebt(user);
                                  setShowAllDebtsModal(false);
                                  setShowMarkPaidModal(true);
                                }}
                              >
                                Mark Paid
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAllDebtsModal(false)}>Close</Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Refund Modal ── */}
      {showRefundModal && selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowRefundModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Process Refund</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.orderId}</p>
                </div>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
                  <p className="text-xs text-muted-foreground mb-1">Refund Amount</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ₱{selectedOrder.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedOrder.userName} • {selectedOrder.paymentMethod.toUpperCase()}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Reason for Refund <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    placeholder="e.g., Wrong item, customer request, system error..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px] shrink-0">warning</span>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">Important Notice</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This action cannot be undone. The refund will be processed immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowRefundModal(false); setRefundReason(''); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-red-600 text-white hover:bg-red-700"
                  disabled={!refundReason.trim()}
                  onClick={() => {
                    console.log('Processing refund for', selectedOrder.orderId, 'Reason:', refundReason);
                    setShowRefundModal(false);
                    setRefundReason('');
                    setSelectedOrder(null);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                  Process Refund
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
