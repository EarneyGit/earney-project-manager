import React, { useState, useEffect } from 'react';
import { fetchVendors, fetchVendor, createVendor, updateVendor, deleteVendor, fetchVendorSpend, createVendorBill, updateVendorBill, logVendorPayment } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Package, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { fmtINR } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [spend, setSpend] = useState({ total_vendors: 0, total_billed: 0, total_paid: 0, overdue_bills: 0 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [selectedId, setSelectedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', gstNumber: '', category: '', notes: '' });

  const loadVendors = async () => {
    try {
      const filters = {};
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      const res = await fetchVendors(filters);
      setVendors(res);
      const sp = await fetchVendorSpend();
      setSpend(sp);
    } catch (err) {
      toast.error('Failed to load vendors');
    }
  };

  useEffect(() => {
    loadVendors();
  }, [categoryFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createVendor(formData);
      toast.success('Vendor added');
      setIsAddOpen(false);
      loadVendors();
      setFormData({ name: '', email: '', phone: '', address: '', gstNumber: '', category: '', notes: '' });
    } catch (err) { toast.error('Failed to add vendor'); }
  };

  const openDetail = async (id) => {
    try {
      const data = await fetchVendor(id);
      setDetailData(data);
      setSelectedId(id);
      setIsSheetOpen(true);
    } catch (err) { toast.error('Failed to load detail'); }
  };

  const filtered = vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || (v.category && v.category.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="w-8 h-8" /> Vendors
        </h1>
        <Button onClick={() => setIsAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Vendor</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Total Vendors</p>
            <h3 className="text-3xl font-bold">{spend.total_vendors}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Total Billed</p>
            <h3 className="text-3xl font-bold">{fmtINR(spend.total_billed)}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Total Paid</p>
            <h3 className="text-3xl font-bold text-emerald-600">{fmtINR(spend.total_paid)}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Overdue Bills</p>
            <h3 className="text-3xl font-bold text-red-600">{spend.overdue_bills}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-4">
          <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Printing">Printing</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Materials">Materials</SelectItem>
              <SelectItem value="Services">Services</SelectItem>
              <SelectItem value="Travel">Travel</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Bills</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(v.id)}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.category || '-'}</TableCell>
                  <TableCell className="text-center">{v.bill_count}</TableCell>
                  <TableCell className="text-right">{fmtINR(v.total_billed)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{fmtINR(v.total_paid)}</TableCell>
                  <TableCell className="text-right text-red-600 font-bold">{fmtINR(v.total_pending)}</TableCell>
                  <TableCell><Badge variant={v.status === 'active' ? 'default' : 'secondary'}>{v.status}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm">View</Button></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8">No vendors found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Vendor Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Input placeholder="e.g. Printing, Equipment" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>GST Number</Label>
                <Input value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <Button type="submit" className="w-full">Create Vendor</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
          {detailData && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-2xl">{detailData.name}</SheetTitle>
                <div className="flex gap-2 items-center text-muted-foreground">
                  <Badge>{detailData.status}</Badge>
                  <span>{detailData.category}</span>
                  {detailData.gst_number && <span>• GST: {detailData.gst_number}</span>}
                </div>
              </SheetHeader>
              
              <Tabs defaultValue="bills">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="info">Info</TabsTrigger>
                  <TabsTrigger value="bills">Bills</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Vendor Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div><Label className="text-muted-foreground">Email</Label><p>{detailData.email || '-'}</p></div>
                      <div><Label className="text-muted-foreground">Phone</Label><p>{detailData.phone || '-'}</p></div>
                      <div className="col-span-2"><Label className="text-muted-foreground">Address</Label><p>{detailData.address || '-'}</p></div>
                      <div className="col-span-2"><Label className="text-muted-foreground">Notes</Label><p>{detailData.notes || '-'}</p></div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="bills" className="mt-4">
                  <VendorBills vendorId={selectedId} bills={detailData.bills} refresh={() => openDetail(selectedId)} />
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <VendorPayments vendorId={selectedId} payments={detailData.payments} bills={detailData.bills} refresh={() => openDetail(selectedId)} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function VendorBills({ vendorId, bills, refresh }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState({ billNumber: '', billDate: new Date().toISOString().split('T')[0], dueDate: '', description: '', category: 'Materials', advancePaid: '', note: '' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(items.reduce((s, i) => s + (Number(i.qty)*Number(i.rate) || 0), 0));
  }, [items]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const addItem = () => setItems([...items, { name: '', qty: 1, unit: 'pcs', rate: 0 }]);
  const updateItem = (idx, field, val) => {
    const newItems = [...items];
    newItems[idx][field] = val;
    setItems(newItems);
  };
  const deleteItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalItems = items.map(i => ({...i, amount: Number(i.qty)*Number(i.rate)}));
      await createVendorBill(vendorId, {
        ...form, items: finalItems, totalAmount: total, advancePaid: Number(form.advancePaid) || 0
      });
      toast.success('Bill created');
      setOpen(false);
      refresh();
      setItems([]);
    } catch (err) { toast.error('Error creating bill'); }
  };

  const statusColors = { unpaid: 'destructive', partial: 'warning', paid: 'default', cancelled: 'secondary' };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1"/> Add Bill</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader><DialogTitle>Add Bill</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Bill Number</Label><Input value={form.billNumber} onChange={e => setForm({...form, billNumber: e.target.value})}/></div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Materials">Materials</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Printing">Printing</SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Bill Date</Label><Input type="date" value={form.billDate} onChange={e => setForm({...form, billDate: e.target.value})} required/></div>
                <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}/></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})}/></div>
              
              <div className="border rounded p-4 space-y-2">
                <div className="flex justify-between items-center"><Label>Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button></div>
                {items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input placeholder="Item name" value={it.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="flex-1" required/>
                    <Input type="number" value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} className="w-[80px]" placeholder="Qty" required/>
                    <Input value={it.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} className="w-[80px]" placeholder="Unit" />
                    <Input type="number" value={it.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} className="w-[100px]" placeholder="Rate" required/>
                    <div className="w-[100px] text-right font-medium">{fmtINR(it.qty * it.rate || 0)}</div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteItem(idx)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                  </div>
                ))}
                {items.length > 0 && <div className="text-right font-bold text-lg pt-2 border-t mt-2">Total: {fmtINR(total)}</div>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Advance Paid (₹)</Label><Input type="number" value={form.advancePaid} onChange={e => setForm({...form, advancePaid: e.target.value})}/></div>
                <div className="space-y-1"><Label>Note</Label><Input value={form.note} onChange={e => setForm({...form, note: e.target.value})}/></div>
              </div>
              
              <Button type="submit" className="w-full">Save Bill</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>Bill No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills?.map(b => (
            <React.Fragment key={b.id}>
              <TableRow className="cursor-pointer" onClick={() => toggleExpand(b.id)}>
                <TableCell>{expanded[b.id] ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</TableCell>
                <TableCell className="font-medium">{b.bill_number || '-'}</TableCell>
                <TableCell>{new Date(b.bill_date).toLocaleDateString()}</TableCell>
                <TableCell>{b.description || '-'}</TableCell>
                <TableCell className="text-right">{fmtINR(b.total_amount)}</TableCell>
                <TableCell className="text-right font-bold text-red-600">{fmtINR(b.pending_amount)}</TableCell>
                <TableCell><Badge variant={statusColors[b.status] || 'default'} className={b.status === 'partial' ? 'bg-amber-500 hover:bg-amber-600' : ''}>{b.status}</Badge></TableCell>
              </TableRow>
              {expanded[b.id] && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={7} className="p-0">
                    <div className="p-4 border-l-2 border-l-primary/50 ml-4">
                      <Table className="bg-background rounded border">
                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {b.items?.map((it, i) => (
                            <TableRow key={i}>
                              <TableCell>{it.name}</TableCell><TableCell className="text-right">{it.qty}</TableCell><TableCell>{it.unit}</TableCell><TableCell className="text-right">{fmtINR(it.rate)}</TableCell><TableCell className="text-right font-medium">{fmtINR(it.amount)}</TableCell>
                            </TableRow>
                          ))}
                          {(!b.items || b.items.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No item breakdown available.</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
          {(!bills || bills.length === 0) && <TableRow><TableCell colSpan={7} className="text-center">No bills found</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function VendorPayments({ vendorId, payments, bills, refresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendorBillId: 'none', amount: '', paymentType: 'payment', paymentMode: 'Bank Transfer', paymentDate: new Date().toISOString().split('T')[0], note: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await logVendorPayment(vendorId, {
        ...form, vendorBillId: form.vendorBillId === 'none' ? null : form.vendorBillId, amount: Number(form.amount)
      });
      toast.success('Payment logged');
      setOpen(false);
      refresh();
    } catch (err) { toast.error('Error logging payment'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1"/> Log Payment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Payment</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Link to Bill (Optional)</Label>
                <Select value={form.vendorBillId} onValueChange={v => setForm({...form, vendorBillId: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific bill</SelectItem>
                    {bills?.map(b => <SelectItem key={b.id} value={b.id}>{b.bill_number || 'Bill'} - {b.description} (Pending: {fmtINR(b.pending_amount)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required/></div>
                <div className="space-y-1">
                  <Label>Payment Date</Label>
                  <Input type="date" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})} required/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.paymentType} onValueChange={v => setForm({...form, paymentType: v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Mode</Label>
                  <Input value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})} placeholder="Bank / UPI / Cash" />
                </div>
              </div>
              <div className="space-y-1"><Label>Note</Label><Input value={form.note} onChange={e => setForm({...form, note: e.target.value})}/></div>
              <Button type="submit" className="w-full">Save Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments?.map(p => (
            <TableRow key={p.id}>
              <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
              <TableCell className="text-right font-bold text-emerald-600">{fmtINR(p.amount)}</TableCell>
              <TableCell className="capitalize">{p.payment_type}</TableCell>
              <TableCell>{p.payment_mode || '-'}</TableCell>
              <TableCell className="text-sm">{p.note}</TableCell>
            </TableRow>
          ))}
          {(!payments || payments.length === 0) && <TableRow><TableCell colSpan={5} className="text-center">No payments found</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
