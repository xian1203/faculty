/// <reference types="vite/client" />
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
import { RealtimeProductService, Product, ProductService } from '../../firebase';

// Transform Firestore Product to UI format
const CATEGORY_MAP: Record<string, string> = {
  'Snacks & Quick Food': 'Snacks',
  'Personal & Office Essentials': 'Personal Essentials',
};

function transformProduct(product: Product) {
  const category = CATEGORY_MAP[product.category] || product.category;
  return {
    id: product.id, // Always use unique database ID for React keys
    sku: product.sku || 'N/A', // SKU separately if needed for display
    dbId: product.id,
    name: product.name,
    description: product.description || '',
    category: category,
    price: product.price,
    qty: product.stock,
    status: product.status === 'in_stock' ? 'In Stock' : product.status === 'low_stock' ? 'Low Stock' : 'Out of Stock',
    image: product.imageUrl || 'https://via.placeholder.com/150',
    rawImageUrl: product.imageUrl || '',
  };
}

const CATEGORIES = ['All', 'Snacks', 'Foods', 'Drinks', 'Personal Essentials', 'Office Essentials'];
const STATUSES = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  'In Stock':     { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  'Low Stock':    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200' },
  'Out of Stock': { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    border: 'border-red-200'   },
};

const CATEGORY_ICONS: Record<string, string> = {
  Snacks: 'cookie',
  Foods: 'restaurant',
  Drinks: 'local_cafe',
  'Personal Essentials': 'clean_hands',
  'Office Essentials': 'work',
};

