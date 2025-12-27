'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Loader2, Users as UsersIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DeleteAccountDialog from '@/components/admin/DeleteAccountDialog';
import { Breadcrumb } from '@/components/Breadcrumb';
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
}

export default function ClientManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    // Refresh client list after successful deletion
    fetchClients();
  };

  const getSubscriptionBadge = (client: Client) => {
    if (!client.subscriptionStatus) {
      return <Badge variant="secondary">No Subscription</Badge>;
    }

    if (client.subscriptionStatus === 'active') {
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
                  <div
                    key={client.uid}
                    className="border border-stone-200 rounded-lg p-3 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all duration-200 cursor-pointer"
                  >
                    {/* Line 1: Name, Email, Badges, Delete Button */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{client.name}</h3>
                            <span className="text-sm text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getSubscriptionBadge(client)}
                          {!client.accountActivated && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(client)}
                        className="gap-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>

                    {/* Line 2: Member since and Trainer */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div>
                        Member since:{' '}
                        {client.createdAt?.toDate
                          ? client.createdAt.toDate().toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Unknown'}
                      </div>
                      {client.assignedTrainerName && (
                        <>
                          <span>•</span>
                          <div>Trainer: {client.assignedTrainerName}</div>
                        </>
                      )}
                    </div>
                  </div>
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

        {/* Delete Account Dialog */}
        <DeleteAccountDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          client={selectedClient}
          onSuccess={handleDeleteSuccess}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
