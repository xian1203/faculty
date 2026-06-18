import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useTheme } from 'next-themes';
import { RealtimeSettingsService, SettingsService } from '@/firebase';
import type { HonestySetting } from '@/firebase/types';

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div className={cn(
      'w-10 h-5 rounded-full relative transition-colors',
      enabled ? 'bg-primary' : 'bg-muted-foreground/30'
    )}>
      <div className={cn(
        'absolute top-1 w-3 h-3 bg-white rounded-full transition-all',
        enabled ? 'right-1' : 'left-1'
      )} />
    </div>
  );
}

export function SettingsDashboard() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeLabel = mounted && theme ? (theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System') : 'Loading...';

  const sections = [
    {
      icon: 'person',
      label: 'Admin Profile',
      href: '/settings/profile',
      status: 'Configured',
      statusColor: 'text-green-600 bg-green-50',
      detail: 'John Dominic Admin · admin@ndkc.edu.ph',
    },
    {
      icon: 'group_add',
      label: 'User Roles',
      href: '/settings/users',
      status: '3 Roles',
      statusColor: 'text-blue-600 bg-blue-50',
      detail: '156 total users · 12 pending RFID',
    },
    {
      icon: 'account_balance_wallet',
      label: 'Honesty System',
      href: '/settings/honesty',
      status: 'Active',
      statusColor: 'text-green-600 bg-green-50',
      detail: 'Max debt ₱500 · 30-day settlement',
    },
    {
      icon: 'contactless',
      label: 'RFID Settings',
      href: '/settings/rfid',
      status: 'Auto-Login',
      statusColor: 'text-amber-700 bg-amber-50',
      detail: 'Delay 350ms · Duplicate protection on',
    },
    {
      icon: 'inventory_2',
      label: 'Inventory Config',
      href: '/settings/inventory',
      status: 'Configured',
      statusColor: 'text-green-600 bg-green-50',
      detail: 'Low stock alert at <10 units',
    },
    {
      icon: 'point_of_sale',
      label: 'POS Settings',
      href: '/settings/pos',
      status: '2 Methods',
      statusColor: 'text-blue-600 bg-blue-50',
      detail: 'RFID Debt · Cash · E-Wallet disabled',
    },
    {
      icon: 'notifications',
      label: 'Notifications',
      href: '/settings/notifications',
      status: 'Email On',
      statusColor: 'text-green-600 bg-green-50',
      detail: 'Daily report · Low stock alerts',
    },
    {
      icon: 'settings',
      label: 'Preferences',
      href: '/settings/preferences',
      status: themeLabel,
      statusColor: 'text-muted-foreground bg-muted',
      detail: 'Timezone: Asia/Manila (GMT+8)',
    },
    {
      icon: 'security',
      label: 'Security & Audit',
      href: '/settings/security',
      status: '2FA Off',
      statusColor: 'text-amber-700 bg-amber-50',
      detail: 'Timeout 2h · Brute-force lock enabled',
    },
    {
      icon: 'backup',
      label: 'Data Backup',
      href: '/settings/backup',
      status: 'Synced',
      statusColor: 'text-green-600 bg-green-50',
      detail: 'Last backup: Today, 03:00 AM',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Settings Overview</h3>
        <p className="text-sm text-muted-foreground">Quick glance at your system configuration status.</p>
      </div>
      <Separator />

      {/* System Health Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl bg-green-50 border border-green-200">
        <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-green-800">System Operational</p>
          <p className="text-xs text-green-700 mt-0.5">All core services are running normally. Last checked: Today, 06:00 AM.</p>
        </div>
        <div className="flex gap-6 text-center shrink-0">
          <div>
            <p className="text-2xl font-bold text-green-800">156</p>
            <p className="text-[10px] text-green-700 uppercase font-bold tracking-wide">Users</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">12</p>
            <p className="text-[10px] text-amber-700 uppercase font-bold tracking-wide">Pending RFID</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-800">3</p>
            <p className="text-[10px] text-green-700 uppercase font-bold tracking-wide">Roles</p>
          </div>
        </div>
      </div>

      {/* Settings Sections Grid */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Configuration Areas</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((s) => (
            <Link
              key={s.label}
              to={s.href}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm">{s.label}</p>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', s.statusColor)}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.detail}</p>
              </div>
              <span className="material-symbols-outlined text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsProfile() {
  const [fullName, setFullName] = useState('John Dominic Admin');
  const [email, setEmail] = useState('admin@ndkc.edu.ph');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handleSaveProfile = () => {
    // TODO: Integrate with Firebase to save profile changes
    console.log('Saving profile:', { fullName, email });
    alert('Profile updated successfully!');
  };

  const handlePhotoUpload = () => {
    // TODO: Integrate with Firebase Storage for photo upload
    setShowPhotoModal(false);
    alert('Photo upload functionality will be available after Firebase integration');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Admin Profile</h3>
        <p className="text-sm text-muted-foreground">Manage your personal account settings and security.</p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your photo and personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div
              className="w-24 h-24 rounded-full bg-primary/10 overflow-hidden border-4 border-background shadow-sm shrink-0 relative group cursor-pointer"
              onClick={() => setShowPhotoModal(true)}
            >
              <img
                alt="Admin Avatar"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9KCjjKtarD6c2dC5CotC2g9A2Tcq60dmDWySO8dKe79YMters-zH3frURpX93C55Hjp9FcinFqJ73FfPPEvuPhb64e_zeyThgSFcnbiez4FF_jxi3eMeJsYIdz4fpKeSwK3rsuYZ5EeZK_ro_J_cFPshpP3_cTh3NlqH4-DtBebe7hYTMkchSHSTGwfSqf7bAHF_fbUuw0pll1l-l5fpxYpHhevAVxW2R20xVsXKsB4XGV4z1QeO4I6T5Hxsn-Pyfxo0zOJRrle7q"
              />
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
                <span className="material-symbols-outlined text-white">photo_camera</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 max-w-md">
              <div className="grid gap-1">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveProfile}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold">Change Profile Photo</h3>
              <p className="text-sm text-muted-foreground mt-1">Upload a new profile picture</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">upload_file</span>
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowPhotoModal(false)}>Cancel</Button>
              <Button onClick={handlePhotoUpload}>Upload Photo</Button>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
          <CardDescription>Recent activity on your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-muted-foreground">computer</span>
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-muted-foreground text-xs">Mac OS • Chrome</p>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <p className="font-mono text-xs">Started: Oct 24, 2023 • 08:45 AM</p>
              <p className="text-xs text-green-600 font-medium mt-1">Active Now</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsUsers() {
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const roles = [
    { name: 'Super Admin', desc: 'Full access to all system features and settings.', users: 2, color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300', permissions: ['all'] },
    { name: 'Store Manager', desc: 'Can manage inventory, products, and view reports.', users: 5, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', permissions: ['inventory', 'products', 'reports'] },
    { name: 'Cashier', desc: 'Access to POS system and basic transactions only.', users: 12, color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', permissions: ['pos', 'transactions'] }
  ];

  const [permissions, setPermissions] = useState({
    dashboard: false,
    products: false,
    inventory: false,
    transactions: false,
    users: false,
    reports: false,
    settings: false,
    pos: false,
  });

  const handleAddRole = () => {
    // TODO: Integrate with Firebase to add new role
    console.log('Adding role:', newRole);
    setShowAddRoleModal(false);
    setNewRole({ name: '', description: '' });
    alert('Role added successfully!');
  };

  const handleEditPrivileges = (role: any) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleSavePrivileges = () => {
    // TODO: Integrate with Firebase to save privileges
    console.log('Saving privileges for:', selectedRole?.name, permissions);
    setShowEditModal(false);
    alert('Privileges updated successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">User Roles</h3>
          <p className="text-sm text-muted-foreground">Manage permissions and system access levels.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddRoleModal(true)}>
          <span className="material-symbols-outlined text-sm">add</span>
          Add Role
        </Button>
      </div>
      <Separator />

      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
            <div className="space-y-1 mb-4 sm:mb-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{role.name}</h4>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', role.color)}>
                  {role.users} Users
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{role.desc}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEditPrivileges(role)}>
                Edit Privileges
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold">Add New Role</h3>
              <p className="text-sm text-muted-foreground mt-1">Create a new user role with custom permissions</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name <span className="text-red-500">*</span></Label>
                <Input
                  id="roleName"
                  placeholder="e.g., Inventory Manager"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="roleDesc">Description <span className="text-red-500">*</span></Label>
                <Input
                  id="roleDesc"
                  placeholder="Brief description of role responsibilities"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowAddRoleModal(false)}>Cancel</Button>
              <Button onClick={handleAddRole} disabled={!newRole.name || !newRole.description}>
                Create Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Privileges Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-bold">Edit Privileges: {selectedRole.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">Configure what this role can access</p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(permissions).map((perm) => (
                  <div key={perm} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <Label htmlFor={perm} className="capitalize cursor-pointer flex-1">
                      {perm.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Switch
                      id={perm}
                      checked={permissions[perm as keyof typeof permissions]}
                      onCheckedChange={(checked) => setPermissions({ ...permissions, [perm]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleSavePrivileges}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsHonesty() {
  const [debtLimit, setDebtLimit] = useState('500');
  const [settlementDays, setSettlementDays] = useState('30');
  const [autoBlock, setAutoBlock] = useState(true);
  const [eligibility, setEligibility] = useState({
    faculty: true,
  });

  // Loading and error states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time settings on mount
  useEffect(() => {
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = RealtimeSettingsService.subscribeToHonestySetting(
      (settings) => {
        // Update UI with settings from Firestore
        setDebtLimit(settings.maxDebtLimit.toString());
        setSettlementDays(settings.settlementDeadlineDays.toString());
        setAutoBlock(settings.autoBlockOverdueAccounts);

        // Parse creditEligibility array
        setEligibility({
          faculty: settings.creditEligibility.includes('Faculty'),
        });
      },
      (err) => {
        console.error('Error loading honesty settings:', err);
        setError('Failed to load settings. Using defaults.');
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const validateInputs = (): string | null => {
    // Validate debt limit
    const debtLimitNum = parseFloat(debtLimit);
    if (isNaN(debtLimitNum) || debtLimitNum < 0) {
      return 'Max Debt Limit must be a valid number >= 0';
    }

    // Validate settlement days
    const settlementDaysNum = parseInt(settlementDays, 10);
    if (isNaN(settlementDaysNum) || settlementDaysNum <= 0) {
      return 'Settlement Deadline must be a valid number > 0';
    }

    // Validate credit eligibility
    const selectedRoles = Object.entries(eligibility)
      .filter(([_, checked]) => checked)
      .map(([role]) => role.charAt(0).toUpperCase() + role.slice(1));

    if (selectedRoles.length === 0) {
      return 'At least one Credit Eligibility role must be selected';
    }

    return null;
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Validate inputs
      const validationError = validateInputs();
      if (validationError) {
        alert(validationError);
        return;
      }

      setIsSaving(true);

      // Prepare data to save
      const creditEligibilityArray = Object.entries(eligibility)
        .filter(([_, checked]) => checked)
        .map(([role]) => role.charAt(0).toUpperCase() + role.slice(1));

      const settingsToSave: Omit<HonestySetting, 'updatedAt'> = {
        maxDebtLimit: parseFloat(debtLimit),
        settlementDeadlineDays: parseInt(settlementDays, 10),
        autoBlockOverdueAccounts: autoBlock,
        creditEligibility: creditEligibilityArray,
      };

      // Save to Firestore
      await SettingsService.saveHonestySetting(settingsToSave);

      alert('Honesty system settings saved successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving honesty settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Honesty System</h3>
          <p className="text-sm text-muted-foreground">Configure the core parameters of the store's credit system.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <span className="material-symbols-outlined text-sm">{isSaving ? 'hourglass_empty' : 'save'}</span>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <Separator />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
          <p className="text-sm text-red-700 dark:text-red-300">
            <span className="font-semibold">Error:</span> {error}
          </p>
        </div>
      )}

      <section className="relative overflow-hidden p-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_balance_wallet
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-primary">Debt Rules & Limits</h3>
            <p className="text-sm text-muted-foreground">Set global rules for borrowing items.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Debt Limit */}
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-sm p-6 rounded-xl border border-border shadow-sm">
            <label className="block text-xs font-bold mb-2 uppercase text-primary tracking-wide">Max Debt Limit</label>
            <div className="flex items-center gap-3">
              <span className="text-xl font-mono font-bold">₱</span>
              <input
                type="number"
                value={debtLimit}
                onChange={(e) => setDebtLimit(e.target.value)}
                disabled={isSaving}
                className="w-full text-xl font-bold bg-transparent border-b-2 border-primary/30 focus:border-primary outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground italic">
              Users cannot purchase items on credit if they exceed this amount.
            </p>
          </div>

          {/* Settlement Deadline */}
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-sm p-6 rounded-xl border border-border shadow-sm">
            <label className="block text-xs font-bold mb-2 uppercase text-primary tracking-wide">Settlement Deadline</label>
            <Select value={settlementDays} onValueChange={setSettlementDays} disabled={isSaving}>
              <SelectTrigger className="bg-muted/50 border-none disabled:opacity-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 Days</SelectItem>
                <SelectItem value="30">30 Days (End of Month)</SelectItem>
                <SelectItem value="45">45 Days</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 flex items-center gap-2">
              <Checkbox
                id="auto-block"
                checked={autoBlock}
                onCheckedChange={(checked) => setAutoBlock(checked as boolean)}
                disabled={isSaving}
                className="text-primary border-primary disabled:opacity-50"
              />
              <label htmlFor="auto-block" className="text-sm cursor-pointer">Auto-block overdue accounts</label>
            </div>
          </div>

          {/* Credit Eligibility */}
          <div className="bg-white/80 dark:bg-black/50 backdrop-blur-sm p-6 rounded-xl border border-border shadow-sm flex flex-col justify-between">
            <label className="block text-xs font-bold mb-3 uppercase text-primary tracking-wide">Credit Eligibility</label>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span>Faculty</span>
                <button 
                  onClick={() => setEligibility({ ...eligibility, faculty: !eligibility.faculty })}
                  disabled={isSaving}
                  className="disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Toggle enabled={eligibility.faculty} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SettingsRfid() {
  const [scanningMode, setScanningMode] = useState<'auto' | 'tap'>('auto');
  const [delayValue, setDelayValue] = useState(350);

  const handleSave = () => {
    // TODO: Integrate with Firebase to save RFID settings
    console.log('Saving RFID settings:', { scanningMode, delayValue });
    alert('RFID settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">RFID Settings</h3>
          <p className="text-sm text-muted-foreground">Configure the hardware scanner behavior and timings.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <span className="material-symbols-outlined text-sm">save</span>
          Save Changes
        </Button>
      </div>
      <Separator />

      <section className="p-6 rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 dark:border-amber-900 space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <span className="material-symbols-outlined">sensors</span>
          </div>
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-500">RFID Reader Config</h3>
        </div>

        <div className="space-y-4">
          {/* Scanning Mode */}
          <div className="bg-background p-4 rounded-lg border border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Scanning Mode</p>
              <p className="text-xs text-muted-foreground">Choose how the system handles card taps.</p>
            </div>
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              <button
                onClick={() => setScanningMode('auto')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-all',
                  scanningMode === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                )}
              >
                Auto-Login
              </button>
              <button
                onClick={() => setScanningMode('tap')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-all',
                  scanningMode === 'tap' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                )}
              >
                Tap-to-Confirm
              </button>
            </div>
          </div>

          {/* Duplicate Protection Delay */}
          <div className="bg-background p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-bold">Duplicate Protection Delay</p>
              <span className="text-primary font-mono text-sm font-bold">{delayValue}ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={delayValue}
              onChange={(e) => setDelayValue(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Sensitive</span>
              <span>Standard</span>
              <span>High Latency</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function SettingsInventory() {
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [outOfStockProtection, setOutOfStockProtection] = useState(true);

  const handleSave = () => {
    // TODO: Integrate with Firebase to save inventory settings
    console.log('Saving inventory settings:', { lowStockThreshold, outOfStockProtection });
    alert('Inventory settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Inventory Config</h3>
          <p className="text-sm text-muted-foreground">Manage stock alerts, rules, and tracking parameters.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <span className="material-symbols-outlined text-sm">save</span>
          Save Changes
        </Button>
      </div>
      <Separator />

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Stock Thresholds</CardTitle>
            <CardDescription>Configure when to trigger low stock warnings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Global Low Stock Alert</Label>
                <p className="text-sm text-muted-foreground">Default threshold for all items</p>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Out of Stock Protection</Label>
                <p className="text-sm text-muted-foreground">Prevent sales when stock reaches 0</p>
              </div>
              <Switch
                checked={outOfStockProtection}
                onCheckedChange={(checked) => setOutOfStockProtection(checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SettingsPos() {
  const [paymentMethods, setPaymentMethods] = useState({
    rfidDebt: true,
    cash: true,
    ewallet: false,
  });

  const handleSave = () => {
    // TODO: Integrate with Firebase to save POS settings
    console.log('Saving POS settings:', paymentMethods);
    alert('POS settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">POS Settings</h3>
          <p className="text-sm text-muted-foreground">Point of sale interface and receipt configurations.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <span className="material-symbols-outlined text-sm">save</span>
          Save Changes
        </Button>
      </div>
      <Separator />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Enable or disable acceptable forms of payment at checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">contactless</span>
              <div>
                <p className="font-semibold">RFID Debt</p>
                <p className="text-sm text-muted-foreground">Purchase via employee honesty account</p>
              </div>
            </div>
            <Switch
              checked={paymentMethods.rfidDebt}
              onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, rfidDebt: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-600">payments</span>
              <div>
                <p className="font-semibold">Cash</p>
                <p className="text-sm text-muted-foreground">Standard cash transaction</p>
              </div>
            </div>
            <Switch
              checked={paymentMethods.cash}
              onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, cash: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600">account_balance_wallet</span>
              <div>
                <p className="font-semibold">E-Wallet (GCash/PayMaya)</p>
                <p className="text-sm text-muted-foreground">QR code based digital payments</p>
              </div>
            </div>
            <Switch
              checked={paymentMethods.ewallet}
              onCheckedChange={(checked) => setPaymentMethods({ ...paymentMethods, ewallet: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsNotifications() {
  const [notifications, setNotifications] = useState({
    emailDaily: true,
    emailStock: true,
    smsCritical: false,
    smsStock: false,
  });

  const handleSave = () => {
    // TODO: Integrate with Firebase to save notification settings
    console.log('Saving notification settings:', notifications);
    alert('Notification settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Notifications</h3>
          <p className="text-sm text-muted-foreground">Configure system alerts and reports delivery.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <span className="material-symbols-outlined text-sm">save</span>
          Save Changes
        </Button>
      </div>
      <Separator />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Alert Channels</CardTitle>
          <CardDescription>How would you like to receive system notifications?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Email Alerts</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-daily">Daily Summary Report</Label>
              <Switch
                id="email-daily"
                checked={notifications.emailDaily}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailDaily: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-stock">Low Stock Warnings</Label>
              <Switch
                id="email-stock"
                checked={notifications.emailStock}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailStock: checked })}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">SMS Alerts</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-critical">Critical System Errors</Label>
              <Switch
                id="sms-critical"
                checked={notifications.smsCritical}
                onCheckedChange={(checked) => setNotifications({ ...notifications, smsCritical: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-stock">Out of Stock Immediate Alert</Label>
              <Switch
                id="sms-stock"
                checked={notifications.smsStock}
                onCheckedChange={(checked) => setNotifications({ ...notifications, smsStock: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPreferences() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Preferences</h3>
        <p className="text-sm text-muted-foreground">Customize your dashboard appearance and localization.</p>
      </div>
      <Separator />

      <Card className="max-w-3xl">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Theme Preference</Label>
            <p className="text-xs text-muted-foreground mb-3">Choose how the dashboard appears</p>
            {!mounted ? (
              <div className="flex items-center gap-4">
                <Button variant="outline" className="w-32 gap-2 text-muted-foreground" disabled>
                  <span className="material-symbols-outlined text-sm">light_mode</span>
                  Light
                </Button>
                <Button variant="outline" className="w-32 gap-2 text-muted-foreground" disabled>
                  <span className="material-symbols-outlined text-sm">dark_mode</span>
                  Dark
                </Button>
                <Button variant="outline" className="w-32 gap-2 text-muted-foreground" disabled>
                  <span className="material-symbols-outlined text-sm">hdr_auto</span>
                  System
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setTheme('light')}
                  className={cn(
                    'w-32 gap-2',
                    theme === 'light' ? 'border-primary/50 bg-primary/5 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <span className="material-symbols-outlined text-sm">light_mode</span>
                  Light
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'w-32 gap-2',
                    theme === 'dark' ? 'border-primary/50 bg-primary/5 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <span className="material-symbols-outlined text-sm">dark_mode</span>
                  Dark
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTheme('system')}
                  className={cn(
                    'w-32 gap-2',
                    theme === 'system' ? 'border-primary/50 bg-primary/5 text-primary' : 'text-muted-foreground'
                  )}
                >
                  <span className="material-symbols-outlined text-sm">hdr_auto</span>
                  System
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Timezone</Label>
            <Select defaultValue="asia-manila">
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asia-manila">Asia/Manila (GMT+8)</SelectItem>
                <SelectItem value="utc">UTC</SelectItem>
                <SelectItem value="america-ny">America/New_York (GMT-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsSecurity() {
  const [sessionTimeout, setSessionTimeout] = useState('2h');
  const [require2FA, setRequire2FA] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const mockAuditLogs = [
    { timestamp: '2026-06-08 14:23:15', user: 'admin@ndkc.edu.ph', action: 'Login', status: 'Success', ip: '192.168.1.100' },
    { timestamp: '2026-06-08 12:45:32', user: 'manager@ndkc.edu.ph', action: 'Product Update', status: 'Success', ip: '192.168.1.105' },
    { timestamp: '2026-06-08 11:12:44', user: 'unknown@example.com', action: 'Login', status: 'Failed', ip: '203.128.45.76' },
    { timestamp: '2026-06-08 09:34:21', user: 'admin@ndkc.edu.ph', action: 'Settings Change', status: 'Success', ip: '192.168.1.100' },
    { timestamp: '2026-06-07 18:55:12', user: 'cashier@ndkc.edu.ph', action: 'Transaction', status: 'Success', ip: '192.168.1.110' },
  ];

  const handleSave = () => {
    // TODO: Integrate with Firebase to save security settings
    console.log('Saving security settings:', { sessionTimeout, require2FA });
    alert('Security settings saved successfully!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight">Security & Audit</h3>
          <p className="text-sm text-muted-foreground">Session policies and system access logs.</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <span className="material-symbols-outlined text-sm">save</span>
          Save Changes
        </Button>
      </div>
      <Separator />

      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined">verified_user</span>
            <CardTitle>Access Control</CardTitle>
          </div>
          <CardDescription>Configure security protocols for admin and staff users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <Label>Session Timeout</Label>
                <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30m">30 Minutes</SelectItem>
                    <SelectItem value="2h">2 Hours</SelectItem>
                    <SelectItem value="8h">8 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between items-center text-sm">
                <Label>Require 2FA</Label>
                <Switch
                  checked={require2FA}
                  onCheckedChange={(checked) => setRequire2FA(checked)}
                />
              </div>
              <Button variant="outline" className="w-full gap-2 mt-4" onClick={() => setShowAuditLogs(true)}>
                <span className="material-symbols-outlined text-sm">list_alt</span>
                View Audit Logs
              </Button>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-700 shrink-0">info</span>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Login attempts are restricted to 5 failures per 15 minutes. Global lockout policy is enabled by default to prevent brute force attacks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Modal */}
      {showAuditLogs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">System Audit Logs</h3>
                <p className="text-sm text-muted-foreground mt-1">Recent security events and user actions</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <span className="material-symbols-outlined text-sm">download</span>
                Export CSV
              </Button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-xs font-bold uppercase text-muted-foreground">Timestamp</th>
                      <th className="text-left p-3 text-xs font-bold uppercase text-muted-foreground">User</th>
                      <th className="text-left p-3 text-xs font-bold uppercase text-muted-foreground">Action</th>
                      <th className="text-left p-3 text-xs font-bold uppercase text-muted-foreground">Status</th>
                      <th className="text-left p-3 text-xs font-bold uppercase text-muted-foreground">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockAuditLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-sm font-mono">{log.timestamp}</td>
                        <td className="p-3 text-sm">{log.user}</td>
                        <td className="p-3 text-sm">{log.action}</td>
                        <td className="p-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                            log.status === 'Success'
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          )}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-mono">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end">
              <Button onClick={() => setShowAuditLogs(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsBackup() {
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const handleExport = () => {
    // TODO: Integrate with Firebase to export database
    console.log('Exporting database...');
    alert('Database export initiated. You will receive a download link via email once complete.');
  };

  const handleRestore = () => {
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = () => {
    // TODO: Integrate with Firebase to restore database
    console.log('Restoring database...');
    setShowRestoreModal(false);
    alert('Database restoration initiated. This may take a few minutes.');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Data Backup</h3>
        <p className="text-sm text-muted-foreground">Manage database snapshots and data exports.</p>
      </div>
      <Separator />

      <section className="bg-foreground text-background p-8 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              cloud_sync
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Firestore Backup Engine</h3>
            <p className="text-sm text-background/70 mt-1">Last automated backup: Today, 03:00 AM</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <span className="material-symbols-outlined">download</span>
            Export DB
          </button>
          <button
            onClick={handleRestore}
            className="flex-1 md:flex-none px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all text-sm"
          >
            <span className="material-symbols-outlined">history</span>
            Restore
          </button>
        </div>
      </section>

      {/* Available Backups */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>Recent database snapshots ready for restoration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { date: 'Today, 03:00 AM', size: '2.4 MB', type: 'Automated' },
              { date: 'Yesterday, 03:00 AM', size: '2.3 MB', type: 'Automated' },
              { date: 'Jun 6, 2026 03:00 AM', size: '2.2 MB', type: 'Automated' },
              { date: 'Jun 5, 2026 03:00 AM', size: '2.1 MB', type: 'Manual' },
            ].map((backup, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-muted-foreground">backup</span>
                  <div>
                    <p className="text-sm font-medium">{backup.date}</p>
                    <p className="text-xs text-muted-foreground">{backup.size} • {backup.type}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Restore This</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3 text-amber-600">
                <span className="material-symbols-outlined">warning</span>
                <h3 className="text-xl font-bold">Restore Database</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to restore the database from a backup? This action will:
              </p>
              <ul className="text-sm space-y-2 ml-4 list-disc text-muted-foreground">
                <li>Overwrite current data with backup data</li>
                <li>Potentially lose recent changes made after the backup</li>
                <li>Temporarily interrupt system access during restoration</li>
              </ul>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                  This action cannot be undone. Make sure you have a recent backup before proceeding.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRestoreModal(false)}>Cancel</Button>
              <Button onClick={handleConfirmRestore} className="bg-amber-600 hover:bg-amber-700">
                Confirm Restore
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
