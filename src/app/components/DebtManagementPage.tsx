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
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RealtimeUserService, DebtService, RealtimeDebtService, User } from '../../firebase';

interface DebtAccount {
  id: string;
  userId: string;
  name: string;
  role: 'Faculty' | 'Staff' | 'Student';
  department: string;
  avatar: string;
  initials: string;
  currentDebt: number;
  lastTransaction: string;
  status: 'Over Limit' | 'Warning' | 'Normal' | 'Critical';
  creditLimit: number;
  transactionHistory: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'charge' | 'payment';
  }>;
  contactEmail?: string;
  lastPayment?: string;
  // Debt collection fields
  orderId?: string;
  items?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  paymentMethod?: string;
  rfidUid?: string;
  debtStatus?: 'unpaid' | 'paid' | 'partial' | 'overdue';
}

function transformDebtRecordToAccount(debtRecord: any, userMap: Map<string, User>): DebtAccount {
  try {
    const user = userMap.get(debtRecord.userId);
    const name = user?.name || debtRecord.userName || 'Anonymous User';
    const names = name.split(' ');
    const initials = names.map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
    const avatar = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=c0aede,d1a4e3,b6e3f4&fontFamily=Arial,sans-serif`;
    
    // Amount is the debt amount from the record
    const currentDebt = debtRecord.amount || 0;
    const creditLimit = user?.creditLimit || (user?.role === 'faculty' ? 500 : 300);
    
    let role: 'Faculty' | 'Staff' | 'Student' = 'Student';
    if (user?.role === 'faculty') role = 'Faculty';
    else if (user?.role === 'kiosk') role = 'Staff';

    // Status mapping: unpaid/overdue -> Warning/Over Limit, paid -> Normal
    let status: 'Critical' | 'Over Limit' | 'Warning' | 'Normal' = 'Normal';
    if (debtRecord.status === 'unpaid' || debtRecord.status === 'overdue') {
      if (currentDebt > creditLimit) {
        status = 'Over Limit';
      } else if (currentDebt > creditLimit * 0.75) {
        status = 'Critical';
      } else {
        status = 'Warning';
      }
    } else if (debtRecord.status === 'paid') {
      status = 'Normal';
    }

    // Format last transaction date from createdAt
    let lastTxStr = 'N/A';
    try {
      if (debtRecord.createdAt) {
        const dateObj = debtRecord.createdAt instanceof Date ? debtRecord.createdAt : (debtRecord.createdAt.toDate?.() || new Date());
        lastTxStr = dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      lastTxStr = 'N/A';
    }

    return {
      id: debtRecord.id,
      userId: debtRecord.userId,
      name,
      role,
      department: user?.department || debtRecord.department || 'General',
      avatar,
      initials,
      currentDebt,
      lastTransaction: lastTxStr,
      status,
      creditLimit,
      transactionHistory: [],
      contactEmail: user?.email,
      // Debt collection fields
      orderId: debtRecord.orderId,
      items: debtRecord.items || [],
      paymentMethod: debtRecord.paymentMethod,
      rfidUid: debtRecord.rfidUid,
      debtStatus: debtRecord.status,
    };
  } catch (error) {
    console.error('Error transforming debt record:', error, debtRecord);
    // Return a basic record if transformation fails
    return {
      id: debtRecord.id || 'unknown',
      userId: debtRecord.userId || 'unknown',
      name: debtRecord.userName || 'Unknown',
      role: 'Student',
      department: debtRecord.department || 'General',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Unknown',
      initials: 'UN',
      currentDebt: debtRecord.amount || 0,
      lastTransaction: 'N/A',
      status: 'Normal',
      creditLimit: 300,
      transactionHistory: [],
      items: debtRecord.items || [],
      orderId: debtRecord.orderId,
      paymentMethod: debtRecord.paymentMethod,
      rfidUid: debtRecord.rfidUid,
      debtStatus: debtRecord.status,
    };
  }
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; priority: number }> = {
  Critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-600', label: 'Critical', priority: 4 },
  'Over Limit': { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-600', label: 'Over Limit', priority: 3 },
  Warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Warning', priority: 2 },
  Normal: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', dot: 'bg-green-500', label: 'Normal', priority: 1 },
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

export function DebtManagementPage() {
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDebtRange, setFilterDebtRange] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState<DebtAccount | null>(null);
  const [page, setPage] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const [showBulkSettlementModal, setShowBulkSettlementModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const PAGE_SIZE = 8;

  // Real-time accounts state
  const [accounts, setAccounts] = useState<DebtAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time selected transaction history state
  const [selectedHistory, setSelectedHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [todayRecoveries, setTodayRecoveries] = useState(12440.0); // fallback default

  // Subscribe to both users and debt records
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    const unsubscribe = RealtimeUserService.subscribeToUsers((userList) => {
      // Create a map of users for quick lookup
      const map = new Map(userList.map(u => [u.uid, u]));
      setUserMap(map);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to debt records from the 'debt' collection
  useEffect(() => {
    console.log('Subscribing to debts with userMap size:', userMap.size);
    const unsubscribe = RealtimeDebtService.subscribeToDebts((debtRecords) => {
      console.log('Debt records received:', debtRecords);
      // Transform debt records into DebtAccount format
      const transformed = debtRecords.map(record => 
        transformDebtRecordToAccount(record, userMap)
      );
      console.log('Transformed accounts:', transformed);
      setAccounts(transformed);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userMap]);

  // Sync selected details with updated realtime accounts
  const selectedAccount = useMemo(() => {
    if (!selected) return null;
    return accounts.find((a) => a.id === selected.id) || selected;
  }, [selected, accounts]);

  // Subscribe to transactions for the selected user
  useEffect(() => {
    if (!selectedAccount) {
      setSelectedHistory([]);
      return;
    }

    setHistoryLoading(true);
    const unsubscribe = RealtimeDebtService.subscribeToTransactions(
      selectedAccount.id,
      (txns) => {
        const mapped = txns.map((t) => ({
          date: t.createdAt
            ? new Date(t.createdAt.seconds * 1000).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A',
          description: t.description,
          amount: t.amount,
          type: t.type === 'payment' ? 'payment' : 'charge',
        }));
        setSelectedHistory(mapped);
        setHistoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedAccount?.id]);

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      const matchSearch =
        !search ||
        account.name.toLowerCase().includes(search.toLowerCase()) ||
        (account.contactEmail?.toLowerCase().includes(search.toLowerCase()) || false) ||
        account.department.toLowerCase().includes(search.toLowerCase());

      const matchDepartment =
        filterDepartment === 'All' || account.department.includes(filterDepartment);

      const matchRole = filterRole === 'All' || account.role === filterRole;

      let matchDebtRange = true;
      if (filterDebtRange === 'Below 100') matchDebtRange = account.currentDebt < 100;
      if (filterDebtRange === '100-500') matchDebtRange = account.currentDebt >= 100 && account.currentDebt <= 500;
      if (filterDebtRange === 'Above 500') matchDebtRange = account.currentDebt > 500;

      const matchStatus = filterStatus === 'All' || account.status === filterStatus;

      return matchSearch && matchDepartment && matchRole && matchDebtRange && matchStatus;
    });
  }, [accounts, search, filterDepartment, filterRole, filterDebtRange, filterStatus]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalDebt = useMemo(() => accounts.reduce((sum, acc) => sum + acc.currentDebt, 0), [accounts]);
  const highRiskCount = useMemo(() => accounts.filter((acc) => acc.currentDebt > 500).length, [accounts]);
  const avgDebt = useMemo(() => (accounts.length ? Math.round(totalDebt / accounts.length) : 0), [accounts, totalDebt]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={cn(
          'p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all duration-300',
          selectedAccount ? 'mr-[420px]' : ''
        )}
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Debt Management</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitor outstanding debts across{' '}
              <span className="font-semibold text-foreground">{accounts.length} active accounts</span>
            </p>
          </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2 text-sm"
                  onClick={() => console.log('Opening audit log...')}
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  Audit Log
                </Button>
                <Button
                  className="gap-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setShowBulkSettlementModal(true)}
                >
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                  Bulk Settlement
                </Button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Outstanding',
                  value: `₱${totalDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                  sub: '+2.4% vs last month',
                  subColor: 'text-red-600',
                  icon: 'payments',
                  iconBg: 'bg-primary/10 text-primary',
                  trend: 'trending_up',
                },
                {
                  label: 'High-Risk Accounts',
                  value: highRiskCount.toString(),
                  sub: 'Over ₱500 limit',
                  subColor: 'text-red-600',
                  icon: 'warning',
                  iconBg: 'bg-red-100 text-red-700',
                },
                {
                  label: 'Daily Recoveries',
                  value: `₱${todayRecoveries.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                  sub: 'Collected today',
                  subColor: 'text-green-600',
                  icon: 'trending_up',
                  iconBg: 'bg-green-100 text-green-700',
                },
                {
                  label: 'Avg. Debt',
                  value: `₱${avgDebt.toLocaleString('en-PH')}`,
                  sub: 'Per account',
                  subColor: 'text-muted-foreground',
                  icon: 'analytics',
                  iconBg: 'bg-violet-100 text-violet-700',
                },
              ].map((stat, i) => (
                <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.iconBg)}>
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
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
              <div className="p-4 border-b border-border bg-muted/30 flex flex-col lg:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, email, department…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  {/* Department Filter */}
                  <Select value={filterDepartment} onValueChange={(value) => { setFilterDepartment(value); setPage(1); }}>
                    <SelectTrigger className="w-[140px]" size="sm">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Depts</SelectItem>
                      <SelectItem value="CAS">CAS</SelectItem>
                      <SelectItem value="CBA">CBA</SelectItem>
                      <SelectItem value="CTE">CTE</SelectItem>
                      <SelectItem value="Nursing">Nursing</SelectItem>
                      <SelectItem value="Registrar">Registrar</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Role Filter */}
                  <Select value={filterRole} onValueChange={(value) => { setFilterRole(value); setPage(1); }}>
                    <SelectTrigger className="w-[120px]" size="sm">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Roles</SelectItem>
                      <SelectItem value="Faculty">Faculty</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Student">Student</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Debt Range Filter */}
                  <Select value={filterDebtRange} onValueChange={(value) => { setFilterDebtRange(value); setPage(1); }}>
                    <SelectTrigger className="w-[130px]" size="sm">
                      <SelectValue placeholder="Amount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Any Amount</SelectItem>
                      <SelectItem value="Below 100">₱Below 100</SelectItem>
                      <SelectItem value="100-500">₱100-500</SelectItem>
                      <SelectItem value="Above 500">₱Above 500</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setPage(1); }}>
                    <SelectTrigger className="w-[120px]" size="sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="Over Limit">Over Limit</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Account Holder
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground w-[130px]">
                        Email
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Department
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Last Transaction
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground text-right">
                        Current Debt
                      </TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                          <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">
                            account_balance_wallet
                          </span>
                          No accounts match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {paged.map((account, i) => {
                      const status = STATUS_CONFIG[account.status];
                      const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
                      const isSelected = selectedAccount?.id === account.id;
                      const utilization = Math.round((account.currentDebt / account.creditLimit) * 100);

                      return (
                        <TableRow
                          key={account.id}
                          onClick={() => setSelected(isSelected ? null : account)}
                          className={cn(
                            'cursor-pointer transition-colors group',
                            isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40'
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <img
                                src={account.avatar}
                                alt={account.name}
                                className="w-9 h-9 rounded-full object-cover shadow-sm shrink-0"
                              />
                              <div>
                                <p className="text-sm font-semibold leading-tight">{account.name}</p>
                                <p className="text-[11px] text-muted-foreground">{account.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{account.contactEmail || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{account.department}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{account.lastTransaction}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  'font-mono text-sm font-bold',
                                  account.currentDebt > account.creditLimit
                                    ? 'text-red-600'
                                    : account.currentDebt > account.creditLimit * 0.8
                                      ? 'text-amber-600'
                                      : 'text-foreground'
                                )}
                              >
                                ₱{account.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {utilization}% of ₱{account.creditLimit}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                                status.bg,
                                status.text
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted rounded-lg transition-all"
                            >
                              <span className="material-symbols-outlined text-muted-foreground text-[18px]">
                                more_vert
                              </span>
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
                    : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} accounts`}
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
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) {
                      p = i + 1;
                    } else if (page <= 3) {
                      p = i + 1;
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i;
                    } else {
                      p = page - 2 + i;
                    }
                    return (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'ghost'}
                        size="sm"
                        className={cn('h-8 w-8 p-0', p === page && 'bg-primary text-primary-foreground')}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
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

      {/* Detail Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[420px] bg-card border-l border-border shadow-2xl z-30 flex flex-col transition-transform duration-300 ease-in-out',
          selectedAccount ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ top: '64px', height: 'calc(100vh - 64px)' }}
      >
          {selectedAccount && (
            <>
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{selectedAccount.userId}</p>
                  <p className="font-semibold text-sm mt-0.5">Account Details</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground text-[20px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                {/* Status + Debt Hero */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 text-center space-y-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                      STATUS_CONFIG[selectedAccount.status].bg,
                      STATUS_CONFIG[selectedAccount.status].text
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[selectedAccount.status].dot)} />
                    {selectedAccount.status}
                  </Badge>
                  <p className="text-3xl font-bold tracking-tight text-red-700">
                    ₱{selectedAccount.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-red-600">
                    {Math.round((selectedAccount.currentDebt / selectedAccount.creditLimit) * 100)}% of ₱
                    {selectedAccount.creditLimit.toLocaleString()} limit
                  </p>
                  <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((selectedAccount.currentDebt / selectedAccount.creditLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Account Holder Info */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Account Holder
                  </p>
                  <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card shadow-sm">
                    <img
                      src={selectedAccount.avatar}
                      alt={selectedAccount.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{selectedAccount.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedAccount.role}</p>
                      <p className="text-xs text-muted-foreground">{selectedAccount.department}</p>
                    </div>
                  </div>
                </div>

                {/* Account Summary */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Account Summary
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Credit Limit</p>
                        <p className="text-lg font-bold mt-0.5">
                          ₱{selectedAccount.creditLimit.toLocaleString('en-PH')}
                        </p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Available</p>
                        <p className="text-lg font-bold mt-0.5 text-green-600">
                          ₱{Math.max(0, selectedAccount.creditLimit - selectedAccount.currentDebt).toLocaleString('en-PH')}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Payment</p>
                        <p className="text-sm font-medium mt-0.5">{selectedAccount.lastPayment || 'N/A'}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Last Transaction
                        </p>
                        <p className="text-sm font-medium mt-0.5">{selectedAccount.lastTransaction}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Order Details
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm divide-y divide-border">
                    {selectedAccount.orderId && (
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Order ID</p>
                        <p className="text-sm font-bold mt-0.5 font-mono">{selectedAccount.orderId}</p>
                      </div>
                    )}
                    {selectedAccount.rfidUid && (
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">RFID UID</p>
                        <p className="text-sm font-bold mt-0.5 font-mono">{selectedAccount.rfidUid}</p>
                      </div>
                    )}
                    {selectedAccount.paymentMethod && (
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Payment Method</p>
                        <p className="text-sm font-semibold mt-0.5 capitalize">{selectedAccount.paymentMethod.replace('_', ' ')}</p>
                      </div>
                    )}
                    {selectedAccount.debtStatus && (
                      <div className="p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Debt Status</p>
                        <Badge variant="outline" className={cn('mt-0.5', 
                          selectedAccount.debtStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          selectedAccount.debtStatus === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {selectedAccount.debtStatus.charAt(0).toUpperCase() + selectedAccount.debtStatus.slice(1)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Purchased */}
                {selectedAccount.items && selectedAccount.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Items Purchased
                    </p>
                    <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm">
                      <div className="divide-y divide-border">
                        {selectedAccount.items.map((item, idx) => (
                          <div key={idx} className="p-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-semibold leading-tight">{item.productName}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.productId}</p>
                              </div>
                              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                                x{item.quantity}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              <span className="text-xs text-muted-foreground">
                                ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} each
                              </span>
                              <span className="text-sm font-bold">
                                ₱{item.totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-muted/30 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">TOTAL AMOUNT</span>
                          <span className="text-lg font-bold text-primary">
                            ₱{selectedAccount.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction History */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Recent Activity
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden bg-card shadow-sm bg-background/50">
                    {historyLoading ? (
                      <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined animate-spin text-[20px] text-primary">sync</span>
                        Loading activity...
                      </div>
                    ) : selectedHistory.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <span className="material-symbols-outlined text-[24px] block mb-1 opacity-40">history</span>
                        No recent activity
                      </div>
                    ) : (
                      selectedHistory.map((txn, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex items-center justify-between p-3',
                            i !== selectedHistory.length - 1 && 'border-b border-border'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                txn.type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              )}
                            >
                              <span
                                className="material-symbols-outlined text-[16px]"
                                style={{ fontVariationSettings: '"FILL" 1' }}
                              >
                                {txn.type === 'payment' ? 'south_west' : 'north_east'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-tight">{txn.description}</p>
                              <p className="text-[10px] text-muted-foreground">{txn.date}</p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              'font-mono text-sm font-bold',
                              txn.type === 'payment' ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {txn.type === 'payment' ? '' : '+'}₱
                            {Math.abs(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 text-sm h-auto py-3 flex-col items-center"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      <span className="material-symbols-outlined text-[20px]">payments</span>
                      <span className="text-xs">Record Payment</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-sm h-auto py-3 flex-col items-center"
                      onClick={() => setShowAdjustModal(true)}
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                      <span className="text-xs">Adjust Balance</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-sm h-auto py-3 flex-col items-center"
                      onClick={() => setShowReminderModal(true)}
                    >
                      <span className="material-symbols-outlined text-[20px]">notifications</span>
                      <span className="text-xs">Send Reminder</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-sm h-auto py-3 flex-col items-center"
                      onClick={() => {
                        console.log('Sending email statement to', selectedAccount.contactEmail);
                        // Email statement functionality
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                      <span className="text-xs">Email Statement</span>
                    </Button>
                  </div>
                </div>

                {/* Contact Info */}
                {selectedAccount.contactEmail && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Contact</p>
                    <div className="p-3 rounded-lg border border-border bg-card shadow-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-muted-foreground text-[18px]">mail</span>
                      <span className="text-sm text-muted-foreground">{selectedAccount.contactEmail}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer Actions */}
              <div className="p-4 border-t border-border bg-muted/20 space-y-2">
                <Button
                  className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    setPaymentAmount(selectedAccount.currentDebt.toString());
                    setShowPaymentModal(true);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                  Settle Full Payment
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowFullHistoryModal(true)}
                >
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  View Full History
                </Button>
              </div>
            </>
          )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedAccount && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Record Payment</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedAccount.name}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 text-center border border-red-200 dark:border-red-800">
                  <p className="text-xs text-muted-foreground mb-1">Current Debt</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ₱{selectedAccount.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Payment Amount <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono text-lg"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[100, 250, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setPaymentAmount(amount.toString())}
                      className="px-3 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPaymentAmount(selectedAccount.currentDebt.toString())}
                  className="w-full px-3 py-2 text-sm font-semibold border border-primary text-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  Pay Full Amount
                </button>

                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Remaining Debt:</span>
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₱{Math.max(0, selectedAccount.currentDebt - parseFloat(paymentAmount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedAccount.currentDebt - parseFloat(paymentAmount) <= 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 text-center font-semibold">
                        ✓ Account will be cleared
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowPaymentModal(false); setPaymentAmount(''); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-green-600 text-white hover:bg-green-700"
                  onClick={async () => {
                    try {
                      const amount = parseFloat(paymentAmount);
                      if (isNaN(amount) || amount <= 0) {
                        alert('Please enter a valid payment amount');
                        return;
                      }
                      await DebtService.processPayment(selectedAccount.id, amount);
                      setShowPaymentModal(false);
                      setPaymentAmount('');
                    } catch (error: any) {
                      console.error('Error processing payment:', error);
                      alert(error.message || 'Failed to record payment');
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Record Payment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && selectedAccount && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowAdjustModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Adjust Balance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedAccount.name}</p>
                </div>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Debt</p>
                  <p className="text-3xl font-bold">
                    ₱{selectedAccount.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Adjustment Amount <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0.00 (positive to add, negative to subtract)"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Use positive values to add debt, negative to reduce
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Reason for Adjustment <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    placeholder="e.g., Manual correction, disputed charge, etc."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                    rows={3}
                  />
                </div>

                {adjustmentAmount && parseFloat(adjustmentAmount) !== 0 && (
                  <div className={cn(
                    'border rounded-xl p-4',
                    parseFloat(adjustmentAmount) > 0
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Balance:</span>
                      <span className={cn(
                        'text-xl font-bold',
                        parseFloat(adjustmentAmount) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      )}>
                        ₱{(selectedAccount.currentDebt + parseFloat(adjustmentAmount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAdjustModal(false);
                    setAdjustmentAmount('');
                    setAdjustmentReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={async () => {
                    try {
                      const amount = parseFloat(adjustmentAmount);
                      if (isNaN(amount) || amount === 0) {
                        alert('Please enter a valid non-zero adjustment amount');
                        return;
                      }
                      if (!adjustmentReason.trim()) {
                        alert('Please provide a reason for the adjustment');
                        return;
                      }
                      await DebtService.adjustDebt(selectedAccount.id, amount, adjustmentReason);
                      setShowAdjustModal(false);
                      setAdjustmentAmount('');
                      setAdjustmentReason('');
                    } catch (error: any) {
                      console.error('Error applying adjustment:', error);
                      alert(error.message || 'Failed to apply adjustment');
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Apply Adjustment
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Send Reminder Modal */}
      {showReminderModal && selectedAccount && (
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
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedAccount.name}</p>
                </div>
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">mail</span>
                    <div>
                      <p className="text-sm font-semibold">Email Notification</p>
                      <p className="text-xs text-muted-foreground">{selectedAccount.contactEmail}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-muted-foreground">Outstanding Amount:</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      ₱{selectedAccount.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                    <p className="text-xs font-semibold text-foreground">Reminder Details</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The user will receive an email with their current balance, payment instructions, and your custom message.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReminderModal(false);
                    setReminderMessage('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-amber-600 text-white hover:bg-amber-700"
                  onClick={() => {
                    console.log('Sending reminder to', selectedAccount.contactEmail, 'Message:', reminderMessage);
                    setShowReminderModal(false);
                    setReminderMessage('');
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

      {/* View Full History Modal */}
      {showFullHistoryModal && selectedAccount && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowFullHistoryModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Complete Transaction History</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedAccount.name} - {selectedAccount.userId}</p>
                </div>
                <button
                  onClick={() => setShowFullHistoryModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-3">
                  {selectedHistory.map((txn, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                        txn.type === 'payment' ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                      )}>
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          {txn.type === 'payment' ? 'south_west' : 'north_east'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">{txn.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          'font-mono font-bold text-sm',
                          txn.type === 'payment' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        )}>
                          {txn.type === 'payment' ? '-' : '+'}₱{Math.abs(txn.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{txn.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowFullHistoryModal(false)}>
                  Close
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Settlement Modal */}
      {showBulkSettlementModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowBulkSettlementModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Bulk Settlement</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Process multiple debt payments at once</p>
                </div>
                <button
                  onClick={() => setShowBulkSettlementModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-5">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h4 className="font-semibold mb-3">Select Accounts to Settle</h4>
                    <div className="space-y-2">
                      {accounts.slice(0, 5).map((account) => (
                        <label
                          key={account.id}
                          className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                          <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{account.name}</p>
                            <p className="text-xs text-muted-foreground">{account.userId}</p>
                          </div>
                          <p className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
                            ₱{account.currentDebt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Total Settlement Amount:</span>
                      <span className="text-2xl font-bold text-primary">₱0.00</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Select accounts above to calculate total</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBulkSettlementModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                  Process Settlement
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
