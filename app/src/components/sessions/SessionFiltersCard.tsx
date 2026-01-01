'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { SessionFilters } from '@/lib/session-management-api';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FilterX } from 'lucide-react';

interface SessionFiltersCardProps {
  currentFilters: SessionFilters;
  onFiltersChange: (filters: Partial<SessionFilters>) => void;
  trainerId: string;
}

interface ClientOption {
  id: string;
  name: string;
}

export function SessionFiltersCard({ currentFilters, onFiltersChange, trainerId }: SessionFiltersCardProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Local state for date range
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Fetch trainer's clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const usersRef = collection(db, 'users');
        const clientsQuery = query(usersRef, where('role', '==', 'client'));
        const snapshot = await getDocs(clientsQuery);
        
        const clientList: ClientOption[] = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown Client'
        }));
        
        setClients(clientList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    if (trainerId) {
      fetchClients();
    }
  }, [trainerId]);

  // Handle status change
  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ status: undefined });
    } else {
      onFiltersChange({ status: value as SessionFilters['status'] });
    }
  };

  // Handle client change
  const handleClientChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ clientId: undefined });
    } else {
      onFiltersChange({ clientId: value });
    }
  };

  // Handle date range quick select
  const handleQuickDateRange = (range: string) => {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (range) {
      case 'all':
        from = undefined;
        to = undefined;
        break;
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        // Start of week (Sunday)
        from = new Date(now);
        from.setDate(now.getDate() - now.getDay());
        from.setHours(0, 0, 0, 0);
        // End of week (Saturday)
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // First day of current month
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        // Last day of current month
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }

    onFiltersChange({ dateFrom: from, dateTo: to });
    
    // Update local state
    setDateFrom(from ? from.toISOString().split('T')[0] : '');
    setDateTo(to ? to.toISOString().split('T')[0] : '');
  };

  // Handle custom date from change
  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    const date = value ? new Date(value + 'T00:00:00') : undefined;
    onFiltersChange({ dateFrom: date });
  };

  // Handle custom date to change
  const handleDateToChange = (value: string) => {
    setDateTo(value);
    const date = value ? new Date(value + 'T23:59:59') : undefined;
    onFiltersChange({ dateTo: date });
  };

  // Clear all filters (except sessionType which is managed by parent)
  const handleClearFilters = () => {
    onFiltersChange({
      status: undefined,
      clientId: undefined,
      dateFrom: undefined,
      dateTo: undefined
    });
    setDateFrom('');
    setDateTo('');
  };

  // Check if any filters are active
  const hasActiveFilters = 
    currentFilters.status || 
    currentFilters.clientId || 
    currentFilters.dateFrom || 
    currentFilters.dateTo;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <FilterX className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={currentFilters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no-show">No-Show</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Filter */}
          <div className="space-y-2">
            <Label htmlFor="client-filter">Client</Label>
            <Select
              value={currentFilters.clientId || 'all'}
              onValueChange={handleClientChange}
              disabled={loadingClients}
            >
              <SelectTrigger id="client-filter">
                <SelectValue placeholder={loadingClients ? 'Loading...' : 'All Clients'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Quick Select */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange('all')}
                className={!currentFilters.dateFrom && !currentFilters.dateTo ? 'bg-primary/10' : ''}
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange('week')}
              >
                Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange('month')}
              >
                Month
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="space-y-2">
            <Label>Custom Range</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="text-sm"
                placeholder="From"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="text-sm"
                placeholder="To"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
