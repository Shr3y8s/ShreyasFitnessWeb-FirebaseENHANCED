'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  deleteDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Button } from '@/components/ui/button';
import {
  User,
  Search,
  Trash2,
  AlertCircle,
  Clock,
  Shield,
  Mail
} from 'lucide-react';

interface PendingAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: string;
  tierName: string;
  paymentStatus: string;
  recaptchaScore?: number;
  recaptchaVerified?: boolean;
  createdAt: Timestamp;
  accountAge: string;
  ageInHours: number;
}

export default function PendingAccountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<PendingAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<PendingAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [recaptchaFilter, setRecaptchaFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate account age
  const getAccountAge = (createdAt: Timestamp): { age: string; hours: number } => {
    const now = Date.now();
    const created = createdAt.toMillis();
    const diffMs = now - created;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return { age: `${minutes} minute${minutes !== 1 ? 's' : ''} ago`, hours: diffHours };
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return { age: `${hours} hour${hours !== 1 ? 's' : ''} ago`, hours: diffHours };
    } else {
      const days = Math.floor(diffHours / 24);
      return { age: `${days} day${days !== 1 ? 's' : ''} ago`, hours: diffHours };
    }
  };

  // Fetch pending accounts with real-time updates
  useEffect(() => {
    if (!user) return;

    const pendingQuery = query(
      collection(db, 'users'),
      where('paymentStatus', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
      const accountsData: PendingAccount[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const { age, hours } = getAccountAge(data.createdAt);
        
        accountsData.push({
          id: doc.id,
          name: data.name || 'Unknown',
          email: data.email || 'No email',
          phone: data.phone,
          tier: data.tier || 'unknown',
          tierName: data.tierName || 'Unknown Plan',
          paymentStatus: data.paymentStatus,
          recaptchaScore: data.recaptchaScore,
          recaptchaVerified: data.recaptchaVerified,
          createdAt: data.createdAt,
          accountAge: age,
          ageInHours: hours
        });
      });
      
      setAccounts(accountsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...accounts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query)
      );
    }

    // Age filter
    if (ageFilter !== 'all') {
      filtered = filtered.filter(account => {
        if (ageFilter === 'under24') return account.ageInHours < 24;
        if (ageFilter === '24to48') return account.ageInHours >= 24 && account.ageInHours < 48;
        if (ageFilter === 'over48') return account.ageInHours >= 48;
        return true;
      });
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(account => account.tier === tierFilter);
    }

    // reCAPTCHA filter
    if (recaptchaFilter !== 'all') {
      filtered = filtered.filter(account => {
        if (recaptchaFilter === 'low') return account.recaptchaScore !== undefined && account.recaptchaScore < 0.5;
        if (recaptchaFilter === 'normal') return account.recaptchaScore === undefined || account.recaptchaScore >= 0.5;
        return true;
      });
    }

    setFilteredAccounts(filtered);
  }, [accounts, searchQuery, ageFilter, tierFilter, recaptchaFilter]);

  // Delete single account
  const handleDeleteAccount = async (accountId: string, accountEmail: string) => {
    setIsDeleting(true);
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', accountId));
      
      // Note: Deleting from Firebase Auth requires admin SDK or special permissions
      // This would typically be done via a Cloud Function
      console.log('Account deleted from Firestore:', accountId);
      
      setDeleteConfirmId(null);
      setSelectedIds(prev => prev.filter(id => id !== accountId));
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete accounts
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = selectedIds.map(id => 
        deleteDoc(doc(db, 'users', id))
      );
      
      await Promise.all(deletePromises);
      
      console.log(`Deleted ${selectedIds.length} accounts`);
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error bulk deleting accounts:', error);
      alert('Failed to delete some accounts. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelection = (accountId: string) => {
    setSelectedIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Select all filtered
  const selectAllFiltered = () => {
    if (selectedIds.length === filteredAccounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAccounts.map(a => a.id));
    }
  };

  const oldAccountsCount = accounts.filter(a => a.ageInHours >= 48).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading pending accounts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="pending-accounts" />

      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Accounts</h1>
            <p className="text-gray-600 mt-2">
              Manage accounts created but not yet paid
            </p>
          </div>

          {/* Warning Banner */}
          {accounts.length > 10 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    High Number of Pending Accounts
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have <strong>{accounts.length}</strong> pending accounts.
                    {oldAccountsCount > 5 && (
                      <> <strong>{oldAccountsCount}</strong> are older than 48 hours and should be reviewed.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            {/* Selection controls */}
            {filteredAccounts.length > 0 && (
              <div className="flex items-center justify-between pb-4 border-b">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredAccounts.length && filteredAccounts.length > 0}
                    onChange={selectAllFiltered}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-medium">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} selected`
                      : 'Select all'}
                  </span>
                </label>

                {selectedIds.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteConfirm(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedIds.length})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Ages</option>
                <option value="under24">Less than 24 hours</option>
                <option value="24to48">24-48 hours</option>
                <option value="over48">Over 48 hours</option>
              </select>

              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Tiers</option>
                <option value="in-person-training">In-Person Training</option>
                <option value="online-coaching">Online Coaching</option>
                <option value="complete-transformation">Complete Transformation</option>
                <option value="4-pack-training">4-Pack Training</option>
              </select>

              <select
                value={recaptchaFilter}
                onChange={(e) => setRecaptchaFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="all">All reCAPTCHA Scores</option>
                <option value="low">Low Score (&lt; 0.5)</option>
                <option value="normal">Normal Score (≥ 0.5)</option>
              </select>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between pt-4 border-t text-sm text-gray-600">
              <span>Showing {filteredAccounts.length} of {accounts.length} pending accounts</span>
              {oldAccountsCount > 0 && (
                <span className="text-orange-600 font-medium">
                  ⚠️ {oldAccountsCount} older than 48 hours
                </span>
              )}
            </div>
          </div>

          {/* Accounts List */}
          <div className="space-y-3">
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`bg-white rounded-xl border p-6 transition-all ${
                    selectedIds.includes(account.id) ? 'ring-2 ring-primary' : ''
                  } ${account.ageInHours >= 48 ? 'border-l-4 border-l-orange-400' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(account.id)}
                      onChange={() => toggleSelection(account.id)}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    />

                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                      {account.name.charAt(0)}
                    </div>

                    {/* Account Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {account.name}
                          </h3>
                          <p className="text-sm text-gray-600">{account.email}</p>
                          {account.phone && (
                            <p className="text-sm text-gray-500">{account.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className={`h-4 w-4 ${
                              account.ageInHours >= 48 ? 'text-red-500' :
                              account.ageInHours >= 24 ? 'text-orange-500' :
                              'text-gray-400'
                            }`} />
                            <span className={`text-sm font-medium ${
                              account.ageInHours >= 48 ? 'text-red-600' :
                              account.ageInHours >= 24 ? 'text-orange-600' :
                              'text-gray-600'
                            }`}>
                              {account.accountAge}
                            </span>
                          </div>
                          {account.recaptchaScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <Shield className={`h-4 w-4 ${
                                account.recaptchaScore < 0.5 ? 'text-red-500' : 'text-green-500'
                              }`} />
                              <span className={`text-sm ${
                                account.recaptchaScore < 0.5 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                Score: {account.recaptchaScore.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {account.tierName}
                        </span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Payment Pending
                        </span>
                        {account.recaptchaScore !== undefined && account.recaptchaScore < 0.5 && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            ⚠️ Low reCAPTCHA Score
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {/* TODO: Send reminder email */}}
                          disabled
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Reminder (Coming Soon)
                        </Button>
                        
                        {deleteConfirmId === account.id ? (
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteAccount(account.id, account.email)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConfirmId(account.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center">
                <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Pending Accounts
                </h3>
                <p className="text-gray-600">
                  {accounts.length === 0
                    ? 'All accounts have completed payment!'
                    : 'No accounts match your current filters.'}
                </p>
                {accounts.length > 0 && filteredAccounts.length === 0 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setAgeFilter('all');
                      setTierFilter('all');
                      setRecaptchaFilter('all');
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Confirm Bulk Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedIds.length}</strong> pending account{selectedIds.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBulkDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
