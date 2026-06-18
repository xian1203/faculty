import { useState, useMemo, useEffect } from 'react';
import { cn } from './ui/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RealtimeOrderService, Order } from '../../firebase';
import { Timestamp } from 'firebase/firestore';

// Transform Firestore Order to UI format with safe null checks
function transformOrder(order: Order) {
  // createdAt is already a Date from parseOrder, but handle if it's a Timestamp
  const date = order.createdAt instanceof Date ? order.createdAt : (order.createdAt?.toDate?.() ?? new Date());
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Get initials safely
  const userName = order.userName ?? 'Unknown User';
  const initials = userName
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  // Payment method mapping - read from paymentMethod field (gcash_qr, gcash, paylater, cash)
  const paymentMethod = order.paymentMethod ?? 'cash';
  let methodDisplay = 'Cash';
  let methodIcon = 'payments';
  
  if (paymentMethod === 'gcash_qr' || paymentMethod === 'gcash') {
    methodDisplay = 'GCash';
    methodIcon = 'qr_code_2';
  } else if (paymentMethod === 'paylater') {
    methodDisplay = 'Pay Later';
    methodIcon = 'schedule';
  }

  // Status mapping - read from paymentStatus field (pending, processing, paid)
  const status = order.paymentStatus ?? 'pending';
  let statusDisplay = 'Pending';
  if (status === 'paid') {
    statusDisplay = 'Paid';
  } else if (status === 'processing') {
    statusDisplay = 'Processing';
  }

  return {
    id: order.orderId ?? order.id,
    firestoreId: order.id,
    time: timeStr,
    date: dateStr,
    user: userName,
    userPhotoURL: order.userPhotoURL, // Safe access to photoURL
    initials: initials,
    rfid: order.rfidUid ?? 'N/A',
    role: 'User',
    items: (order.items ?? []).map(item => ({
      icon: 'shopping_bag',
      name: item.productName ?? 'Unknown Product',
      qty: item.quantity ?? 1,
      price: item.price ?? 0,
      totalPrice: item.subtotal ?? 0,
    })),
    total: order.totalAmount ?? 0,
    method: methodDisplay,
    methodIcon: methodIcon,
    status: statusDisplay,
    paymentMethod: paymentMethod,
    paymentStatus: status,
  };
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Paid:       { bg: 'bg-green-50 border-green-200',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Paid' },
  Pending:    { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Pending' },
  Processing: { bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Processing' },
};

const METHOD_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  'GCash':     { bg: 'bg-primary/10', text: 'text-primary',   icon: 'qr_code_2' },
  'Pay Later': { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'schedule' },
  'Cash':      { bg: 'bg-green-100', text: 'text-green-700', icon: 'payments' },
};

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
];

export function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(1);
  
  // Real-time data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const PAGE_SIZE = 6;

  // Subscribe to real-time orders
  useEffect(() => {
    const unsubscribe = RealtimeOrderService.subscribeToRecentOrders((orderList) => {
      setOrders(orderList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Transform orders to UI format
  const transformedTransactions = orders.map(transformOrder);

  const filtered = useMemo(() => {
    return transformedTransactions.filter((t) => {
      const matchSearch =
        !search ||
        t.user.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.rfid.toLowerCase().includes(search.toLowerCase());
      const matchMethod = filterMethod === 'All' || t.method === filterMethod;
      const matchStatus = filterStatus === 'All' || t.status === filterStatus;
      return matchSearch && matchMethod && matchStatus;
    });
  }, [search, filterMethod, filterStatus, transformedTransactions]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalVolume = transformedTransactions.reduce((s, t) => s + t.total, 0);
  const pendingTotal = transformedTransactions.filter((t) => t.status === 'Pending').reduce((s, t) => s + t.total, 0);
  const pendingCount = transformedTransactions.filter((t) => t.status === 'Pending').length;
  const avgValue = transformedTransactions.length > 0 ? Math.round(totalVolume / transformedTransactions.length) : 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto custom-scrollbar transition-all duration-300',
            selected ? 'mr-[380px]' : ''
          )}
        >
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Transactions</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Monitor all store transactions and payment activity.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export
                </Button>
                <Button className="gap-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  New Transaction
                </Button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Today's Volume",
                  value: `₱${totalVolume.toLocaleString()}.00`,
                  sub: '+12.5% from yesterday',
                  subColor: 'text-green-600',
                  icon: 'analytics',
                  iconBg: 'bg-primary/10 text-primary',
                  trend: 'trending_up',
                },
                {
                  label: 'Total Transactions',
                  value: transformedTransactions.length.toString(),
                  sub: 'Recorded today',
                  subColor: 'text-muted-foreground',
                  icon: 'receipt_long',
                  iconBg: 'bg-blue-100 text-blue-700',
                },
                {
                  label: 'Pending Payments',
                  value: `₱${pendingTotal.toLocaleString()}.00`,
                  sub: `${pendingCount} transactions`,
                  subColor: 'text-amber-700',
                  icon: 'history_toggle_off',
                  iconBg: 'bg-amber-100 text-amber-700',
                },
                {
                  label: 'Avg. Transaction',
                  value: `₱${avgValue.toLocaleString()}`,
                  sub: 'Consistent with weekly avg.',
                  subColor: 'text-muted-foreground',
                  icon: 'payments',
                  iconBg: 'bg-violet-100 text-violet-700',
                },
              ].map((stat, i) => (
                <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.iconBg)}>
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          {stat.icon}
                        </span>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                    <p className={cn('text-xs mt-1', stat.subColor)}>{stat.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table Card */}
            <Card className="shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search user, ID, RFID…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <Select value={filterMethod} onValueChange={(value) => { setFilterMethod(value); setPage(1); }}>
                    <SelectTrigger className="w-[140px]" size="sm">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {['All', 'GCash QR', 'Pay Later', 'Cash'].map((m) => (
                        <SelectItem key={m} value={m}>
                          {m === 'All' ? 'All Methods' : m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setPage(1); }}>
                    <SelectTrigger className="w-[140px]" size="sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {['All', 'Paid', 'Pending', 'Processing'].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s === 'All' ? 'All Status' : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground w-[110px]">Txn ID</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground w-[100px]">Time</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">User</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Items</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground text-right">Total</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Method</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                          <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">receipt_long</span>
                          No transactions match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {paged.map((t, i) => {
                      const status = STATUS_CONFIG[t.status];
                      const method = METHOD_CONFIG[t.method] || { bg: 'bg-muted', text: 'text-foreground', icon: t.methodIcon };
                      const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                      const isSelected = selected?.id === t.id;

                      return (
                        <TableRow
                          key={t.id}
                          onClick={() => setSelected(isSelected ? null : t)}
                          className={cn(
                            'cursor-pointer transition-colors group',
                            isSelected
                              ? 'bg-primary/5 border-l-2 border-l-primary'
                              : 'hover:bg-muted/40'
                          )}
                        >
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-primary/80">{t.id}</span>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{t.time}</p>
                            <p className="text-[11px] text-muted-foreground">{t.date}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {t.userPhotoURL ? (
                                <img 
                                  src={t.userPhotoURL} 
                                  alt={t.user}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/50"
                                  onError={(e) => {
                                    // Fallback to initials if image fails to load
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0', avatarColor)}
                                style={t.userPhotoURL ? { display: 'none' } : {}}
                              >
                                {t.initials}
                              </div>
                              <div>
                                <p className="text-sm font-semibold leading-tight">{t.user}</p>
                                <p className="text-[11px] text-muted-foreground font-mono">{t.rfid}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {t.items.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-[11px] font-medium border border-border/50"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-muted-foreground">{item.icon}</span>
                                  {item.name}
                                  <span className="text-muted-foreground">×{item.qty}</span>
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm font-bold">₱{t.total.toLocaleString()}.00</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', method.bg)}>
                                <span className={cn('material-symbols-outlined text-[14px]', method.text)}>{method.icon}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{t.method}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                              status.bg, status.text
                            )}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => { e.stopPropagation(); }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-lg transition-all"
                            >
                              <span className="material-symbols-outlined text-muted-foreground text-[18px]">more_vert</span>
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {filtered.length === 0
                    ? 'No results'
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} transactions`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? 'default' : 'ghost'}
                      size="sm"
                      className={cn('h-8 w-8 p-0', p === page && 'bg-primary text-primary-foreground')}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page === totalPages || totalPages === 0}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Detail Panel */}
        <div
          className={cn(
            'fixed top-0 right-0 h-full w-[380px] bg-card border-l border-border shadow-2xl z-30 flex flex-col transition-transform duration-300 ease-in-out',
            selected ? 'translate-x-0' : 'translate-x-full'
          )}
          style={{ top: '64px', height: 'calc(100vh - 64px)' }}
        >
          {selected && (
            <>
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{selected.id}</p>
                  <p className="font-semibold text-sm mt-0.5">Transaction Detail</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                {/* Status + Amount Hero */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-1">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                    STATUS_CONFIG[selected.status].bg,
                    STATUS_CONFIG[selected.status].text
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[selected.status].dot)} />
                    {selected.status}
                  </span>
                  <p className="text-3xl font-bold tracking-tight mt-2">₱{selected.total.toLocaleString()}.00</p>
                  <p className="text-xs text-muted-foreground">{selected.date} · {selected.time}</p>
                </div>

                {/* Customer */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Customer</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    {selected.userPhotoURL ? (
                      <img 
                        src={selected.userPhotoURL}
                        alt={selected.user}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/50"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0"
                      style={selected.userPhotoURL ? { display: 'none' } : {}}
                    >
                      {selected.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{selected.user}</p>
                      <p className="text-xs text-muted-foreground">{selected.role} · RFID {selected.rfid}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Items Purchased</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    {selected.items.map((item: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 text-sm',
                          i < selected.items.length - 1 && 'border-b border-border'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-muted-foreground text-[18px]">{item.icon}</span>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground text-xs">×{item.qty}</span>
                        </div>
                        <span className="font-mono text-sm font-semibold">₱{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 bg-muted/40 border-t border-border">
                      <span className="font-bold text-sm">Total</span>
                      <span className="font-mono font-bold text-sm">₱{selected.total.toLocaleString()}.00</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Payment Method</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', METHOD_CONFIG[selected.method]?.bg || 'bg-muted')}>
                      <span className={cn('material-symbols-outlined text-[18px]', METHOD_CONFIG[selected.method]?.text || 'text-foreground')}>
                        {METHOD_CONFIG[selected.method]?.icon || selected.methodIcon}
                      </span>
                    </div>
                    <span className="font-medium text-sm">{selected.method}</span>
                  </div>
                </div>
              </div>

              {/* Panel Actions */}
              <div className="p-4 border-t border-border bg-muted/20 flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5 text-sm">
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print Receipt
                </Button>
                {selected.status === 'Pending' && (
                  <Button className="flex-1 gap-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Mark as Paid
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
