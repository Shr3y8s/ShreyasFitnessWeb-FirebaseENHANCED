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
  ChevronRight
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
  
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());

  const activeClient = clients.find(c => c.id === activeClientId);

  // Check for pre-selected client from URL params
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId && clients.length > 0) {
      setActiveClientId(clientId);
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
          
          // Auto-select first client if none selected
          if (clientsData.length > 0 && !activeClientId) {
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

  // Subscribe to messages for active client
  useEffect(() => {
    if (!user || !activeClientId) return;

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
  }, [user, activeClientId]);

  // Load conversation summaries for all clients
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

  // Filter clients
  useEffect(() => {
    let filtered = [...clients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  }, [clients, searchQuery]);

  // Send message
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

    // Add optimistic message to state immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageContent('');
    
    // Scroll to bottom immediately
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
      
      // Real-time listener will replace optimistic message with real one
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setMessageContent(messageText); // Restore message content
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
        <div className="text-stone-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="messages" />

      <div className="ml-64 p-8">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <button 
              onClick={() => router.push('/dashboard/trainer/clients')}
              className="hover:text-primary transition-colors"
            >
              Client Management
            </button>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-gray-900 font-medium">Client Inbox</span>
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Inbox</h1>
            <p className="text-muted-foreground mt-1">Direct messaging with your clients</p>
          </div>
        </div>

        {/* Master-Detail Split View */}
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* LEFT PANEL: Conversations List (35%) */}
          <div className="w-[35%] flex flex-col bg-white rounded-xl border overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {filteredClients.length > 0 ? (
                <div className="divide-y">
                  {filteredClients.map((client) => {
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
                  <p className="text-gray-600">No clients found</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Message Thread (65%) */}
          <div className="w-[65%] bg-white rounded-xl border overflow-hidden flex flex-col">
            {activeClient ? (
              <>
                {/* Chat Header */}
                <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50">
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
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex gap-3">
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      rows={3}
                      disabled={sending}
                      className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageContent.trim() || sending}
                      className="self-end"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MailOpen className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Conversation Selected</h3>
                <p className="text-gray-600">Select a client from the list to view your conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
