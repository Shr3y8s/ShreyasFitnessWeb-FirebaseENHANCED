'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  subscribeToContactSubmissions,
  updateContactStatus,
  deleteContactSubmission,
  createReply,
  getServiceTypes
} from '@/lib/contact-api';
import type { ContactSubmission, ContactStatus } from '@/types/contact';
import { 
  Search, 
  Filter,
  RefreshCw,
  Mail,
  MailOpen,
  MessageSquare,
  Tag,
  SortDesc,
  X,
  Trash2,
  Send,
  Phone,
  Clock,
  User,
  Reply
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TrainerSidebar from '@/components/TrainerSidebar';

type SortOption = 'DATE_DESC' | 'DATE_ASC' | 'SERVICE' | 'PRIORITY';

export default function InboxPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ContactSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('DATE_DESC');
  
  // Service types
  const [serviceTypes, setServiceTypes] = useState<string[]>(['ALL']);
  
  // Reply state
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Load service types
  useEffect(() => {
    async function loadServices() {
      const services = await getServiceTypes();
      setServiceTypes(['ALL', ...services]);
    }
    loadServices();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToContactSubmissions(
      (subs) => {
        setSubmissions(subs);
        setLoading(false);
      },
      undefined,
      undefined
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Calculate message counts
  const messageCounts = useMemo(() => {
    return {
      total: submissions.length,
      unread: submissions.filter(s => s.Status === 'Unread').length,
      read: submissions.filter(s => s.Status === 'Read').length,
      replied: submissions.filter(s => s.Status === 'Replied').length
    };
  }, [submissions]);

  // Filter and sort submissions
  useEffect(() => {
    let filtered = [...submissions];

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(s => s.Status === statusFilter);
    }

    // Service filter
    if (serviceFilter !== 'ALL') {
      filtered = filtered.filter(s => s.Service === serviceFilter);
    }

    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(s =>
        s.Name.toLowerCase().includes(search) ||
        s.Email.toLowerCase().includes(search) ||
        s.Message.toLowerCase().includes(search) ||
        s.ServiceDisplayText.toLowerCase().includes(search)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'DATE_DESC':
          return b.Sent.toMillis() - a.Sent.toMillis();
        case 'DATE_ASC':
          return a.Sent.toMillis() - b.Sent.toMillis();
        case 'SERVICE':
          return a.ServiceDisplayText.localeCompare(b.ServiceDisplayText);
        case 'PRIORITY':
          const priorityOrder = { 'Unread': 0, 'Read': 1, 'Replied': 2 };
          const diff = priorityOrder[a.Status] - priorityOrder[b.Status];
          if (diff !== 0) return diff;
          return b.Sent.toMillis() - a.Sent.toMillis();
        default:
          return 0;
      }
    });

    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, serviceFilter, searchText, sortBy]);

  // Handle message selection with auto-mark as read
  const handleSelectMessage = async (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setReplies([]); // Clear old replies
    
    // AUTO-MARK AS READ: Unread messages automatically become Read when opened
    if (submission.Status === 'Unread') {
      try {
        await updateContactStatus(submission.id, 'Read');
        
        // Update detail view
        setSelectedSubmission({ ...submission, Status: 'Read' });
        
        // ALSO update message list so the status indicator updates immediately
        setSubmissions(prevSubmissions =>
          prevSubmissions.map(s =>
            s.id === submission.id ? { ...s, Status: 'Read' } : s
          )
        );
      } catch (error) {
        console.error('Error marking as read:', error);
        // Don't show error to user - this is automatic background action
      }
    }
    
    // Fetch replies with 300ms loading delay (prevents flicker)
    fetchRepliesWithDelay(submission.id);
  };
  
  // Fetch replies with loading delay to prevent UI flicker
  const fetchRepliesWithDelay = async (submissionId: string) => {
    let loadingTimer: NodeJS.Timeout | null = null;
    
    // Only show loading if it takes longer than 300ms
    loadingTimer = setTimeout(() => {
      setLoadingReplies(true);
    }, 300);
    
    try {
      const { getContactSubmission } = await import('@/lib/contact-api');
      const submissionWithReplies = await getContactSubmission(submissionId);
      
      if (submissionWithReplies && submissionWithReplies.replies) {
        setReplies(submissionWithReplies.replies);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      setLoadingReplies(false);
    }
  };

  // Handle status change with proper error handling
  const handleStatusChange = async (submissionId: string, newStatus: ContactStatus) => {
    try {
      await updateContactStatus(submissionId, newStatus);
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, Status: newStatus });
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      
      // Show specific error message for terminal state violation
      if (error.message?.includes('replied to cannot be marked')) {
        alert('Cannot change status: Messages that have been replied to cannot be marked as unread or read.');
      } else if (error.message?.includes('Message not found')) {
        alert('Message not found. It may have been deleted.');
      } else {
        alert('Failed to update status. Please try again.');
      }
    }
  };

  // Handle delete
  const handleDelete = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteContactSubmission(submissionId);
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission(null);
      }
      alert('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  // Handle send reply with optimistic updates
  const handleSendReply = async () => {
    if (!selectedSubmission || !replyContent.trim() || !user) return;

    // Store content before clearing for optimistic update
    const replyText = replyContent;
    
    // Immediately update UI state for instant feedback
    setSendingReply(true);
    
    // Create optimistic reply with temporary ID
    const optimisticReply = {
      id: `temp-${Date.now()}`,
      content: replyText,
      sentBy: user.email || 'Trainer',
      createdAt: new Date(),
      sentAt: new Date()
    };
    
    // Add reply to list FIRST (optimistic update)
    setReplies(prevReplies => [...prevReplies, optimisticReply]);
    
    // Clear input immediately for better UX
    setReplyContent('');
    
    // Auto-scroll to bottom AFTER state update
    setTimeout(() => {
      const replyContainer = document.querySelector('.replies-container');
      if (replyContainer) {
        replyContainer.scrollTop = replyContainer.scrollHeight;
      }
    }, 100);
    
    try {
      // Perform API operations in background
      const createdReply = await createReply(selectedSubmission.id, replyText, user.email || 'Trainer');
      
      // Update with real reply data (silently replace optimistic)
      if (createdReply && createdReply.id) {
        setReplies(currentReplies => 
          currentReplies.map(reply => 
            reply.id === optimisticReply.id ? createdReply : reply
          )
        );
      }
      
      // Update local submission status
      if (selectedSubmission) {
        setSelectedSubmission({ ...selectedSubmission, Status: 'Replied' });
      }
      
      // Show success message with slight delay
      setTimeout(() => {
        alert('Reply sent successfully!');
      }, 300);
      
    } catch (err) {
      console.error('Error sending reply:', err);
      // Keep optimistic update but show error
      alert('Network error. Reply may not have been saved properly.');
    } finally {
      setSendingReply(false);
    }
  };

  // Get status color
  const getStatusColor = (status: ContactStatus) => {
    switch (status) {
      case 'Unread':
        return 'bg-green-500';
      case 'Read':
        return 'bg-blue-500';
      case 'Replied':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading inbox...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Shared Trainer Sidebar */}
      <TrainerSidebar currentPage="inbox" />

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Contact Inbox</h1>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Message Counts */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">{messageCounts.unread}</span>
              <span className="text-gray-600">Unread</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600">{messageCounts.read}</span>
              <span className="text-gray-600">Read</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">{messageCounts.replied}</span>
              <span className="text-gray-600">Replied</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{messageCounts.total}</span>
              <span className="text-gray-600">Total</span>
            </div>
          </div>
        </div>
      </div>

        {/* Filters */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ContactStatus | 'ALL')}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
              >
                <option value="ALL">All Status</option>
                <option value="Unread">Unread</option>
                <option value="Read">Read</option>
                <option value="Replied">Replied</option>
              </select>
            </div>

            {/* Service Filter */}
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
              >
                {serviceTypes.map(service => (
                  <option key={service} value={service}>
                    {service === 'ALL' ? 'All Services' : service}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <SortDesc className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
              >
                <option value="DATE_DESC">Newest First</option>
                <option value="DATE_ASC">Oldest First</option>
                <option value="SERVICE">By Service</option>
                <option value="PRIORITY">By Priority</option>
              </select>
            </div>
          </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Message List */}
          <div className="lg:col-span-2 space-y-2">
            {filteredSubmissions.length === 0 ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <Mail className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Messages Found</h3>
                <p className="text-gray-600">
                  {searchText || statusFilter !== 'ALL' || serviceFilter !== 'ALL'
                    ? 'Try adjusting your filters'
                    : 'No contact form submissions yet'}
                </p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => handleSelectMessage(submission)}
                  className={`bg-white rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                    selectedSubmission?.id === submission.id ? 'ring-2 ring-primary' : ''
                  } ${submission.Status === 'Unread' ? 'bg-blue-50' : ''}`}
                >
                  {/* Header Row: Service badge + Status dot + Date */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                      {submission.ServiceDisplayText}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(submission.Status)}`} title={submission.Status} />
                      <span className="text-xs text-gray-500">
                        {formatDate(submission.Sent)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Preview Row: Name + Message */}
                  <div className="text-sm text-gray-800">
                    <strong>{submission.Name}:</strong> {submission.Message.substring(0, 80)}
                    {submission.Message.length > 80 && '...'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-3">
            {selectedSubmission ? (
              <div className="bg-white rounded-lg border">
                {/* Ultra-Compact Info-Rich Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-semibold">{selectedSubmission.Name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{selectedSubmission.ServiceDisplayText}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">
                          {selectedSubmission.Sent.toDate().toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status Toggle Button */}
                      <button
                        onClick={() => {
                          if (selectedSubmission.Status === 'Unread') {
                            handleStatusChange(selectedSubmission.id, 'Read');
                          } else if (selectedSubmission.Status === 'Read') {
                            handleStatusChange(selectedSubmission.id, 'Unread');
                          }
                        }}
                        disabled={selectedSubmission.Status === 'Replied'}
                        className={`w-8 h-8 rounded flex items-center justify-center font-semibold text-xs ${
                          selectedSubmission.Status === 'Unread' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          selectedSubmission.Status === 'Read' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                          'bg-gray-100 text-gray-500 cursor-not-allowed'
                        }`}
                        title={
                          selectedSubmission.Status === 'Unread' ? 'Mark as Read' :
                          selectedSubmission.Status === 'Read' ? 'Mark as Unread' :
                          'Cannot change status - already replied'
                        }
                      >
                        {selectedSubmission.Status === 'Unread' ? 'U' : 
                         selectedSubmission.Status === 'Read' ? 'R' : 'R'}
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(selectedSubmission.id)}
                        className="w-8 h-8 rounded flex items-center justify-center hover:bg-red-50"
                        title="Delete message"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                      
                      {/* Close Button */}
                      <button
                        onClick={() => setSelectedSubmission(null)}
                        className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-100"
                        title="Close"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ultra-Compact Single-Line Metadata */}
                <div className="p-4 border-b">
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    {/* Email */}
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <a href={`mailto:${selectedSubmission.Email}`} className="text-blue-600 hover:underline">
                        {selectedSubmission.Email}
                      </a>
                    </div>
                    
                    {/* Phone */}
                    {selectedSubmission.Phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <a href={`tel:${selectedSubmission.Phone}`} className="text-blue-600 hover:underline">
                          {selectedSubmission.Phone}
                        </a>
                      </div>
                    )}
                    
                    {/* Newsletter */}
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        {selectedSubmission.Newsletter ? '✓ Newsletter' : 'No newsletter'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Icon-Based Message Content (No Heading) */}
                <div className="p-4 border-b">
                  <div className="flex items-start gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed flex-1">
                      {selectedSubmission.Message}
                    </p>
                  </div>
                </div>

                {/* Reply History with Inline Reply Button */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Reply History</h4>
                    {!isReplying && (
                      <Button
                        onClick={() => setIsReplying(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Reply className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                    )}
                  </div>
                  
                  {/* Collapsible Reply Form */}
                  {isReplying && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Your Reply</h5>
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Type your reply here..."
                        rows={6}
                        disabled={sendingReply}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 text-sm"
                      />
                      <div className="mt-3 flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setIsReplying(false);
                            setReplyContent('');
                          }}
                          variant="outline"
                          size="sm"
                          disabled={sendingReply}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyContent.trim() || sendingReply}
                          size="sm"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sendingReply ? 'Sending...' : 'Send Reply'}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Reply List */}
                  {loadingReplies ? (
                    <div className="text-center py-4 text-gray-500">
                      <div className="animate-pulse">Loading replies...</div>
                    </div>
                  ) : replies.length > 0 ? (
                    <div className="replies-container space-y-3 max-h-96 overflow-y-auto">
                      {replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              From: {reply.sentBy}
                            </span>
                            <span className="text-xs text-gray-500">
                              {reply.sentAt ? new Date(reply.sentAt.toDate ? reply.sentAt.toDate() : reply.sentAt).toLocaleString() : ''}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {reply.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p>No replies yet. Be the first to respond!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-12 text-center">
                <MailOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Message Selected</h3>
                <p className="text-gray-600">Select a message from the list to view details</p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
