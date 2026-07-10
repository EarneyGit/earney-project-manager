import React, { useState, useEffect } from 'react';
import { fetchFreelancers, fetchFreelancer, createFreelancer, updateFreelancer, deleteFreelancer, fetchFreelancerSpend, createFreelancerAssignment, updateFreelancerAssignment, logFreelancerPayment, fetchAttendance } from '@/services/api';
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
import { Users, Briefcase, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fmtINR } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminFreelancers() {
  const [freelancers, setFreelancers] = useState([]);
  const [spend, setSpend] = useState({ total_freelancers: 0, total_contracted: 0, total_pending: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedId, setSelectedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', skillSet: '', rateType: 'daily', rateAmount: '', notes: '' });

  const loadFreelancers = async () => {
    try {
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      const res = await fetchFreelancers(filters);
      setFreelancers(res);
      const sp = await fetchFreelancerSpend();
      setSpend(sp);
    } catch (err) {
      toast.error('Failed to load freelancers');
    }
  };

  useEffect(() => {
    loadFreelancers();
  }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createFreelancer(formData);
      toast.success('Freelancer added');
      setIsAddOpen(false);
      loadFreelancers();
      setFormData({ name: '', email: '', phone: '', skillSet: '', rateType: 'daily', rateAmount: '', notes: '' });
    } catch (err) { toast.error('Failed to add freelancer'); }
  };

  const openDetail = async (id) => {
    try {
      const data = await fetchFreelancer(id);
      setDetailData(data);
      setSelectedId(id);
      setIsSheetOpen(true);
    } catch (err) { toast.error('Failed to load detail'); }
  };

  const filtered = freelancers.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || (f.skill_set && f.skill_set.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" /> Freelancers
        </h1>
        <Button onClick={() => setIsAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Freelancer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Total Freelancers</p>
            <h3 className="text-3xl font-bold">{spend.total_freelancers}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Total Contracted</p>
            <h3 className="text-3xl font-bold">{fmtINR(spend.total_contracted)}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground font-medium">Pending Payments</p>
            <h3 className="text-3xl font-bold text-red-600">{fmtINR(spend.total_pending)}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 flex gap-4">
          <Input placeholder="Search name or skills..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(f => (
          <Card key={f.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openDetail(f.id)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{f.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-1">{f.skill_set || 'No skills listed'}</p>
                </div>
                <Badge variant={f.status === 'active' ? 'default' : 'secondary'}>{f.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mt-2 mb-4">
                {fmtINR(f.rate_amount)} <span className="text-sm font-normal text-muted-foreground">/ {f.rate_type}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Freelancer</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label>Name</Label>
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
              <Label>Skill Set</Label>
              <Input placeholder="e.g. Video Editing, Motion Graphics" value={formData.skillSet} onChange={e => setFormData({...formData, skillSet: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Rate Type</Label>
                <Select value={formData.rateType} onValueChange={v => setFormData({...formData, rateType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Rate Amount (₹)</Label>
                <Input type="number" value={formData.rateAmount} onChange={e => setFormData({...formData, rateAmount: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <Button type="submit" className="w-full">Create Freelancer</Button>
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
                  <span>{detailData.skill_set}</span>
                  <span>•</span>
                  <span>{fmtINR(detailData.rate_amount)} / {detailData.rate_type}</span>
                </div>
              </SheetHeader>
              
              <Tabs defaultValue="assignments">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="info">Overview</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p>{detailData.email || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p>{detailData.phone || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Notes</Label>
                        <p>{detailData.notes || 'No notes available.'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="assignments" className="mt-4">
                  <FreelancerAssignments freelancerId={selectedId} assignments={detailData.assignments} refresh={() => openDetail(selectedId)} />
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <FreelancerPayments freelancerId={selectedId} payments={detailData.payments} assignments={detailData.assignments} refresh={() => openDetail(selectedId)} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FreelancerAssignments({ freelancerId, assignments, refresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', totalWorkValue: '', advancePaid: '', startDate: '', endDate: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createFreelancerAssignment(freelancerId, {
        ...form, totalWorkValue: Number(form.totalWorkValue) || 0, advancePaid: Number(form.advancePaid) || 0
      });
      toast.success('Assignment created');
      setOpen(false);
      refresh();
    } catch (err) { toast.error('Error creating assignment'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1"/> New Assignment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1"><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required/></div>
              <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Total Value (₹)</Label><Input type="number" value={form.totalWorkValue} onChange={e => setForm({...form, totalWorkValue: e.target.value})} required/></div>
                <div className="space-y-1"><Label>Advance Paid (₹)</Label><Input type="number" value={form.advancePaid} onChange={e => setForm({...form, advancePaid: e.target.value})}/></div>
              </div>
              <Button type="submit" className="w-full">Save Assignment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments?.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.title}</TableCell>
              <TableCell className="text-right">{fmtINR(a.total_work_value)}</TableCell>
              <TableCell className="text-right text-emerald-600">{fmtINR(a.amount_paid)}</TableCell>
              <TableCell className="text-right font-bold text-red-600">{fmtINR(a.pending_amount)}</TableCell>
              <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
            </TableRow>
          ))}
          {(!assignments || assignments.length === 0) && <TableRow><TableCell colSpan={5} className="text-center">No assignments found</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function FreelancerPayments({ freelancerId, payments, assignments, refresh }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ assignmentId: 'none', amount: '', paymentType: 'payment', paymentMode: 'Bank Transfer', paymentDate: new Date().toISOString().split('T')[0], note: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await logFreelancerPayment(freelancerId, {
        ...form, assignmentId: form.assignmentId === 'none' ? null : form.assignmentId, amount: Number(form.amount)
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
                <Label>Link to Assignment (Optional)</Label>
                <Select value={form.assignmentId} onValueChange={v => setForm({...form, assignmentId: v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific assignment</SelectItem>
                    {assignments?.map(a => <SelectItem key={a.id} value={a.id}>{a.title} (Pending: {fmtINR(a.pending_amount)})</SelectItem>)}
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
                      <SelectItem value="bonus">Bonus</SelectItem>
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
