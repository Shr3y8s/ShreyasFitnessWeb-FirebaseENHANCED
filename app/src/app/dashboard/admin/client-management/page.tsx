'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Users as UsersIcon, AlertCircle, UserCog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/Breadcrumb';
import Link from 'next/link';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';

interface Client {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  accountActivated?: boolean;
  subscriptionStatus?: string;
  subscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  assignedTrainerName?: string;
  gdprDeleted?: boolean;
  gdprDeletedAt?: any;
  subscriptionPaused?: boolean;
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Filter clients based on search term
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          client.email.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

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
      return <Badge variant="destructive">Past Due</Badge>;
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

        {/* Search Bar */}
        <Card className="bg-white rounded-xl border shadow-sm">
          <CardHeader>
            <CardTitle>Search Clients</CardTitle>
            <CardDescription>
              Find clients by name or email address
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

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
