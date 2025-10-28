'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

interface TrainerData {
  id: string;
  name: string;
  email: string;
}

export default function ClientMessagesPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const messageInputRef = React.useRef<HTMLInputElement>(null);

  // Find the trainer for this client
  useEffect(() => {
    const findTrainer = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        console.log('[ClientMessages] Looking for assigned trainer...');
        
        // Use assigned trainer from user profile
        const assignedTrainerId = userData?.assignedTrainerId;
        
        if (assignedTrainerId) {
          console.log('[ClientMessages] Found assigned trainer ID:', assignedTrainerId);
          
          // Direct document fetch - much faster than collection query!
          const trainerDoc = await getDoc(doc(db, 'admins', assignedTrainerId));
          
          if (trainerDoc.exists()) {
            const admin = trainerDoc.data();
            
            console.log('[ClientMessages] Found coach:', {
              id: trainerDoc.id,
              name: admin.name,
              email: admin.email
            });
            
            setTrainerData({
              id: trainerDoc.id,
              name: admin.name || 'Your Coach',
              email: admin.email || ''
            });
          } else {
            console.log('[ClientMessages] Assigned trainer document not found');
          }
        } else {
          console.log('[ClientMessages] No trainer assigned to this client yet');
        }
      } catch (error) {
        console.error('[ClientMessages] Error fetching trainer:', error);
      }
      
      setLoading(false);
    };

    findTrainer();
  }, [user, userData, router]);

  // Subscribe to messages
  useEffect(() => {
    if (!user || !trainerData) return;

    const conversationId = [user.uid, trainerData.id].sort().join('_');
    
    const messagesQuery = query(
      collection(db, 'client_messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const messagesData: Message[] = [];
      const unreadMessages: string[] = [];
      
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
        
        // Collect unread messages from the trainer that need to be marked as read
        if (!data.read && data.senderId === trainerData.id) {
          unreadMessages.push(doc.id);
        }
      });
      
      setMessages(messagesData);
      
      // Mark trainer's messages as read (client has now viewed them)
      if (unreadMessages.length > 0) {
        const { doc: firestoreDoc, updateDoc } = await import('firebase/firestore');
        try {
          await Promise.all(
            unreadMessages.map(messageId =>
              updateDoc(firestoreDoc(db, 'client_messages', messageId), { read: true })
            )
          );
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
      
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        const container = document.querySelector('.messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [user, trainerData]);

  // Send message
  const handleSendMessage = async () => {
    if (!user || !trainerData || !messageContent.trim()) return;

    const messageText = messageContent.trim();
    const conversationId = [user.uid, trainerData.id].sort().join('_');
    
    // Create optimistic message for immediate display
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user.uid,
      senderName: userData?.name || 'You',
      content: messageText,
      createdAt: new Date(),
      read: false
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setMessageContent('');
    
    // Multiple focus attempts to overcome Firestore re-render timing issues
    setTimeout(() => messageInputRef.current?.focus(), 10);
    setTimeout(() => messageInputRef.current?.focus(), 50);
    setTimeout(() => messageInputRef.current?.focus(), 100);
    setTimeout(() => messageInputRef.current?.focus(), 200);
    
    // Scroll to bottom
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
        senderName: userData?.name || 'Client',
        recipientId: trainerData.id,
        content: messageText,
        createdAt: serverTimestamp(),
        read: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!trainerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-gray-400 mb-4 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Coach Assigned</h3>
          <p className="text-gray-600 mb-4">You don't have a coach assigned yet.</p>
          <Button onClick={() => router.push('/dashboard/client')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      const { signOutUser } = await import('@/lib/firebase');
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SidebarProvider>
      <ClientSidebar 
        userName={userData?.name}
        userTier={userData?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <button 
                onClick={() => router.push('/dashboard/client')}
                className="flex items-center text-sm text-gray-600 hover:text-primary transition-colors mb-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-foreground">Coach Inbox</h1>
              <p className="text-muted-foreground mt-1">
                Message your coach directly
              </p>
            </div>

        {/* Messages Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-200/60 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Chat Header */}
          <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                {trainerData.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold">{trainerData.name}</h2>
                <p className="text-sm text-gray-600">Your Coach</p>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 messages-container">
            {messages.length > 0 ? (
              messages.map((message) => {
                const isClient = message.senderId === user?.uid;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isClient ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`rounded-lg p-4 ${
                          isClient
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
                <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
                <p className="text-gray-600">Start the conversation with your coach below</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <input
                ref={messageInputRef}
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
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
