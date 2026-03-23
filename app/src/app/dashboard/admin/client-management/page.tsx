'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users as UsersIcon, AlertCircle, UserCog, Filter, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/Breadcrumb';
import Link from 'next/link';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { SUBSCRIPTION_TIERS } from '@/lib/constants';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Client {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  accountActivated?: boolean;
  subscriptionStatus?: string;
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  tier?: string;
  assignedTrainerName?: string;
  gdprDeleted?: boolean;
  gdprDeletedAt?: any;
  subscriptionPaused?: boolean;
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          client.email.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((client) => {
        switch (statusFilter) {
          case 'active': return client.subscriptionStatus === 'active' && !client.cancelAtPeriodEnd && !client.subscriptionPaused;
          case 'canceling': return client.subscriptionStatus === 'active' && client.cancelAtPeriodEnd;
          case 'canceled': return client.subscriptionStatus === 'canceled' && !client.gdprDeleted;
          case 'paused': return client.subscriptionPaused;
          case 'past_due': return client.subscriptionStatus === 'past_due';
          case 'deleted': return client.gdprDeleted;
          case 'pending': return !client.accountActivated;
          case 'no_subscription': return !client.subscriptionStatus && !client.gdprDeleted;
          default: return true;
        }
      });
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((client) => {
        switch (tierFilter) {
          case 'ipt': return client.tier === SUBSCRIPTION_TIERS.IN_PERSON_4PACK;
          case 'oc': return client.tier === SUBSCRIPTION_TIERS.ONLINE_COACHING;
          case 'ct': return client.tier === SUBSCRIPTION_TIERS.COMPLETE_TRANSFORMATION;
          case 'none': return !client.tier;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest': {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        }
        case 'oldest': {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        }
        case 'name_az': return a.name.localeCompare(b.name);
        case 'name_za': return b.name.localeCompare(a.name);
        default: return 0;
      }
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients, statusFilter, tierFilter, sortBy]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('role', '==', 'client'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const clientsData: Client[] = [];

      snapshot.forEach((doc) => {
        clientsData.push({
          uid: doc.id,
          ...doc.data(),
        } as Client);
      });

      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuccess = () => {
    // Refresh client list after successful deletion
    fetchClients();
  };

  const getSubscriptionBadge = (client: Client) => {
    // GDPR-deleted accounts take highest priority
    if (client.gdprDeleted) {
      return <Badge className="bg-red-600 text-white">Deleted</Badge>;
    }

    if (!client.subscriptionStatus) {
      return <Badge variant="secondary">No Subscription</Badge>;
    }

    if (client.subscriptionStatus === 'active') {
      if (client.subscriptionPaused) {
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Paused</Badge>;
      }
      if (client.cancelAtPeriodEnd) {
        return <Badge variant="outline" className="border-amber-500 text-amber-700">Canceling</Badge>;
      }
      return <Badge variant="default" className="bg-green-600">Active</Badge>;
    }

    if (client.subscriptionStatus === 'canceled') {
      return <Badge variant="secondary">Canceled</Badge>;
    }

    if (client.subscriptionStatus === 'past_due') {
      return <Badge variant="outline" className="border-red-500 text-red-700">Past Due</Badge>;
    }

    return <Badge variant="secondary">{client.subscriptionStatus}</Badge>;
  };

  const breadcrumbItems = [
    { label: 'Admin', href: '/dashboard/admin' },
    { label: 'Client Management' },
  ];

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="mb-2">
            <Breadcrumb items={breadcrumbItems} />
          </div>
          
          <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage client accounts
          </p>
        </div>

        {/* Search & Filters */}
        <Card className="bg-white rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle>Search & Filter Clients</CardTitle>
            <CardDescription>
              Find and filter clients by name, email, status, or tier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns — 2-row layout: label above dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="active">✅ Active</option>
                  <option value="canceling">⏳ Canceling</option>
                  <option value="canceled">❌ Canceled</option>
                  <option value="paused">⏸️ Paused</option>
                  <option value="past_due">🔴 Past Due</option>
                  <option value="deleted">🗑️ Deleted</option>
                  <option value="pending">🟡 Pending</option>
                  <option value="no_subscription">⚪ No Subscription</option>
                </select>
              </div>

              {/* Tier Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Subscription Tier</label>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Tiers</option>
                  <option value="ipt">🏋️ In-Person (IPT)</option>
                  <option value="oc">💻 Online (OC)</option>
                  <option value="ct">⭐ Complete (CT)</option>
                  <option value="none">— No Tier</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_az">Name A→Z</option>
                  <option value="name_za">Name Z→A</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(statusFilter !== 'all' || tierFilter !== 'all' || searchTerm.trim()) && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStatusFilter('all'); setTierFilter('all'); setSearchTerm(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Guide — Collapsible */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Info className="h-4 w-4" />
              <span className="font-medium">Status Guide</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg border text-sm space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600 text-xs">Active</Badge>
                  <span className="text-muted-foreground">Subscription is current, billing normally</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-500 text-amber-700 text-xs">Canceling</Badge>
                  <span className="text-muted-foreground">Will cancel at end of billing period</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Canceled</Badge>
                  <span className="text-muted-foreground">Subscription ended, account still exists</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-500 text-blue-700 text-xs">Paused</Badge>
                  <span className="text-muted-foreground">Subscription temporarily paused</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-red-500 text-red-700 text-xs">Past Due</Badge>
                  <span className="text-muted-foreground">Payment failed, needs attention</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white text-xs">Deleted</Badge>
                  <span className="text-muted-foreground">Account GDPR-deleted, data anonymized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-500 text-amber-700 text-xs">Pending</Badge>
                  <span className="text-muted-foreground">Signed up but hasn&apos;t completed payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">No Subscription</Badge>
                  <span className="text-muted-foreground">Active account, no recurring subscription</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clients.filter((c) => c.subscriptionStatus === 'active' && !c.cancelAtPeriodEnd).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-xl border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Search Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredClients.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        <Card className="bg-white rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Clients ({filteredClients.length})
            </CardTitle>
            <CardDescription>
              All registered client accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No clients found matching your search' : 'No clients yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <Link
                    key={client.uid}
                    href={`/dashboard/admin/client-management/${client.uid}`}
                    className="block border border-primary/50 rounded-lg hover:bg-primary/10 cursor-pointer transition-all duration-300 hover:shadow-glow hover:-translate-y-1"
                  >
                    <div className="p-3">
                      {/* Line 1: Name • Email • Badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="font-semibold text-base">{client.name}</h3>
                        <span className="text-sm text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                        <span className="text-sm text-muted-foreground">•</span>
                        {getSubscriptionBadge(client)}
                        {!client.accountActivated && (
                          <Badge variant="outline" className="border-amber-500 text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </div>

                      {/* Line 2: Dates and Trainer */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {client.gdprDeleted ? (
                          <div>
                            Joined:{' '}
                            {client.createdAt?.toDate
                              ? client.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '?'}
                            {' — Deleted: '}
                            {client.gdprDeletedAt?.toDate
                              ? client.gdprDeletedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '?'}
                          </div>
                        ) : (
                          <div>
                            Member since:{' '}
                            {client.createdAt?.toDate
                              ? client.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'Unknown'}
                          </div>
                        )}
                        {client.assignedTrainerName && (
                          <>
                            <span>•</span>
                            <div>Trainer: {client.assignedTrainerName}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

            {/* Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Account deletion is permanent and cannot be undone. All
                client data will be removed, but payment records will be preserved for legal compliance.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
