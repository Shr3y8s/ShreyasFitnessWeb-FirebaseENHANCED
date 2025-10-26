'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
import {
  Users,
  Search,
  Send,
  Mail,
  MailOpen,
  Clock,
  X,
  ChevronRight,
  Eye,
  MessageSquarePlus
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

interface Conversation {
  clientId: string;
  clientName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export default function ClientMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Mode state
  const [mode, setMode] = useState<'compose' | 'view'>('view');
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  
  // Selection state (compose mode)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [showPreSelectionBanner, setShowPreSelectionBanner] = useState(false);
  
  // View mode state
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Compose mode state
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<Set<string>>(new Set());
  
  // UI state
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  const activeClient = clients.find(c => c.id === activeClientId);

  // Check for pre-selected clients from URL (for compose mode)
  useEffect(() => {
    const preSelectedClients = searchParams.get('clients');
    const urlMode = searchParams.get('mode');
    
    if (preSelectedClients) {
      const clientIds = preSelectedClients.split(',');
      setSelectedClientIds(clientIds);
      setShowPreSelectionBanner(true);
      if (urlMode === 'compose') {
        setMode('compose');
      }
    } else {
      // Check for single client (view mode)
      const clientId = searchParams.get('clientId');
      if (clientId && clients.length > 0) {
        setActiveClientId(clientId);
        setMode('view');
      }
    }
  }, [searchParams, clients]);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data();
          
          if (data?.role !== 'trainer' && data?.role !== 'admin') {
            router.push('/dashboard/client');
            return;
          }
          
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client'),
            orderBy('createdAt', 'desc')
          );
          
          const clientsSnapshot = await getDocs(clientsQuery);
          const clientsData: ClientData[] = [];
          
          clientsSnapshot.forEach((doc) => {
            const clientInfo = doc.data();
            clientsData.push({
              id: doc.id,
              name: clientInfo.name,
              email: clientInfo.email,
              tier: clientInfo.tier
            });
          });
          
          setClients(clientsData);
          
          // Auto-select first client in view mode if none selected
          if (clientsData.length > 0 && !activeClientId && mode === 'view') {
            setActiveClientId(clientsData[0].id);
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
        }
      }
      setLoading(false);
    };

    fetchClients();
  }, [user, router]);

  // Subscribe to messages for active client (view mode)
  useEffect(() => {
    if (!user || !activeClientId || mode !== 'view') return;

    const conversationId = [user.uid, activeClientId].sort().join('_');
    
    const messagesQuery = query(
      collection(db, 'client_messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderName: data.senderName,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
          read: data.read || false
        });
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [user, activeClientId, mode]);

  // Load conversation summaries
  useEffect(() => {
    if (!user || clients.length === 0) return;

    const loadConversations = async () => {
      const convMap = new Map<string, Conversation>();
      
      for (const client of clients) {
        const conversationId = [user.uid, client.id].sort().join('_');
        
        try {
          const messagesQuery = query(
            collection(db, 'client_messages'),
            where('conversationId', '==', conversationId),
            orderBy('createdAt', 'desc')
          );
          
          const snapshot = await getDocs(messagesQuery);
          
          if (!snapshot.empty) {
            const lastMsg = snapshot.docs[0].data();
            const unreadCount = snapshot.docs.filter(doc => {
              const data = doc.data();
              return !data.read && data.senderId === client.id;
            }).length;
            
            convMap.set(client.id, {
              clientId: client.id,
              clientName: client.name,
              lastMessage: lastMsg.content,
              lastMessageTime: lastMsg.createdAt?.toDate() || new Date(),
              unreadCount
            });
          }
        } catch (error) {
          console.error(`Error loading conversation for ${client.name}:`, error);
        }
      }
      
      setConversations(convMap);
    };

    loadConversations();
  }, [user, clients, messages]);

  // Search through all messages (debounced)
  useEffect(() => {
    if (!user || !conversationSearchQuery.trim() || mode !== 'view') {
      setMessageSearchResults(new Set());
      return;
    }

    const searchMessages = async () => {
      const searchTerm = conversationSearchQuery.toLowerCase();
      const matchingClientIds = new Set<string>();

      // Search through all conversations
      for (const client of clients) {
        const conversationId = [user.uid, client.id].sort().join('_');
        
        try {
          const messagesQuery = query(
            collection(db, 'client_messages'),
            where('conversationId', '==', conversationId)
          );
          
          const snapshot = await getDocs(messagesQuery);
          
          // Check if any message in this conversation matches the search
          const hasMatch = snapshot.docs.some(doc => {
            const data = doc.data();
            return data.content?.toLowerCase().includes(searchTerm);
          });
          
          if (hasMatch) {
            matchingClientIds.add(client.id);
          }
        } catch (error) {
          console.error(`Error searching messages for ${client.name}:`, error);
        }
      }
      
      setMessageSearchResults(matchingClientIds);
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchMessages();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [user, conversationSearchQuery, clients, mode]);

  // Filter clients (compose mode)
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter conversations (view mode)
  const filteredConversations = clients.filter(client => {
    const conversation = conversations.get(client.id);
    const query = conversationSearchQuery.toLowerCase();
    
    // Quick matches (instant)
    const matchesNameOrEmail = 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query);
    
    const matchesLastMessage = 
      conversation?.lastMessage?.toLowerCase().includes(query) ?? false;
    
    // Full message history match (from async search)
    const matchesMessageHistory = messageSearchResults.has(client.id);
    
    return matchesNameOrEmail || matchesLastMessage || matchesMessageHistory;
  });

  // Selection handlers (compose mode)
  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.length === filteredClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map(c => c.id));
    }
  };

  const clearSelection = () => {
    setSelectedClientIds([]);
    setMessageSubject('');
    setMessageBody('');
    setShowPreSelectionBanner(false);
  };

  // Send group message (compose mode)
  const handleSendGroupMessage = async () => {
    if (!user || selectedClientIds.length === 0 || !messageSubject.trim() || !messageBody.trim()) return;

    setIsProcessing(true);
    try {
      // Send message to each selected client
      const promises = selectedClientIds.map(async (clientId) => {
        const conversationId = [user.uid, clientId].sort().join('_');
        
        await addDoc(collection(db, 'client_messages'), {
          conversationId,
          senderId: user.uid,
          senderName: 'Trainer',
          recipientId: clientId,
          subject: messageSubject.trim(),
          content: messageBody.trim(),
          createdAt: serverTimestamp(),
          read: false,
          isGroupMessage: true
        });
      });

      await Promise.all(promises);

      alert(`Success! Message sent to ${selectedClientIds.length} client${selectedClientIds.length !== 1 ? 's' : ''}!`);
      
      // Clear form and switch to view mode
      clearSelection();
      setMode('view');
    } catch (error) {
      console.error('Error sending group message:', error);
      alert('An error occurred while sending the message.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send individual message (view mode)
  const handleSendMessage = async () => {
    if (!user || !activeClientId || !messageContent.trim()) return;

    const messageText = messageContent.trim();
    const conversationId = [user.uid, activeClientId].sort().join('_');
    
    // Create optimistic message for immediate display
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user.uid,
      senderName: 'Trainer',
      content: messageText,
      createdAt: new Date(),
      read: false
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setMessageContent('');
    
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);

    setSending(true);
    try {
      await addDoc(collection(db, 'client_messages'), {
        conversationId,
        senderId: user.uid,
        senderName: 'Trainer',
        recipientId: activeClientId,
        content: messageText,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setMessageContent(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="messages" />

      <div className="ml-64 p-8">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <button 
              onClick={() => router.push('/dashboard/trainer/clients')}
              className="text-gray-900 font-medium hover:text-primary transition-colors"
            >
              Client Management
            </button>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-gray-900 font-medium">Client Inbox</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Client Inbox</h1>
          <p className="text-muted-foreground mt-1">
            {conversations.size} conversations • {Array.from(conversations.values()).reduce((sum, conv) => sum + conv.unreadCount, 0)} unread
          </p>
        </div>

        {/* Mode Toggle - Segmented Control */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-1">
            <button
              onClick={() => setMode('compose')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'compose'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquarePlus className="h-4 w-4 inline mr-2" />
              Compose Message
            </button>
            <button
              onClick={() => setMode('view')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'view'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              View Conversations
            </button>
          </div>
        </div>

        {/* Master-Detail Split View */}
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* LEFT PANEL */}
          <div className="w-[35%] flex flex-col bg-white rounded-xl border overflow-hidden">
            {mode === 'compose' ? (
              /* COMPOSE MODE: Client Selector */
              <>
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold mb-3">Select Recipients</h3>
                  
                  {showPreSelectionBanner && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="text-blue-800">
                        {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} pre-selected from Client Management
                      </p>
                    </div>
                  )}
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    />
                    Select All ({filteredClients.length})
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredClients.map((client) => {
                    const isSelected = selectedClientIds.includes(client.id);
                    const conversation = conversations.get(client.id);
                    
                    return (
                      <div
                        key={client.id}
                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                {client.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{client.name}</p>
                                <p className="text-sm text-gray-600 truncate">{client.email}</p>
                              </div>
                            </div>
                            {conversation && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                                <span>{formatTime(conversation.lastMessageTime)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedClientIds.length > 0 && (
                  <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                    <p className="text-sm font-medium mb-2">
                      {selectedClientIds.length} recipient{selectedClientIds.length !== 1 ? 's' : ''} selected
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="w-full"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* VIEW MODE: Conversations List */
              <>
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold mb-3">Conversations</h3>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={conversationSearchQuery}
                      onChange={(e) => setConversationSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length > 0 ? (
                    <div className="divide-y">
                      {filteredConversations.map((client) => {
                        const conversation = conversations.get(client.id);
                        const hasUnread = conversation && conversation.unreadCount > 0;
                        
                        return (
                          <button
                            key={client.id}
                            onClick={() => setActiveClientId(client.id)}
                            className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                              activeClientId === client.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                            } ${hasUnread ? 'bg-blue-50/30' : ''}`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {client.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`font-medium truncate ${hasUnread ? 'font-bold' : ''}`}>
                                    {client.name}
                                  </p>
                                  {conversation && (
                                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                      {formatTime(conversation.lastMessageTime)}
                                    </span>
                                  )}
                                </div>
                                {conversation ? (
                                  <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                    {conversation.lastMessage}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-400 italic">No messages yet</p>
                                )}
                              </div>
                              {hasUnread && (
                                <div className="flex-shrink-0">
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-white text-xs font-bold rounded-full">
                                    {conversation.unreadCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <Search className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-600">No conversations found</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="w-[65%] bg-white rounded-xl border overflow-hidden flex flex-col">
            {mode === 'compose' ? (
              /* COMPOSE MODE: Message Composer */
              selectedClientIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Users className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Select Recipients to Get Started</h3>
                  <p className="text-gray-600">Choose one or more clients from the list to send a message</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Sending to {selectedClientIds.length} Recipient{selectedClientIds.length !== 1 ? 's' : ''}</h3>
                      <Button variant="ghost" size="sm" onClick={clearSelection}>
                        <X className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedClientIds.map(clientId => {
                        const client = clients.find(c => c.id === clientId);
                        if (!client) return null;
                        return (
                          <span key={clientId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {client.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Composer */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                      <label className="font-semibold mb-2 block">Subject *</label>
                      <input
                        type="text"
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        placeholder="Enter message subject..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="font-semibold mb-2 block">Message *</label>
                      <textarea
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="Type your message..."
                        rows={12}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        {messageBody.length} characters
                      </p>
                    </div>

                    {messageSubject && messageBody && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Summary:</strong> Sending "{messageSubject}" to{' '}
                          <strong>{selectedClientIds.length} recipient{selectedClientIds.length !== 1 ? 's' : ''}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t bg-gray-50 flex gap-3 flex-shrink-0">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearSelection}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={!messageSubject.trim() || !messageBody.trim() || isProcessing}
                      onClick={handleSendGroupMessage}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isProcessing ? 'Sending...' : `Send to ${selectedClientIds.length} Client${selectedClientIds.length !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </>
              )
            ) : (
              /* VIEW MODE: Message Thread */
              activeClient ? (
                <>
                  {/* Chat Header */}
                  <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {activeClient.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{activeClient.name}</h2>
                        <p className="text-sm text-gray-600">{activeClient.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages Container */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 messages-container">
                    {messages.length > 0 ? (
                      messages.map((message) => {
                        const isTrainer = message.senderId === user?.uid;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isTrainer ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isTrainer ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`rounded-lg p-4 ${
                                  isTrainer
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 px-2">
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Mail className="h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
                        <p className="text-gray-600">Start the conversation by sending a message below</p>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim() || sending}
                        className="px-6"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Mail className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Conversation Selected</h3>
                  <p className="text-gray-600">Select a client from the list to view messages</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
