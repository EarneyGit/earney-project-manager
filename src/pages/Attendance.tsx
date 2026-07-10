import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { fetchAttendance, fetchAttendanceSummary, markAttendance, fetchUsersByRole, fetchFreelancers } from '@/services/api';
import { fmtINR } from '@/lib/utils';
import { toast } from 'sonner';
import { UserCheck, Edit, Trash2 } from 'lucide-react';

export default function Attendance() {
  const { isAdmin, currentUser } = useAuth();
  
  const [viewMode, setViewMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [summary, setSummary] = useState({ employees: [], freelancers: [] });
  const [records, setRecords] = useState([]);
  
  const [isMarkOpen, setIsMarkOpen] = useState(false);
  const [personType, setPersonType] = useState('employee');
  const [users, setUsers] = useState([]);
  const [freelancersList, setFreelancersList] = useState([]);
  
  const [formData, setFormData] = useState({
    userId: '', freelancerId: '', date: new Date().toISOString().split('T')[0],
    status: 'present', checkIn: '', checkOut: '', hoursWorked: '', dayAmount: '', notes: ''
  });

  const loadData = async () => {
    try {
      let filters = {};
      if (viewMode === 'month') {
        filters = { month: selectedMonth, year: selectedYear };
      } else if (viewMode === 'day') {
        filters = { startDate, endDate: startDate };
      } else if (viewMode === 'year') {
        filters = { year: selectedYear };
      } else if (viewMode === 'custom') {
        filters = { startDate, endDate };
      }
      
      const recRes = await fetchAttendance(filters);
      setRecords(recRes.records || []);
      
      if (isAdmin && (viewMode === 'month' || viewMode === 'year')) {
        const sumRes = await fetchAttendanceSummary({ month: selectedMonth, year: selectedYear });
        setSummary(sumRes);
      }
    } catch (err) {
      toast.error("Failed to load attendance data");
    }
  };

  const loadDropdowns = async () => {
    if (isAdmin) {
      try {
        const u = await fetchUsersByRole();
        setUsers(u.filter(x => x.role !== 'admin'));
        const f = await fetchFreelancers();
        setFreelancersList(f);
      } catch (err) {}
    }
  };

  useEffect(() => {
    loadData();
    loadDropdowns();
  }, [viewMode, selectedMonth, selectedYear, startDate, endDate, isAdmin]);

  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: formData.date,
        status: formData.status,
        checkIn: formData.checkIn || undefined,
        checkOut: formData.checkOut || undefined,
        hoursWorked: formData.hoursWorked ? Number(formData.hoursWorked) : undefined,
        dayAmount: formData.dayAmount ? Number(formData.dayAmount) : undefined,
        notes: formData.notes
      };
      if (personType === 'employee') {
        payload.userId = formData.userId;
      } else {
        payload.freelancerId = formData.freelancerId;
      }
      
      await markAttendance(payload);
      toast.success("Attendance marked");
      setIsMarkOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };
  
  const statusColors = {
    'present': 'bg-emerald-500',
    'absent': 'bg-red-500',
    'half-day': 'bg-amber-500',
    'late': 'bg-orange-500',
    'leave': 'bg-purple-500',
    'holiday': 'bg-blue-500',
    'work-from-home': 'bg-sky-500'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCheck className="w-8 h-8" /> Attendance
        </h1>
        {isAdmin && (
          <Button onClick={() => setIsMarkOpen(true)}>Mark Today</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label>View Mode</Label>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {viewMode === 'day' && (
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          )}
          
          {viewMode === 'month' && (
            <>
              <div className="space-y-1">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}).map((_, i) => (
                      <SelectItem key={i+1} value={(i+1).toString()}>{new Date(0, i).toLocaleString('default', {month:'short'})}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-[100px]" />
              </div>
            </>
          )}

          {viewMode === 'custom' && (
            <>
              <div className="space-y-1">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={isAdmin ? "summary" : "records"}>
        <TabsList>
          {isAdmin && <TabsTrigger value="summary">Summary</TabsTrigger>}
          <TabsTrigger value="records">Records</TabsTrigger>
          {isAdmin && <TabsTrigger value="calendar">Calendar</TabsTrigger>}
        </TabsList>
        
        {isAdmin && (
          <TabsContent value="summary" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Half Day</TableHead>
                      <TableHead className="text-center">Leave</TableHead>
                      <TableHead className="text-center">WFH</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.employees?.map(e => {
                      const rate = e.total_marked > 0 ? (e.present / e.total_marked) * 100 : 0;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell className="capitalize">{e.role}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-bold">{e.present}</TableCell>
                          <TableCell className="text-center text-red-600 font-bold">{e.absent}</TableCell>
                          <TableCell className="text-center">{e.half_day}</TableCell>
                          <TableCell className="text-center">{e.leave}</TableCell>
                          <TableCell className="text-center">{e.wfh}</TableCell>
                          <TableCell className="w-[150px]">
                            <div className="flex items-center gap-2 text-sm">
                              <Progress value={rate} className="h-2" />
                              <span>{Math.round(rate)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {summary.employees?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center">No data found for this period</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Freelancer Attendance & Payable</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead className="text-center">Present Days</TableHead>
                      <TableHead>Rate Type</TableHead>
                      <TableHead className="text-right">Total Payable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.freelancers?.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{f.skill_set || '-'}</TableCell>
                        <TableCell className="text-center text-emerald-600 font-bold">{f.present}</TableCell>
                        <TableCell className="capitalize">{f.rate_type} ({fmtINR(f.rate_amount)})</TableCell>
                        <TableCell className="text-right font-bold">{fmtINR(f.total_payable)}</TableCell>
                      </TableRow>
                    ))}
                    {summary.freelancers?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No freelancers found for this period</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="records" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Hrs</TableHead>
                    {isAdmin && <TableHead className="text-right">Day Amount</TableHead>}
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.employee_name || r.freelancer_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {r.user_id ? r.employee_role : 'Freelancer'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[r.status]} text-white border-none capitalize`}>
                          {r.status.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.check_in ? r.check_in.substring(0,5) : '-'}</TableCell>
                      <TableCell>{r.check_out ? r.check_out.substring(0,5) : '-'}</TableCell>
                      <TableCell>{r.hours_worked || '-'}</TableCell>
                      {isAdmin && <TableCell className="text-right">{r.freelancer_id ? fmtINR(r.day_amount) : '-'}</TableCell>}
                      <TableCell className="text-sm max-w-[200px] truncate">{r.notes}</TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">No records found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>Calendar view coming soon. Showing records in table format for now.</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isMarkOpen} onOpenChange={setIsMarkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
          <form onSubmit={handleMarkSubmit} className="space-y-4">
            <div className="flex gap-4 mb-4">
              <Button type="button" variant={personType === 'employee' ? 'default' : 'outline'} onClick={() => setPersonType('employee')} className="w-1/2">Employee</Button>
              <Button type="button" variant={personType === 'freelancer' ? 'default' : 'outline'} onClick={() => setPersonType('freelancer')} className="w-1/2">Freelancer</Button>
            </div>
            
            <div className="space-y-1">
              <Label>Select {personType === 'employee' ? 'Employee' : 'Freelancer'}</Label>
              <Select 
                value={personType === 'employee' ? formData.userId : formData.freelancerId} 
                onValueChange={(v) => {
                  if (personType === 'employee') setFormData({...formData, userId: v, freelancerId: ''});
                  else {
                    const f = freelancersList.find(x => x.id === v);
                    setFormData({...formData, freelancerId: v, userId: '', dayAmount: (f && f.rate_type === 'daily') ? f.rate_amount.toString() : ''});
                  }
                }} 
                required
              >
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {personType === 'employee' 
                    ? users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)
                    : freelancersList.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="work-from-home">Work From Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Check In</Label>
                <Input type="time" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Check Out</Label>
                <Input type="time" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Hours Worked</Label>
                <Input type="number" step="0.5" value={formData.hoursWorked} onChange={e => setFormData({...formData, hoursWorked: e.target.value})} />
              </div>
              {personType === 'freelancer' && (
                <div className="space-y-1">
                  <Label>Day Amount (₹)</Label>
                  <Input type="number" value={formData.dayAmount} onChange={e => setFormData({...formData, dayAmount: e.target.value})} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>

            <Button type="submit" className="w-full">Save Attendance</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
