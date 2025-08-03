// Import required modules
import { Amplify } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/+esm';
import AuthHandler from './auth.js';
import ApiHandler from './api.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in and is a coach
    try {
        const authResult = await AuthHandler.currentAuthenticatedUser();
        if (!authResult.success) {
            // Not logged in, redirect to login page
            window.location.href = 'account.html';
            return;
        }
        
        const isCoach = await AuthHandler.isCoach();
        if (!isCoach) {
            // Not a coach, redirect to client dashboard
            window.location.href = 'account.html';
            return;
        }
        
        // User is logged in and is a coach, initialize dashboard
        initDashboard();
    } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = 'account.html';
    }
    
    // Initialize dashboard functionality
    function initDashboard() {
        // Tab switching
        const tabs = document.querySelectorAll('.dashboard-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs and content
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Add active class to clicked tab and corresponding content
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // Load data for the selected tab
                if (tabId === 'messages') {
                    loadMessages();
                } else if (tabId === 'users') {
                    loadUsers();
                }
            });
        });
        
        // Logout functionality
        document.getElementById('logout-btn').addEventListener('click', async function() {
            try {
                await AuthHandler.signOut();
                window.location.href = 'account.html';
            } catch (error) {
                console.error('Error signing out:', error);
            }
        });
        
        // Back to list button
        document.getElementById('back-to-list-btn').addEventListener('click', function() {
            document.getElementById('message-detail-view').style.display = 'none';
            document.getElementById('message-list-view').style.display = 'block';
        });
        
        // Archive message button
        document.getElementById('archive-message-btn').addEventListener('click', async function() {
            const messageId = this.getAttribute('data-message-id');
            if (!messageId) return;
            
            try {
                const result = await ApiHandler.archiveMessage(messageId);
                if (result.success) {
                    // Show success message
                    alert('Message archived successfully');
                    
                    // Go back to list and reload messages
                    document.getElementById('message-detail-view').style.display = 'none';
                    document.getElementById('message-list-view').style.display = 'block';
                    loadMessages();
                } else {
                    alert('Error archiving message: ' + result.error);
                }
            } catch (error) {
                console.error('Error archiving message:', error);
                alert('An unexpected error occurred');
            }
        });
        
        // Reply message button
        document.getElementById('reply-message-btn').addEventListener('click', function() {
            const email = document.getElementById('detail-sender-email').textContent;
            window.location.href = `mailto:${email}`;
        });
        
        // Load initial data
        loadMessages();
    }
    
    // Load messages
    async function loadMessages() {
        const messageList = document.querySelector('.message-list');
        messageList.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading messages...</p>
            </div>
        `;
        
        try {
            const result = await ApiHandler.getAllMessages();
            if (result.success) {
                if (result.messages.length === 0) {
                    messageList.innerHTML = `
                        <div style="padding: 2rem; text-align: center;">
                            <p>No messages found.</p>
                        </div>
                    `;
                    return;
                }
                
                // Sort messages by date (newest first)
                const messages = result.messages.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                
                // Generate HTML for each message
                let html = '';
                messages.forEach(message => {
                    const date = new Date(message.createdAt);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    html += `
                        <div class="message-item ${message.read ? '' : 'unread'}" data-message-id="${message.id}">
                            <div class="message-status">
                                <div class="status-indicator"></div>
                            </div>
                            <div class="message-content">
                                <div class="message-sender">${message.senderName}</div>
                                <div class="message-subject">${message.subject}</div>
                                <div class="message-preview">${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}</div>
                            </div>
                            <div class="message-meta">
                                <div class="message-date">${formattedDate}</div>
                                <div class="message-actions">
                                    <button class="message-action-btn view" title="View Message">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="message-action-btn archive" title="Archive Message">
                                        <i class="fas fa-archive"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                messageList.innerHTML = html;
                
                // Add event listeners to message items
                document.querySelectorAll('.message-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const messageId = this.getAttribute('data-message-id');
                        showMessageDetail(messageId, messages);
                    });
                });
                
                // Add event listeners to archive buttons
                document.querySelectorAll('.message-action-btn.archive').forEach(btn => {
                    btn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        const messageId = this.closest('.message-item').getAttribute('data-message-id');
                        
                        try {
                            const result = await ApiHandler.archiveMessage(messageId);
                            if (result.success) {
                                // Show success message
                                alert('Message archived successfully');
                                
                                // Reload messages
                                loadMessages();
                            } else {
                                alert('Error archiving message: ' + result.error);
                            }
                        } catch (error) {
                            console.error('Error archiving message:', error);
                            alert('An unexpected error occurred');
                        }
                    });
                });
            } else {
                messageList.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <p>Error loading messages: ${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            messageList.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p>An unexpected error occurred while loading messages.</p>
                </div>
            `;
        }
    }
    
    // Show message detail
    async function showMessageDetail(messageId, messages) {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;
        
        // Update message detail view
        document.getElementById('detail-sender-name').textContent = message.senderName;
        document.getElementById('detail-sender-email').textContent = message.senderEmail;
        document.getElementById('detail-date').textContent = new Date(message.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        
        const detailSubject = document.querySelector('.message-detail-subject');
        detailSubject.textContent = message.subject;
        
        const detailContent = document.getElementById('detail-content');
        detailContent.textContent = message.content;
        
        // Set message ID for archive button
        document.getElementById('archive-message-btn').setAttribute('data-message-id', messageId);
        
        // Show detail view, hide list view
        document.getElementById('message-list-view').style.display = 'none';
        document.getElementById('message-detail-view').style.display = 'block';
        
        // Mark message as read if it's unread
        if (!message.read) {
            try {
                await ApiHandler.markMessageAsRead(messageId);
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        }
    }
    
    // Load users
    async function loadUsers() {
        const userList = document.querySelector('.user-list');
        userList.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        `;
        
        // This functionality will be implemented in a future update
        userList.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <p>User management functionality will be implemented in a future update.</p>
            </div>
        `;
    }
});