function StockBar({ qty, max = 50 }: { qty: number; max?: number }) {
  const pct = Math.min((qty / max) * 100, 100);
  const color = qty === 0 ? 'bg-red-500' : qty <= 8 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-6 text-right">{qty}</span>
    </div>
  );
}

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [selected, setSelected] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: 'Drinks',
    price: '',
    qty: '',
    sku: '',
    imageUrl: '',
  });

  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editImage, setEditImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingNewImage, setIsUploadingNewImage] = useState(false);
  
  // Real-time data state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const PAGE_SIZE = 6;

  // Subscribe to real-time products
  useEffect(() => {
    const unsubscribe = RealtimeProductService.subscribeToProducts((productList) => {
      setProducts(productList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync edit states when selected product changes
  useEffect(() => {
    if (selected) {
      setEditName(selected.name || '');
      setEditPrice(selected.price?.toString() || '');
      setEditQty(selected.qty?.toString() || '');
      setEditCategory(selected.category || '');
      setEditImage(selected.rawImageUrl || '');
    }
  }, [selected]);

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!id) return;
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await ProductService.deleteProduct(id);
        alert('Product deleted successfully!');
        if (selected?.dbId === id) {
          setSelected(null);
        }
      } catch (error: any) {
        console.error('Error deleting product:', error);
        alert(`Failed to delete product: ${error.message}`);
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!selected || !selected.dbId) return;
    try {
      if (!editName.trim() || !editPrice.trim() || !editQty.trim()) {
        alert('Please fill in all required fields');
        return;
      }

      const stock = parseInt(editQty);
      const price = parseFloat(editPrice);
      if (isNaN(stock) || isNaN(price)) {
        alert('Invalid numeric values');
        return;
      }

      await ProductService.updateProduct(selected.dbId, {
        name: editName,
        price: price,
        stock: stock,
        category: editCategory,
        imageUrl: editImage,
      });

      alert('Product updated successfully!');
      setSelected(null);
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(`Failed to update product: ${error.message}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'honesty_store');

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz4uwpgoi';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const data = await res.json();
      if (data.secure_url) {
        setEditImage(data.secure_url);
        alert('Image uploaded successfully!');
      } else {
        throw new Error('No secure URL returned from Cloudinary');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      alert(`Image upload failed: ${error.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleNewProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingNewImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'honesty_store');

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz4uwpgoi';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const data = await res.json();
      if (data.secure_url) {
        setNewProduct(prev => ({ ...prev, imageUrl: data.secure_url }));
        alert('Image uploaded successfully!');
      } else {
        throw new Error('No secure URL returned from Cloudinary');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      alert(`Image upload failed: ${error.message}`);
    } finally {
      setIsUploadingNewImage(false);
    }
  };

  // Transform products to UI format
  const transformedProducts = products.map(transformProduct);

  const filtered = useMemo(() => {
    return transformedProducts.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'All' || p.category === filterCategory;
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [search, filterCategory, filterStatus, transformedProducts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const inStockCount = transformedProducts.filter((p) => p.status === 'In Stock').length;
  const lowStockCount = transformedProducts.filter((p) => p.status === 'Low Stock').length;
  const outOfStockCount = transformedProducts.filter((p) => p.status === 'Out of Stock').length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden relative">

        {/* Main */}
        <div className={cn('flex-1 overflow-y-auto custom-scrollbar transition-all duration-300', selected ? 'mr-[400px]' : '')}>
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Product Catalog</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage RFID-tagged inventory and stock levels.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export
                </Button>
                <Button
                  onClick={() => setShowAddProduct(true)}
                  className="gap-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Product
                </Button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total SKUs', value: transformedProducts.length, icon: 'inventory_2', iconBg: 'bg-primary/10 text-primary', sub: 'Active catalog items' },
                { label: 'In Stock', value: inStockCount, icon: 'check_circle', iconBg: 'bg-green-100 text-green-700', sub: 'Ready to sell', subColor: 'text-green-600' },
                { label: 'Low Stock', value: lowStockCount, icon: 'warning', iconBg: 'bg-amber-100 text-amber-700', sub: 'Needs restocking', subColor: 'text-amber-700' },
                { label: 'Out of Stock', value: outOfStockCount, icon: 'remove_shopping_cart', iconBg: 'bg-red-100 text-red-700', sub: 'Unavailable', subColor: 'text-red-600' },
              ].map((s, i) => (
                <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.iconBg)}>
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>{s.icon}</span>
                      </div>
                    </div>
                    <p className="text-3xl font-semibold">{s.value}</p>
                    <p className={cn('text-xs mt-1', s.subColor ?? 'text-muted-foreground')}>{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search products, SKU…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Category dropdown */}
              <Select value={filterCategory} onValueChange={(value) => { setFilterCategory(value); setPage(1); }}>
                <SelectTrigger className="w-[160px]" size="sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === 'All' ? 'All Categories' : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status dropdown */}
              <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setPage(1); }}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'All' ? 'All Status' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1 gap-1 ml-auto">
                <button
                  onClick={() => setView('table')}
                  className={cn('p-1.5 rounded-md transition-all', view === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Table view"
                >
                  <span className="material-symbols-outlined text-[18px]">table_rows</span>
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={cn('p-1.5 rounded-md transition-all', view === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                  title="Grid view"
                >
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
              </div>
            </div>

            {/* Table View */}
            {view === 'table' && (
              <Card className="shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        {['Product', 'SKU', 'Category', 'Price', 'Stock Level', 'Status', ''].map((h, i) => (
                          <TableHead key={i} className={cn('text-[11px] uppercase tracking-wider font-bold text-muted-foreground', i === 3 && 'text-right', i === 6 && 'w-20')}>
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                            <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">inventory_2</span>
                            No products match your filters.
                          </TableCell>
                        </TableRow>
                      )}
                      {paged.map((p) => {
                        const s = STATUS_CONFIG[p.status];
                        const isSelected = selected?.id === p.id;
                        return (
                          <TableRow
                            key={p.id}
                            onClick={() => setSelected(isSelected ? null : p)}
                            className={cn(
                              'cursor-pointer transition-colors group',
                              isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40',
                              p.status === 'Out of Stock' && 'opacity-70'
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-lg bg-muted border border-border overflow-hidden shrink-0">
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold leading-tight">{p.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{p.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-muted-foreground">{CATEGORY_ICONS[p.category] ?? 'category'}</span>
                                <span className="text-xs text-muted-foreground">{p.category}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-sm font-bold">₱{p.price}</span>
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <StockBar qty={p.qty} />
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', s.bg, s.text, s.border)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                                {p.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelected(isSelected ? null : p); }}
                                  className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-all"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(p.dbId, p.name);
                                  }}
                                  className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-all"
                                  title="Delete"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
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
                    {filtered.length === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} products`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <Button
                        key={n}
                        variant={n === page ? 'default' : 'ghost'}
                        size="sm"
                        className={cn('h-8 w-8 p-0', n === page && 'bg-primary text-primary-foreground')}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Grid View */}
            {view === 'grid' && (
              <>
                {paged.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground text-sm">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">inventory_2</span>
                    No products match your filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paged.map((p) => {
                      const s = STATUS_CONFIG[p.status];
                      const isSelected = selected?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelected(isSelected ? null : p)}
                          className={cn(
                            'bg-card border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md group',
                            isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
                            p.status === 'Out of Stock' && 'opacity-70'
                          )}
                        >
                          <div className="relative aspect-square bg-muted overflow-hidden">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className={cn('absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold border', s.bg, s.text, s.border)}>
                              {p.status}
                            </div>
                          </div>
                          <div className="p-3 space-y-2">
                            <div>
                              <p className="font-semibold text-sm leading-tight truncate">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">{p.description}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-primary">₱{p.price}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">{p.qty} units</span>
                            </div>
                            <StockBar qty={p.qty} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Grid pagination */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filtered.length === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} products`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <Button
                        key={n}
                        variant={n === page ? 'default' : 'ghost'}
                        size="sm"
                        className={cn('h-8 w-8 p-0', n === page && 'bg-primary text-primary-foreground')}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <h4 className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">Inventory Health</h4>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-2xl font-bold">
                      {transformedProducts.length > 0 ? Math.round((inStockCount / transformedProducts.length) * 100) : 0}%
                    </span>
                    <span className="text-green-600 text-xs mb-1 flex items-center font-medium">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>
                      +1.2%
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'In Stock', count: inStockCount, color: 'bg-green-500' },
                      { label: 'Low Stock', count: lowStockCount, color: 'bg-amber-500' },
                      { label: 'Out of Stock', count: outOfStockCount, color: 'bg-red-500' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', row.color)} />
                        <span className="text-xs text-muted-foreground flex-1">{row.label}</span>
                        <span className="text-xs font-mono font-bold">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <h4 className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3">By Category</h4>
                  <div className="space-y-3">
                    {['Drinks', 'Snacks', 'Foods', 'Personal Essentials', 'Office Essentials'].map((cat) => {
                      const count = transformedProducts.filter((p: any) => p.category === cat).length;
                      const pct = transformedProducts.length > 0 ? Math.round((count / transformedProducts.length) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-muted-foreground">{CATEGORY_ICONS[cat]}</span>
                              {cat}
                            </span>
                            <span className="font-mono font-medium">{count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm bg-primary/5 border-primary/20 relative overflow-hidden group">
                <CardContent className="p-5">
                  <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-primary/5 group-hover:scale-110 transition-transform duration-500">
                    inventory
                  </span>
                  <h4 className="text-[11px] text-primary font-bold uppercase tracking-widest mb-3">Restock Alert</h4>
                  <p className="text-sm text-foreground mb-1 font-medium">
                    {lowStockCount + outOfStockCount} items need attention
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Predictive analysis suggests restocking Drinks within 48 hours to avoid stockouts.
                  </p>
                  <button className="text-primary text-xs font-medium flex items-center gap-1 hover:underline">
                    View restock report
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setShowAddProduct(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/30">
                  <div>
                    <h3 className="text-lg font-semibold">Add New Product</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Create a new RFID-tagged inventory item</p>
                  </div>
                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-muted-foreground">close</span>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  <form className="space-y-5">
                    {/* Product Name */}
                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        Product Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Kopiko blangka"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Description</label>
                      <input
                        type="text"
                        placeholder="e.g., 250g Whole Bean"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>

                    {/* RFID SKU */}
                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        RFID SKU <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., RFID-1234567890"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Format: RFID-XX-NNNN</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Category */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">
                          Category <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={newProduct.category}
                          onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Drinks">Drinks</SelectItem>
                            <SelectItem value="Snacks">Snacks</SelectItem>
                            <SelectItem value="Foods">Foods</SelectItem>
                            <SelectItem value="Personal Essentials">Personal Essentials</SelectItem>
                            <SelectItem value="Office Essentials">Office Essentials</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Price */}
                      <div>
                        <label className="text-sm font-semibold mb-2 block">
                          Price (₱) <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                          className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        Initial Stock Quantity <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newProduct.qty}
                        onChange={(e) => setNewProduct({ ...newProduct, qty: e.target.value })}
                        className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
                        min="0"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Number of units in stock</p>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Product Image</label>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center relative group">
                          {newProduct.imageUrl ? (
                            <img src={newProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-muted-foreground text-3xl">image</span>
                          )}
                          {isUploadingNewImage && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl bg-background hover:bg-muted cursor-pointer transition-colors text-sm font-medium">
                            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                            {newProduct.imageUrl ? 'Change Image' : 'Upload Image'}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingNewImage}
                              onChange={handleNewProductImageUpload}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-muted-foreground mt-2">
                            Upload a JPEG or PNG product image (hosted on Cloudinary).
                          </p>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Modal Actions */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddProduct(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={async () => {
                      try {
                        if (!newProduct.name || !newProduct.sku || !newProduct.price || !newProduct.qty) {
                          alert('Please fill in all required fields');
                          return;
                        }

                        const stock = parseInt(newProduct.qty);
                        const status: 'in_stock' | 'low_stock' | 'out_of_stock' =
                          stock === 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock';

                        await ProductService.createProduct({
                          name: newProduct.name,
                          description: newProduct.description,
                          category: newProduct.category,
                          price: parseFloat(newProduct.price),
                          stock: stock,
                          sku: newProduct.sku,
                          status: status,
                          reorderLevel: 5,
                          createdBy: 'admin', // Should get from auth context
                          imageUrl: newProduct.imageUrl || '',
                        });

                        alert('Product created successfully!');
                        setShowAddProduct(false);
                        setNewProduct({
                          name: '',
                          description: '',
                          category: 'Drinks',
                          price: '',
                          qty: '',
                          sku: '',
                          imageUrl: '',
                        });
                      } catch (error: any) {
                        console.error('Error creating product:', error);
                        alert(`Failed to create product: ${error.message}`);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Create Product
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detail / Edit Panel */}
        <div
          className={cn(
            'fixed right-0 h-full w-[400px] bg-card border-l border-border shadow-2xl z-30 flex flex-col transition-transform duration-300 ease-in-out',
            selected ? 'translate-x-0' : 'translate-x-full'
          )}
          style={{ top: '64px', height: 'calc(100vh - 64px)' }}
        >
          {selected && (() => {
            const s = STATUS_CONFIG[selected.status];
            return (
              <>
                {/* Panel Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{selected.sku}</p>
                    <p className="font-semibold text-sm mt-0.5">Product Detail</p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-muted-foreground text-[20px]">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                  {/* Product Image */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border border-border group/img">
                    <img src={editImage || 'https://via.placeholder.com/150'} alt={selected.name} className="w-full h-full object-cover" />
                    <div className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5', s.bg, s.text, s.border)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                      {selected.status}
                    </div>
                    {/* Cloudinary upload overlay */}
                    <label className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer text-white">
                      {isUploadingImage ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                          <span className="text-xs font-medium">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                          <span className="text-xs font-semibold">Change Image</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="font-bold text-lg">{selected.name}</h3>
                    <p className="text-sm text-muted-foreground">{selected.description}</p>
                  </div>

                  {/* Key Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Price', value: `₱${selected.price}` },
                      { label: 'Qty', value: selected.qty },
                      { label: 'Category', value: selected.category },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-muted/40 rounded-lg p-3 text-center border border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{stat.label}</p>
                        <p className="font-bold text-sm">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stock Level */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stock Level</p>
                    <div className="p-4 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={s.text + ' font-semibold'}>{selected.qty} units remaining</span>
                        <span className="text-muted-foreground text-xs">Max: 50</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', selected.qty === 0 ? 'bg-red-500' : selected.qty <= 8 ? 'bg-amber-500' : 'bg-green-500')}
                          style={{ width: `${Math.min((selected.qty / 50) * 100, 100)}%` }}
                        />
                      </div>
                      {selected.status !== 'In Stock' && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          {selected.status === 'Out of Stock' ? 'This item is unavailable. Restock to re-enable sales.' : 'Stock is running low. Consider restocking soon.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Edit Fields */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Edit Details</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Product Name</label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Price (₱)</label>
                          <input
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            type="number"
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Quantity</label>
                          <input
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            type="number"
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Category</label>
                        <Select
                          value={editCategory}
                          onValueChange={setEditCategory}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Drinks">Drinks</SelectItem>
                            <SelectItem value="Snacks">Snacks</SelectItem>
                            <SelectItem value="Foods">Foods</SelectItem>
                            <SelectItem value="Personal Essentials">Personal Essentials</SelectItem>
                            <SelectItem value="Office Essentials">Office Essentials</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel Actions */}
                <div className="p-4 border-t border-border bg-muted/20 flex gap-2">
                  <Button
                    onClick={() => handleDeleteProduct(selected.dbId, selected.name)}
                    variant="outline"
                    className="flex-1 gap-1.5 text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </Button>
                  <Button
                    onClick={handleSaveProduct}
                    className="flex-1 gap-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Changes
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
