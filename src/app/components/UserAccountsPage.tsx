import { useState, useMemo, Fragment, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { useCurrentUser } from '../../contexts/UserContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { cn } from './ui/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RealtimeUserService, User, UserService, AuthService, TopupService, RealtimeTopupService, Topup } from '../../firebase';
import { Timestamp } from 'firebase/firestore';

// Transform Firestore User to UI format
function transformUser(user: User) {
  const joinedDate = user.createdAt ? user.createdAt.toDate() : new Date();
  const joinedStr = joinedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Handle undefined/null name
  const userName = user.name || 'Unknown User';
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Handle undefined/null role
  const userRole = (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1);

  // Profile photo with initials avatar fallback
  const photoURL = user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&backgroundColor=c0aede,d1a4e3,b6e3f4&fontFamily=Arial,sans-serif`;

  return {
    id: user.uid || `#${user.rfidUid}`,
    initials: initials,
    name: userName,
    email: user.email || 'N/A',
    rfidUid: user.rfidUid || 'N/A',
    department: user.department || 'N/A',
    role: userRole,
    phone: user.phoneNumber || 'N/A',
    status: user.isActive ? 'Active' : 'Blocked',
    balance: user.balance || 0, // Read from Firestore user.balance field
    joined: joinedStr,
    photoURL: photoURL,
  };
}

