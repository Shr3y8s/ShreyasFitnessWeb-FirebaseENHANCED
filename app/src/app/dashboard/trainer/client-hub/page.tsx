'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Users, Search, Sparkles } from 'lucide-react';
import { SessionPackage } from '@/types/session';
import { fetchAllProducts, isSessionProduct } from '@/lib/stripe';
import type { StripeProduct } from '@/types/stripe';

// Client data interface
interface ClientData {
  id: string;
  name: string;
  email: string;
  preferredName?: string;
  profilePhotoSmall?: string;
  profilePhotoLarge?: string;
  tier?: any;
  tierName?: string;
  sessionPackages?: SessionPackage[];
  lastWorkout?: Date | null;
  workoutsCompleted: number;
  status: 'active' | 'inactive' | 'pending';
  accountActivated?: boolean;
  subscriptionStatus?: string;
  createdAt?: any;
  phone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  address?: string | {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  timezone?: string;
}

export default function ClientHubPage() {
  const router = useRouter();
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced filters (from Client Roster)
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<string>('all');
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState<string>('all');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<string>('all');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<string>('all');
  const [workoutActivityFilter, setWorkoutActivityFilter] = useState<string>('all');
  
  // Stripe products for filter options
  const [stripeProducts, setStripeProducts] = useState<StripeProduct[]>([]);
  const [subscriptionProducts, setSubscriptionProducts] = useState<StripeProduct[]>([]);
  const [sessionProducts, setSessionProducts] = useState<StripeProduct[]>([]);

  // Helper function to safely convert Firestore timestamps to Date
  const toSafeDate = (value: any): Date | null => {
    if (!value) return null;
    
    if (value?.toDate && typeof value.toDate === 'function') {
      return value.toDate();
    }
    
    if (value instanceof Date) {
      return value;
    }
    
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Fetch clients data
  useEffect(() => {
    const fetchClients = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }
      
      try {
        // Fetch clients assigned to this trainer
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where('assignedTrainerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const clientsSnapshot = await getDocs(clientsQuery);
        
        // Fetch assignments for workout stats
        const assignmentsQuery = query(
          collection(db, 'workouts'),
          where('trainerId', '==', user.uid)
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        
        const allAssignments: any[] = [];
        assignmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          allAssignments.push({
            id: doc.id,
            ...data,
            completedAt: toSafeDate(data.completedAt),
            assignedDate: toSafeDate(data.assignedDate),
            dueDate: toSafeDate(data.dueDate)
          });
        });
        
        // Process clients
        const clientsData = await Promise.all(
          clientsSnapshot.docs.map(async (docSnapshot) => {
            const clientInfo = docSnapshot.data();
            const clientId = docSnapshot.id;
            
            const clientAssignments = allAssignments.filter(a => a.clientId === clientId);
            const completedAssignments = clientAssignments.filter(a => a.status === 'completed');
            const lastCompletedWorkout = completedAssignments
              .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];
            
            // Determine client status based on workout activity
            let status: 'active' | 'inactive' | 'pending' = 'active';
            if (clientAssignments.length === 0) {
              status = 'pending';
            } else if (lastCompletedWorkout && lastCompletedWorkout.completedAt) {
              const daysSinceLastWorkout = Math.floor(
                (Date.now() - lastCompletedWorkout.completedAt.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysSinceLastWorkout > 14) {
                status = 'inactive';
              }
            }
            
            return {
              id: clientId,
              name: clientInfo.name,
              email: clientInfo.email,
              preferredName: clientInfo.preferredName,
              profilePhotoSmall: clientInfo.profilePhotoSmall,
              profilePhotoLarge: clientInfo.profilePhotoLarge,
              tier: clientInfo.tier,
              tierName: clientInfo.tierName,
              sessionPackages: clientInfo.sessionPackages || [],
              lastWorkout: lastCompletedWorkout?.completedAt || null,
              workoutsCompleted: completedAssignments.length,
              status: status,
              accountActivated: clientInfo.accountActivated || false,
              subscriptionStatus: clientInfo.subscriptionStatus || 'unknown',
              createdAt: clientInfo.createdAt,
              phone: clientInfo.phone,
              emergencyContact: clientInfo.emergencyContact,
              address: clientInfo.address,
              timezone: clientInfo.timezone
            };
          })
        );
        
        setClients(clientsData);
        setFilteredClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [user, router, authLoading, canAccessTrainerDashboard]);

  // Load Stripe products for filter options
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await fetchAllProducts();
        setStripeProducts(products);
        
        // Separate subscription products from session products
        const subscriptions: StripeProduct[] = [];
        const sessions: StripeProduct[] = [];
        
        products.forEach(product => {
          if (isSessionProduct(product)) {
            sessions.push(product);
          } else {
            subscriptions.push(product);
          }
        });
        
        setSubscriptionProducts(subscriptions);
        setSessionProducts(sessions);
      } catch (error) {
        console.error('Error loading Stripe products:', error);
      }
    };
    loadProducts();
  }, []);

  // Advanced filtering with all 6 filters
  useEffect(() => {
    let filtered = [...clients];

    // 1. Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client => {
        // Search name, email, preferredName
        if (client.name.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query) ||
            client.preferredName?.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search address (city, state, country only)
        if (client.address) {
          if (typeof client.address === 'string' && 
              client.address.toLowerCase().includes(query)) {
            return true;
          }
          
          if (typeof client.address === 'object') {
            if (client.address.city?.toLowerCase().includes(query) ||
                client.address.state?.toLowerCase().includes(query) ||
                client.address.country?.toLowerCase().includes(query)) {
              return true;
            }
          }
        }
        
        return false;
      });
    }

    // 2. Subscription Status filter
    if (subscriptionStatusFilter !== 'all') {
      if (subscriptionStatusFilter === 'active') {
        filtered = filtered.filter(client => client.accountActivated && client.tier);
      } else if (subscriptionStatusFilter === 'inactive') {
        filtered = filtered.filter(client => !client.accountActivated || !client.tier);
      }
    }

    // 3. Subscription Type filter
    if (subscriptionTypeFilter !== 'all') {
      filtered = filtered.filter(client => client.tier === subscriptionTypeFilter);
    }

    // 4. Session Status filter
    if (sessionStatusFilter !== 'all') {
      if (sessionStatusFilter === 'has-sessions') {
        filtered = filtered.filter(client => 
          client.sessionPackages && client.sessionPackages.length > 0
        );
      } else if (sessionStatusFilter === 'no-sessions') {
        filtered = filtered.filter(client => 
          !client.sessionPackages || client.sessionPackages.length === 0
        );
      } else if (sessionStatusFilter === 'expired') {
        filtered = filtered.filter(client => {
          if (!client.sessionPackages || client.sessionPackages.length === 0) return false;
          
          // Check if all packages are expired
          const allExpired = client.sessionPackages.every(pkg => {
            if (!pkg.expirationDate) return false;
            const expirationDate = typeof pkg.expirationDate === 'number' 
              ? new Date(pkg.expirationDate * 1000)
              : new Date(pkg.expirationDate.seconds * 1000);
            return expirationDate < new Date();
          });
          
          return allExpired;
        });
      }
    }

    // 5. Session Type filter
    if (sessionTypeFilter !== 'all') {
      filtered = filtered.filter(client => 
        client.sessionPackages?.some(pkg => pkg.stripeProductId === sessionTypeFilter)
      );
    }

    // 6. Workout Activity filter
    if (workoutActivityFilter !== 'all') {
      filtered = filtered.filter(client => client.status === workoutActivityFilter);
    }

    setFilteredClients(filtered);
  }, [clients, searchQuery, subscriptionStatusFilter, subscriptionTypeFilter, sessionStatusFilter, sessionTypeFilter, workoutActivityFilter]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading Client Hub...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="client-hub" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-2">
            <Breadcrumb items={[
              { label: 'Client Management' },
              { label: 'Client Hub' }
            ]} />
          </div>
          
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-foreground">Client Hub</h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  <Sparkles className="h-3 w-3" />
                  New
                </span>
              </div>
              <p className="text-muted-foreground mt-1">
                Comprehensive view of all your clients • {filteredClients.length} of {clients.length} clients
              </p>
            </div>
          </div>

          {/* Search & Filter Panel */}
          <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 mb-6 transition-all duration-300 hover:shadow-glow">
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              />
            </div>

            {/* 5 Independent Filters - Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Subscription Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Subscription Status</label>
                <select
                  value={subscriptionStatusFilter}
                  onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All</option>
                  <option value="active">✅ Active</option>
                  <option value="inactive">⏸️ Inactive</option>
                </select>
              </div>

              {/* Subscription Type Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Subscription Type</label>
                <select
                  value={subscriptionTypeFilter}
                  onChange={(e) => setSubscriptionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All</option>
                  {subscriptionProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Session Status</label>
                <select
                  value={sessionStatusFilter}
                  onChange={(e) => setSessionStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All</option>
                  <option value="has-sessions">✅ Has Sessions</option>
                  <option value="no-sessions">❌ No Sessions</option>
                  <option value="expired">⏰ Expired</option>
                </select>
              </div>

              {/* Session Type Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Session Type</label>
                <select
                  value={sessionTypeFilter}
                  onChange={(e) => setSessionTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All</option>
                  {sessionProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Workout Activity Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Workout Activity</label>
                <select
                  value={workoutActivityFilter}
                  onChange={(e) => setWorkoutActivityFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All</option>
                  <option value="active">🟢 On Track</option>
                  <option value="inactive">🔴 Inactive (14+ days)</option>
                  <option value="pending">🟡 Never Assigned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client List */}
          <div className="bg-primary/5 border border-primary/50 rounded-xl transition-all duration-300 hover:shadow-glow">
            {filteredClients.length > 0 ? (
              <div className="divide-y">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => router.push(`/dashboard/trainer/client-hub/${client.id}`)}
                    className="p-6 hover:bg-primary/10 cursor-pointer transition-all duration-300 hover:shadow-glow hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {client.profilePhotoSmall ? (
                        <img
                          src={client.profilePhotoSmall}
                          alt={client.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Client Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold truncate">{client.name}</h3>
                        <p className="text-gray-600 truncate">{client.email}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {/* Status Badge */}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            client.status === 'active' ? 'bg-green-100 text-green-800' :
                            client.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {client.status === 'active' ? '🟢 On Track' :
                             client.status === 'inactive' ? '🔴 Inactive' :
                             '🟡 Never Assigned'}
                          </span>
                          {/* Workouts Badge */}
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            💪 {client.workoutsCompleted} workouts
                          </span>
                          {/* Membership Badge */}
                          {client.accountActivated && client.tierName && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              ✨ {client.tierName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Search className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">No clients found</p>
                <p className="text-gray-600 mb-4">
                  {(searchQuery || subscriptionStatusFilter !== 'all' || subscriptionTypeFilter !== 'all' || sessionStatusFilter !== 'all' || sessionTypeFilter !== 'all' || workoutActivityFilter !== 'all') 
                    ? 'Try different search or filter criteria' 
                    : 'No clients assigned yet'}
                </p>
                {(searchQuery || subscriptionStatusFilter !== 'all' || subscriptionTypeFilter !== 'all' || sessionStatusFilter !== 'all' || sessionTypeFilter !== 'all' || workoutActivityFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSubscriptionStatusFilter('all');
                      setSubscriptionTypeFilter('all');
                      setSessionStatusFilter('all');
                      setSessionTypeFilter('all');
                      setWorkoutActivityFilter('all');
                    }}
                    className="text-primary hover:text-primary/80 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