const ITEMS_PER_PAGE = 8;

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  Admin:   { label: 'Admin',   color: 'bg-primary/10 text-primary border border-primary/20' },
  Faculty: { label: 'Faculty', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  Student: { label: 'Student', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Staff:   { label: 'Staff',   color: 'bg-violet-50 text-violet-700 border border-violet-200' },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  Active:  { label: 'Active',  dot: 'bg-green-500',  text: 'text-green-700' },
  Blocked: { label: 'Blocked', dot: 'bg-red-500',    text: 'text-red-700' },
  Lost:    { label: 'Lost',    dot: 'bg-amber-500',  text: 'text-amber-700' },
};

const DEPT_COLORS: string[] = [
  'bg-primary/10 text-primary',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

const DEPT_COLOR_MAP: Record<string, string> = {};

export function UserAccountsPage() {
  const { currentUser: loggedInUser } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'users' | 'pending_topups'>('users');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Custom Modals for Topups
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<Topup | null>(null);
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    rfidUid: '',
    department: '',
    role: 'faculty',
    phone: '',
    photoURL: '',
  });
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote] = useState('');

  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRfidUid, setEditUserRfidUid] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserDept, setEditUserDept] = useState('');
  const [editUserPhoto, setEditUserPhoto] = useState('');
  const [isUploadingNewPhoto, setIsUploadingNewPhoto] = useState(false);
  const [isUploadingEditPhoto, setIsUploadingEditPhoto] = useState(false);

  // Real-time data state
  const [users, setUsers] = useState<User[]>([]);
  const [pendingTopups, setPendingTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeUsers = RealtimeUserService.subscribeToUsers((userList) => {
      const filteredUsers = userList.filter(u => u.role === 'faculty' || u.role === 'admin');
      setUsers(filteredUsers);
      setLoading(false);
    });

    const unsubscribeTopups = RealtimeTopupService.subscribeToPendingTopups((topupsList) => {
      setPendingTopups(topupsList);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTopups();
    };
  }, []);

  // Sync edit states when selected user changes
  useEffect(() => {
    if (selectedUser) {
      setEditUserName(selectedUser.name || '');
      setEditUserEmail(selectedUser.email || '');
      setEditUserPhone(selectedUser.phone || '');
      setEditUserRfidUid(selectedUser.rfidUid || '');
      setEditUserRole((selectedUser.role || '').toLowerCase());
      setEditUserDept(selectedUser.department || '');
      setEditUserPhoto(selectedUser.photoURL || '');
    }
  }, [selectedUser]);

  // Transform users to UI format
  const transformedUsers = users.map(transformUser);
  
  // Build department color map
  const deptList = [...new Set(transformedUsers.map(u => u.department))];
  deptList.forEach((d, i) => { DEPT_COLOR_MAP[d] = DEPT_COLORS[i % DEPT_COLORS.length]; });

  const filtered = useMemo(() => {
    return transformedUsers.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.rfidUid.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, transformedUsers]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = useMemo(() => ({
    total: transformedUsers.length,
    active: transformedUsers.filter((u: any) => u.status === 'Active').length,
    blocked: transformedUsers.filter((u: any) => u.status === 'Blocked' || u.status === 'Lost').length,
    credits: transformedUsers.reduce((s: number, u: any) => s + u.balance, 0),
  }), [transformedUsers]);

  // --- Cloudinary upload helpers ---
  const handleNewUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNewPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'honesty_store');
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz4uwpgoi';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.secure_url) {
        setNewUser(prev => ({ ...prev, photoURL: data.secure_url }));
      } else {
        throw new Error('No URL returned from Cloudinary');
      }
    } catch (err: any) {
      alert(`Photo upload failed: ${err.message}`);
    } finally {
      setIsUploadingNewPhoto(false);
    }
  };

  const handleEditUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEditPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'honesty_store');
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz4uwpgoi';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.secure_url) {
        setEditUserPhoto(data.secure_url);
      } else {
        throw new Error('No URL returned from Cloudinary');
      }
    } catch (err: any) {
      alert(`Photo upload failed: ${err.message}`);
    } finally {
      setIsUploadingEditPhoto(false);
    }
  };

  const handleApproveTopup = async () => {
    if (!selectedTopup) return;
    setIsProcessingTopup(true);
    try {
      // In a real system, you would pass the current admin's ID
      await TopupService.approveTopup(selectedTopup.id, 'admin-id');
      setShowApproveModal(false);
      setSelectedTopup(null);
      alert('Top-up approved successfully!');
    } catch (err: any) {
      console.error('Failed to approve top-up:', err);
      alert('Failed to approve top-up: ' + err.message);
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const handleRejectTopup = async () => {
    if (!selectedTopup) return;
    setIsProcessingTopup(true);
    try {
      await TopupService.rejectTopup(selectedTopup.id, 'admin-id');
      setShowRejectModal(false);
      setSelectedTopup(null);
      alert('Top-up rejected successfully!');
    } catch (err: any) {
      console.error('Failed to reject top-up:', err);
      alert('Failed to reject top-up: ' + err.message);
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const summaryCards = [
    { icon: 'group', bg: 'bg-primary/10 text-primary', title: 'Total Registered Users', value: stats.total.toLocaleString(), badge: '+12% this month', badgeColor: 'text-green-600' },
    { icon: 'sensors', bg: 'bg-amber-100 text-amber-700', title: 'Active RFID Tags', value: stats.active.toLocaleString(), badge: `${((stats.active / stats.total) * 100).toFixed(1)}% active`, badgeColor: 'text-amber-600' },
    { icon: 'block', bg: 'bg-destructive/10 text-destructive', title: 'Blocked / Lost Tags', value: stats.blocked.toLocaleString(), badge: '+3 this week', badgeColor: 'text-destructive' },
    { icon: 'account_balance_wallet', bg: 'bg-blue-100 text-blue-700', title: 'Total Account Credits', value: `₱${stats.credits.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, badge: 'PHP Balance', badgeColor: 'text-green-600' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">User Accounts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage student, faculty, and staff RFID profiles and balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5 text-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </Button>
          <Button
            onClick={() => setShowRegisterModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-sm active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Register User
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'pb-3 text-sm font-medium transition-all relative',
            activeTab === 'users' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All Users
          {activeTab === 'users' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending_topups')}
          className={cn(
            'pb-3 text-sm font-medium transition-all relative flex items-center gap-2',
            activeTab === 'pending_topups' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Pending Top-ups
          {pendingTopups.length > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
              {pendingTopups.length}
            </span>
          )}
          {activeTab === 'pending_topups' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2 rounded-lg', card.bg)}>
                  <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full bg-muted', card.badgeColor)}>{card.badge}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{card.title}</p>
              <p className="text-2xl font-semibold mt-1 tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <Card className="shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">search</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, RFID…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-[110px]" size="sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground sm:ml-auto self-center whitespace-nowrap">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="uppercase text-[11px] tracking-wider font-bold pl-5">User</TableHead>
                <TableHead className="uppercase text-[11px] tracking-wider font-bold">RFID UID</TableHead>
                <TableHead className="uppercase text-[11px] tracking-wider font-bold">Department</TableHead>
                <TableHead className="uppercase text-[11px] tracking-wider font-bold">Role</TableHead>
                <TableHead className="uppercase text-[11px] tracking-wider font-bold">Balance</TableHead>
                <TableHead className="uppercase text-[11px] tracking-wider font-bold">Status</TableHead>
                <TableHead className="uppercase text-[11px] tracking-wider font-bold text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                    <span className="material-symbols-outlined block text-4xl mb-2 opacity-30">search_off</span>
                    No users match your search
                  </TableCell>
                </TableRow>
              ) : paginated.map((user) => {
                const role = ROLE_CONFIG[user.role] ?? { label: user.role, color: 'bg-muted text-foreground border border-border' };
                const status = STATUS_CONFIG[user.status] ?? STATUS_CONFIG['Active'];
                const deptColor = DEPT_COLOR_MAP[user.department] ?? 'bg-muted text-muted-foreground';
                const isExpanded = expandedUser === user.id;

                return (
                  <Fragment key={user.id}>
                    <TableRow
                      className={cn('hover:bg-primary/5 cursor-pointer transition-colors', isExpanded && 'bg-primary/5')}
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.photoURL}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover shadow-sm shrink-0 border border-border"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{user.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md border border-border tracking-widest">{user.rfidUid}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.department}</TableCell>
                      <TableCell>
                        <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full', role.color)}>{role.label}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn('text-sm font-semibold tabular-nums', user.balance > 0 ? 'text-green-700' : 'text-muted-foreground')}>
                          ₱{user.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full shrink-0', status.dot)} />
                          <span className={cn('text-xs font-medium', status.text)}>{status.label}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                            title="Edit"
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const origUser = users.find(u => u.uid === user.id.replace('#', '') || u.rfidUid === user.rfidUid);
                                if (origUser) {
                                  await UserService.updateUser(origUser.uid, { isActive: !origUser.isActive });
                                }
                              } catch (err) {
                                console.error('Failed to toggle user status:', err);
                              }
                            }}
                            title={user.status === 'Blocked' ? 'Unblock' : 'Block'}
                            className={cn('p-1.5 rounded-lg transition-colors', user.status === 'Blocked' ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20' : 'text-destructive hover:bg-destructive/10')}
                          >
                            <span className="material-symbols-outlined text-[17px]">{user.status === 'Blocked' ? 'lock_open' : 'block'}</span>
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setExpandedUser(isExpanded ? null : user.id); }}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <span className="material-symbols-outlined text-[17px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <TableRow key={`${user.id}-detail`} className="bg-primary/5 hover:bg-primary/5">
                        <TableCell colSpan={7} className="px-5 pb-4 pt-0">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-1 pt-3 border-t border-primary/10">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Email</p>
                              <p className="text-xs text-primary">{user.email}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Phone</p>
                              <p className="text-xs font-mono">{user.phone}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Joined</p>
                              <p className="text-xs">{user.joined}</p>
                            </div>
                            <div className="flex items-end gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setShowTopUpModal(true);
                                }}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1 h-7 px-3"
                              >
                                <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                Top Up
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setShowHistoryModal(true);
                                }}
                                className="text-xs gap-1 h-7 px-3"
                              >
                                <span className="material-symbols-outlined text-[14px]">history</span>
                                History
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} users
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
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
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Button>
          </div>
        </div>
      </Card>
      </>
      )}

      {activeTab === 'pending_topups' && (
        <Card className="shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Pending Kiosk Top-up Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Approve or reject requests submitted from the kiosk.</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="uppercase text-[11px] tracking-wider font-bold pl-5">User</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider font-bold">RFID UID</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider font-bold">Requested Amount</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider font-bold">Time</TableHead>
                  <TableHead className="uppercase text-[11px] tracking-wider font-bold text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTopups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground text-sm">
                      <span className="material-symbols-outlined block text-4xl mb-2 opacity-30">check_circle</span>
                      No pending top-up requests
                    </TableCell>
                  </TableRow>
                ) : pendingTopups.map((topup) => {
                  const date = topup.createdAt?.toDate ? topup.createdAt.toDate() : new Date();
                  return (
                    <TableRow key={topup.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="pl-5 font-semibold text-sm">
                        {topup.userName}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md border border-border tracking-widest">{topup.rfidUid}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          ₱{topup.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                            onClick={() => {
                              setSelectedTopup(topup);
                              setShowRejectModal(true);
                            }}
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                            onClick={() => {
                              setSelectedTopup(topup);
                              setShowApproveModal(true);
                            }}
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedTopup && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowApproveModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl">check_circle</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Approve Top-up</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to approve this <strong>₱{selectedTopup.amount.toFixed(2)}</strong> top-up request from <strong>{selectedTopup.userName}</strong>?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowApproveModal(false)} disabled={isProcessingTopup}>Cancel</Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleApproveTopup} disabled={isProcessingTopup}>
                  {isProcessingTopup ? 'Processing...' : 'Yes, Approve'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTopup && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowRejectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Reject Top-up</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to reject this <strong>₱{selectedTopup.amount.toFixed(2)}</strong> top-up request from <strong>{selectedTopup.userName}</strong>?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)} disabled={isProcessingTopup}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleRejectTopup} disabled={isProcessingTopup}>
                  {isProcessingTopup ? 'Processing...' : 'Yes, Reject'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Register User Modal */}
      {showRegisterModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowRegisterModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Register New User</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Add a new user to the system</p>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <form className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-2 block">
                        Full Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Juan Dela Cruz"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        Email Address <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="email@ndkc.edu.ph"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        Phone Number <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+63 912 345 6789"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        RFID UID <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 0123456789"
                        value={newUser.rfidUid}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setNewUser({ ...newUser, rfidUid: val });
                        }}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Scan RFID card to auto-fill (10-digit number)</p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      >
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-2 block">
                        Department <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={newUser.department}
                        onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                      >
                        <option value="" disabled>Select Department</option>
                        <option value="College of Engineering and Computer Education (CECE)">
                          College of Engineering and Computer Education (CECE)
                        </option>
                        <option value="College of Business Administration (CBA)">
                          College of Business Administration (CBA)
                        </option>
                        <option value="College of Teacher Education, Liberal Arts, and Nursing (CTELAN)">
                          College of Teacher Education, Liberal Arts, and Nursing (CTELAN)
                        </option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-2 block">Profile Photo</label>
                      <div className="flex items-center gap-4">
                        {/* Avatar preview */}
                        <div className="relative w-20 h-20 rounded-full border-2 border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={newUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newUser.name || 'U')}&backgroundColor=c0aede`}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          {isUploadingNewPhoto && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="material-symbols-outlined animate-spin text-white text-[20px]">progress_activity</span>
                            </div>
                          )}
                        </div>
                        {/* Upload controls */}
                        <div className="flex-1 space-y-2">
                          <label
                            htmlFor="new-user-photo-upload"
                            className={cn(
                              'flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-medium cursor-pointer hover:bg-primary/10 transition-all',
                              isUploadingNewPhoto && 'opacity-50 pointer-events-none'
                            )}
                          >
                            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                            {isUploadingNewPhoto ? 'Uploading…' : 'Upload Photo'}
                          </label>
                          <input
                            id="new-user-photo-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleNewUserPhotoUpload}
                          />
                          <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP. Hosted on Cloudinary.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0">info</span>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">Account Creation</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        The user will receive a welcome email with instructions to set up their password and access the system.
                      </p>
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={async () => {
                    try {
                      if (!newUser.email || !newUser.name) {
                        alert('Please fill in required fields (name, email)');
                        return;
                      }
                      if (!newUser.rfidUid || newUser.rfidUid.length !== 10) {
                        alert('RFID UID must be exactly a 10-digit number');
                        return;
                      }
                      if (!newUser.department) {
                        alert('Please select a department');
                        return;
                      }
                      const tempPassword = Math.random().toString(36).slice(-8) + 'Temp1!';
                      await AuthService.createUser(newUser.email, tempPassword, {
                        name: newUser.name,
                        role: newUser.role as any,
                        department: newUser.department,
                        phoneNumber: newUser.phone,
                        rfidUid: newUser.rfidUid,
                        photoURL: newUser.photoURL || undefined,
                      });
                      setShowRegisterModal(false);
                      setNewUser({ name: '', email: '', rfidUid: '', department: '', role: 'faculty', phone: '', photoURL: '' });
                      alert(`User registered successfully! Temporary password: ${tempPassword}`);
                    } catch (err: any) {
                      console.error('Registration error:', err);
                      alert(`Registration failed: ${err.message}`);
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Register User
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Edit User</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedUser.name}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <form className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-2 block">Full Name</label>
                      <input
                        type="text"
                        value={editUserName}
                        onChange={(e) => setEditUserName(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Email Address</label>
                      <input
                        type="email"
                        value={editUserEmail}
                        disabled
                        className="w-full px-4 py-3 text-sm bg-muted border border-border rounded-xl focus:outline-none cursor-not-allowed opacity-80"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Phone Number</label>
                      <input
                        type="tel"
                        value={editUserPhone}
                        onChange={(e) => setEditUserPhone(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">RFID UID</label>
                      <input
                        type="text"
                        placeholder="e.g., 0123456789"
                        value={editUserRfidUid}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setEditUserRfidUid(val);
                        }}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Role</label>
                      <select
                        value={editUserRole}
                        onChange={(e) => setEditUserRole(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      >
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-2 block">Department</label>
                      <select
                        value={editUserDept}
                        onChange={(e) => setEditUserDept(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      >
                        <option value="" disabled>Select Department</option>
                        {editUserDept &&
                          !['College of Engineering and Computer Education (CECE)',
                            'College of Business Administration (CBA)',
                            'College of Teacher Education, Liberal Arts, and Nursing (CTELAN)'].includes(editUserDept) && (
                            <option value={editUserDept}>{editUserDept}</option>
                          )
                        }
                        <option value="College of Engineering and Computer Education (CECE)">
                          College of Engineering and Computer Education (CECE)
                        </option>
                        <option value="College of Business Administration (CBA)">
                          College of Business Administration (CBA)
                        </option>
                        <option value="College of Teacher Education, Liberal Arts, and Nursing (CTELAN)">
                          College of Teacher Education, Liberal Arts, and Nursing (CTELAN)
                        </option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm font-semibold mb-2 block">Profile Photo</label>
                      <div className="flex items-center gap-4">
                        {/* Avatar preview */}
                        <div className="relative w-20 h-20 rounded-full border-2 border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={editUserPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editUserName || 'U')}&backgroundColor=c0aede`}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          {isUploadingEditPhoto && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="material-symbols-outlined animate-spin text-white text-[20px]">progress_activity</span>
                            </div>
                          )}
                        </div>
                        {/* Upload controls */}
                        <div className="flex-1 space-y-2">
                          <label
                            htmlFor="edit-user-photo-upload"
                            className={cn(
                              'flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-sm font-medium cursor-pointer hover:bg-primary/10 transition-all',
                              isUploadingEditPhoto && 'opacity-50 pointer-events-none'
                            )}
                          >
                            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                            {isUploadingEditPhoto ? 'Uploading…' : 'Change Photo'}
                          </label>
                          <input
                            id="edit-user-photo-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleEditUserPhotoUpload}
                          />
                          <p className="text-[11px] text-muted-foreground">JPEG, PNG or WebP. Hosted on Cloudinary.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={async () => {
                    try {
                      if (editUserRfidUid && editUserRfidUid.length !== 10) {
                        alert('RFID UID must be exactly a 10-digit number');
                        return;
                      }
                      if (!editUserDept) {
                        alert('Please select a department');
                        return;
                      }
                      const origUser = users.find(u => u.uid === selectedUser.id.replace('#', '') || u.rfidUid === selectedUser.rfidUid);
                      if (origUser) {
                        await UserService.updateUser(origUser.uid, {
                          name: editUserName,
                          phoneNumber: editUserPhone,
                          department: editUserDept,
                          rfidUid: editUserRfidUid,
                          role: editUserRole as any,
                          photoURL: editUserPhoto || undefined,
                        });
                      }
                      setShowEditModal(false);
                      setSelectedUser(null);
                      alert('User updated successfully');
                    } catch (err: any) {
                      console.error('Update error:', err);
                      alert(`Update failed: ${err.message}`);
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Up Modal */}
      {showTopUpModal && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              if (!isProcessingTopup) setShowTopUpModal(false);
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Top Up Credits</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedUser.name}</p>
                </div>
                <button
                  onClick={() => {
                    if (!isProcessingTopup) setShowTopUpModal(false);
                  }}
                  disabled={isProcessingTopup}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-muted/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ₱{selectedUser.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Amount to Add <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    disabled={isProcessingTopup}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono text-lg disabled:opacity-50"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[100, 200, 500].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopUpAmount(amount.toString())}
                      disabled={isProcessingTopup}
                      className="px-3 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all disabled:opacity-50"
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Note (Optional)
                  </label>
                  <textarea
                    placeholder="Add a note for this top-up..."
                    value={topUpNote}
                    onChange={(e) => setTopUpNote(e.target.value)}
                    disabled={isProcessingTopup}
                    className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 resize-none"
                    rows={2}
                  />
                </div>

                {topUpAmount && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">New Balance:</span>
                      <span className="text-xl font-bold text-primary">
                        ₱{(selectedUser.balance + parseFloat(topUpAmount || '0')).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                    setShowTopUpModal(false); 
                    setTopUpAmount('');
                    setTopUpNote('');
                  }}
                  disabled={isProcessingTopup}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  disabled={isProcessingTopup}
                  onClick={async () => {
                    try {
                      if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
                        alert('Please enter a valid amount greater than 0');
                        return;
                      }
                      
                      if (!loggedInUser) {
                        throw new Error('Please log in to perform top-ups');
                      }

                      if (!loggedInUser.uid || !loggedInUser.name) {
                        throw new Error('Invalid admin information. Please log in again.');
                      }
                      
                      setIsProcessingTopup(true);
                      
                      // Use selectedUser data directly (already loaded from Firestore)
                      const userId = selectedUser.id.replace('#', '') || selectedUser.rfidUid;
                      
                      // Call the top-up service with all required parameters
                      await TopupService.adminManualTopup(
                        userId,
                        selectedUser.name,
                        selectedUser.rfidUid,
                        selectedUser.photoURL,
                        parseFloat(topUpAmount),
                        loggedInUser.uid,
                        loggedInUser.name,
                        topUpNote || undefined
                      );
                      
                      setShowTopUpModal(false);
                      setTopUpAmount('');
                      setTopUpNote('');
                      setSelectedUser(null);
                      alert(`₱${parseFloat(topUpAmount).toFixed(2)} top-up successfully added to ${selectedUser.name}`);
                    } catch (err: any) {
                      console.error('Top-up error:', err);
                      alert(`Top-up failed: ${err.message}`);
                    } finally {
                      setIsProcessingTopup(false);
                    }
                  }}
                  
                >
                  {isProcessingTopup ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Credits
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowHistoryModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                <div>
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedUser.name} - {selectedUser.id}</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-muted-foreground">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="space-y-3">
                  {[
                    { id: 'TXN-048', date: 'Today, 14:30', items: 'Coffee x2, Biscuit', amount: 125, type: 'Purchase' },
                    { id: 'TXN-042', date: 'Yesterday, 11:20', items: 'Top Up', amount: 500, type: 'Credit' },
                    { id: 'TXN-035', date: 'Jun 05, 2024', items: 'Instant Noodles, Water', amount: 80, type: 'Purchase' },
                    { id: 'TXN-028', date: 'Jun 03, 2024', items: 'Notebook, Pen', amount: 120, type: 'Purchase' },
                    { id: 'TXN-020', date: 'Jun 01, 2024', items: 'Top Up', amount: 1000, type: 'Credit' },
                  ].map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-muted/40 transition-colors">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tx.type === 'Credit' ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400' : 'bg-primary/10 text-primary')}>
                        <span className="material-symbols-outlined text-[20px]">
                          {tx.type === 'Credit' ? 'add_circle' : 'shopping_cart'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{tx.items}</p>
                        <p className="text-xs text-muted-foreground">{tx.id} • {tx.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn('font-mono font-bold text-sm', tx.type === 'Credit' ? 'text-green-600 dark:text-green-400' : 'text-foreground')}>
                          {tx.type === 'Credit' ? '+' : '-'}₱{tx.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{tx.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border bg-muted/20">
                <Button variant="outline" className="w-full" onClick={() => setShowHistoryModal(false)}>
                  Close
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
