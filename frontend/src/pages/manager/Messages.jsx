import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import '../../styles/messages.css';

const ROLE_COLORS = {
  Admin: { color: '#DC2626', bg: '#FEF2F2' },
  Manager: { color: '#7C3AED', bg: '#F5F3FF' },
  Engineer: { color: '#059669', bg: '#ECFDF5' },
  Client: { color: '#2563EB', bg: '#EFF6FF' },
};

function getInitial(name) {
  return name?.charAt(0).toUpperCase() || '?';
}

function getAvatarColor(role) {
  return ROLE_COLORS[role] || ROLE_COLORS.Client;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = d.toDateString() === today.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function shouldShowDateSeparator(prevMsg, currMsg) {
  if (!prevMsg) return true;
  const prevDate = new Date(prevMsg.CreatedAt).toDateString();
  const currDate = new Date(currMsg.CreatedAt).toDateString();
  return prevDate !== currDate;
}

function parseAttachmentMessage(messageText) {
  if (!messageText || typeof messageText !== 'string') return null;
  if (!messageText.startsWith('[ATTACHMENT]')) return null;

  try {
    const payload = JSON.parse(messageText.replace('[ATTACHMENT]', ''));
    if (!payload?.fileUrl) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function toAbsoluteFileUrl(fileUrl) {
  if (!fileUrl) return '#';
  if (fileUrl.startsWith('http')) return fileUrl;

  const apiBase = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  return `${apiBase}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
}

function formatConversationPreview(lastMessage) {
  const attachment = parseAttachmentMessage(lastMessage);
  if (!attachment) return lastMessage || '';
  return `📎 ${attachment.fileName || 'Attachment'}`;
}

// ═════════════════════════════════════════════════════════
// NEW CHAT MODAL
// ═════════════════════════════════════════════════════════
function NewChatModal({ isOpen, onClose, onSelectUser }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get('/messages/users')
        .then(res => setUsers(res.data.data || []))
        .catch(err => console.error('Error fetching users:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = users.filter((userItem) => {
    const name = String(userItem?.Name || '').toLowerCase();
    const email = String(userItem?.Email || '').toLowerCase();
    const query = search.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const grouped = filtered.reduce((acc, userItem) => {
    const role = userItem?.Role || 'Other';
    if (!acc[role]) acc[role] = [];
    acc[role].push(userItem);
    return acc;
  }, {});

  const preferredRoleOrder = ['Admin', 'Manager', 'Engineer', 'Client'];
  const orderedRoles = [
    ...preferredRoleOrder.filter((role) => grouped[role]?.length),
    ...Object.keys(grouped).filter((role) => !preferredRoleOrder.includes(role)),
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '500px', 
                    maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                       marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Start New Conversation</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', 
                                               cursor: 'pointer' }}>
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', 
                    borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* User List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              No users found
            </div>
          ) : (
            orderedRoles.map(role => (
              grouped[role].length > 0 && (
                <div key={role}>
                  <div style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 'bold', 
                              color: '#9ca3af', background: '#f9fafb', textTransform: 'uppercase' }}>
                    {role}
                  </div>
                  {grouped[role].map(user => (
                    <div
                      key={user.UserID}
                      onClick={() => {
                        onSelectUser(user);
                        onClose();
                      }}
                      style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
                              cursor: 'pointer', background: 'white', borderBottom: '1px solid #f3f4f6',
                              transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', 
                                   background: getAvatarColor(user.Role).bg, 
                                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                                   fontWeight: 'bold', color: getAvatarColor(user.Role).color }}>
                        {getInitial(user.Name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{user.Name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{user.Email}</div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                                   background: getAvatarColor(user.Role).bg, 
                                   color: getAvatarColor(user.Role).color, 
                                   borderRadius: '12px', whiteSpace: 'nowrap' }}>
                        {user.Role}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN MESSAGES PAGE
// ═════════════════════════════════════════════════════════
export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const quickStarters = [
    'Hi, I need help with my ticket status.',
    'Can you share an update on this issue?',
    'Please let me know expected resolution time.',
  ];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Fetch messages in conversation
  const fetchMessages = async (convId) => {
    setLoading(true);
    try {
      const res = await api.get(`/messages/${convId}`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Poll conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages every 3 seconds when conversation is selected
  useEffect(() => {
    if (!selectedConv) return;

    const interval = setInterval(() => {
      fetchMessages(selectedConv.ConversationID);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConv]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.ConversationID);
    }
  }, [selectedConv]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConv) return;

    const msgText = newMessage;
    const fileToUpload = selectedFile;
    setNewMessage('');
    setSelectedFile(null);

    try {
      let attachmentPayload = null;

      if (fileToUpload) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', fileToUpload);
        const uploadRes = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        attachmentPayload = uploadRes.data?.data || null;
      }

      await api.post(`/messages/${selectedConv.ConversationID}`, {
        messageText: msgText,
        attachmentFileName: attachmentPayload?.fileName,
        attachmentFileMime: attachmentPayload?.fileMime,
        attachmentFileSize: attachmentPayload?.fileSize,
        attachmentFileUrl: attachmentPayload?.fileUrl,
      });
      await fetchMessages(selectedConv.ConversationID);
      await fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(msgText);
      setSelectedFile(fileToUpload || null);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle new chat modal user select
  const handleSelectNewChatUser = async (otherUser) => {
    try {
      const res = await api.post('/messages/conversations', {
        otherUserId: otherUser.UserID,
      });
      await fetchConversations();
      setSelectedConv({
        ConversationID: res.data.conversationId,
        OtherUserID: otherUser.UserID,
        OtherUserName: otherUser.Name,
        OtherUserRole: otherUser.Role,
        OtherUserEmail: otherUser.Email,
      });
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.OtherUserName.toLowerCase().includes(search.toLowerCase()) ||
    c.OtherUserEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* LEFT PANEL - Conversations */}
      <div style={styles.leftPanel}>
        {/* Header */}
        <div style={styles.leftHeader}>
          <h1 style={styles.title}>Messages</h1>
          <button
            onClick={() => setShowNewChatModal(true)}
            style={styles.newChatBtn}
          >
            + New Chat
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        {/* Conversation List */}
        <div style={styles.convList}>
          {filteredConversations.length === 0 ? (
            <div style={styles.emptyState}>
              {conversations.length === 0 ? (
                <>
                  <div style={styles.emptyStateTitle}>No conversations yet</div>
                  <div style={styles.emptyStateSub}>Start a new chat with support or your assigned team.</div>
                  <button onClick={() => setShowNewChatModal(true)} style={styles.emptyStateBtn}>
                    + Start New Chat
                  </button>
                </>
              ) : (
                <>
                  <div style={styles.emptyStateTitle}>No results</div>
                  <div style={styles.emptyStateSub}>Try a different name or email in search.</div>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.ConversationID}
                onClick={() => setSelectedConv(conv)}
                style={{
                  ...styles.convRow,
                  ...(selectedConv?.ConversationID === conv.ConversationID
                    ? styles.convRowActive
                    : {}),
                }}
              >
                <div style={styles.convAvatar}>
                  <div
                    style={{
                      ...styles.avatar,
                      background: getAvatarColor(conv.OtherUserRole).bg,
                      color: getAvatarColor(conv.OtherUserRole).color,
                    }}
                  >
                    {getInitial(conv.OtherUserName)}
                  </div>
                </div>

                <div style={styles.convContent}>
                  <div style={styles.convTop}>
                    <div style={styles.convName}>{conv.OtherUserName}</div>
                    <div style={styles.convTime}>
                      {new Date(conv.LastMessageAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </div>
                  </div>
                  <div style={styles.convMiddle}>
                    <div style={styles.roleBadge}>
                      <span
                        style={{
                          background: getAvatarColor(conv.OtherUserRole).bg,
                          color: getAvatarColor(conv.OtherUserRole).color,
                        }}
                      >
                        {conv.OtherUserRole}
                      </span>
                    </div>
                    {conv.UnreadCount > 0 && (
                      <div style={styles.unreadBadge}>{conv.UnreadCount > 99 ? '99+' : conv.UnreadCount}</div>
                    )}
                  </div>
                  <div style={styles.convPreview}>
                    {formatConversationPreview(conv.LastMessage)?.substring(0, 50)}
                    {formatConversationPreview(conv.LastMessage)?.length > 50 ? '...' : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Chat */}
      <div style={styles.rightPanel}>
        {!selectedConv ? (
          <div style={styles.emptyChat}>
            <div style={styles.emptyChatCard}>
              <div style={styles.emptyIcon}>Messages</div>
              <div style={styles.emptyText}>Select a conversation or start a new chat</div>
              <div style={styles.emptySubText}>All your conversation updates and replies will appear here.</div>
              <button onClick={() => setShowNewChatModal(true)} style={styles.emptyStateBtn}>
                + New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderLeft}>
                <div
                  style={{
                    ...styles.avatar,
                    width: '40px',
                    height: '40px',
                    background: getAvatarColor(selectedConv.OtherUserRole).bg,
                    color: getAvatarColor(selectedConv.OtherUserRole).color,
                  }}
                >
                  {getInitial(selectedConv.OtherUserName)}
                </div>
                <div>
                  <div style={styles.chatHeaderName}>{selectedConv.OtherUserName}</div>
                  <div style={styles.chatHeaderInfo}>
                    <span style={styles.onlineIndicator}>🟢</span> Online
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 10px',
                  background: getAvatarColor(selectedConv.OtherUserRole).bg,
                  color: getAvatarColor(selectedConv.OtherUserRole).color,
                  borderRadius: '12px',
                }}
              >
                {selectedConv.OtherUserRole}
              </div>
            </div>

            {/* Messages Area */}
            <div style={styles.messagesArea}>
              {loading ? (
                <div style={styles.loadingMessages}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={styles.noMessages}>
                  <div style={styles.noMessagesTitle}>No messages yet</div>
                  <div style={styles.noMessagesSub}>Start the conversation with a quick prompt below.</div>
                  <div style={styles.quickStarterRow}>
                    {quickStarters.map((text) => (
                      <button key={text} type="button" onClick={() => setNewMessage(text)} style={styles.quickStarterBtn}>
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                {messages.length < 3 && (
                  <div style={styles.quickHintCard}>
                    <div style={styles.quickHintTitle}>Quick Reply Ideas</div>
                    <div style={styles.quickStarterRow}>
                      {quickStarters.map((text) => (
                        <button key={text} type="button" onClick={() => setNewMessage(text)} style={styles.quickStarterBtn}>
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isMyMessage = msg.SenderID === user?.userId;
                  const showDate = shouldShowDateSeparator(messages[idx - 1], msg);
                  const attachment = parseAttachmentMessage(msg.MessageText);

                  return (
                    <div key={msg.MessageID}>
                      {showDate && (
                        <div style={styles.dateSeparator}>
                          {formatDate(msg.CreatedAt)}
                        </div>
                      )}
                      <div
                        style={{
                          ...styles.messageWrapper,
                          justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {!isMyMessage && (
                          <div style={styles.messageMeta}>
                            <div style={styles.senderName}>{msg.SenderName}</div>
                          </div>
                        )}
                        <div
                          style={{
                            ...styles.messageBubble,
                            ...(attachment
                              ? (isMyMessage ? styles.myAttachmentMessage : styles.otherAttachmentMessage)
                              : (isMyMessage ? styles.myMessage : styles.otherMessage)),
                          }}
                        >
                          {attachment ? (
                            <div>
                              {String(attachment.fileMime || '').startsWith('image/') ? (
                                <img
                                  src={toAbsoluteFileUrl(attachment.fileUrl)}
                                  alt={attachment.fileName || 'attachment'}
                                  style={{ maxWidth: '240px', borderRadius: '8px', display: 'block' }}
                                />
                              ) : (
                                <div style={{ fontSize: '14px' }}>📎 {attachment.fileName || 'Attachment'}</div>
                              )}
                              <a
                                href={toAbsoluteFileUrl(attachment.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: isMyMessage ? '#E0E7FF' : '#4338CA', fontSize: '12px' }}
                              >
                                Open file
                              </a>
                            </div>
                          ) : (
                            <div>{msg.MessageText}</div>
                          )}
                          <div
                            style={{
                              fontSize: '11px',
                              opacity: 0.7,
                              marginTop: '4px',
                            }}
                          >
                            {formatTime(msg.CreatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} style={styles.inputForm}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={styles.attachBtn}
                title="Attach image/document"
                disabled={uploadingFile}
              >
                📎
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                style={styles.messageInput}
              />
              {selectedFile && (
                <div style={styles.selectedFileChip} title={selectedFile.name}>
                  {selectedFile.name}
                </div>
              )}
              <button
                type="submit"
                disabled={uploadingFile || (!newMessage.trim() && !selectedFile)}
                style={{
                  ...styles.sendBtn,
                  opacity: (!uploadingFile && (newMessage.trim() || selectedFile)) ? 1 : 0.5,
                  cursor: (!uploadingFile && (newMessage.trim() || selectedFile)) ? 'pointer' : 'not-allowed',
                }}
              >
                {uploadingFile ? '…' : '↑'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleSelectNewChatUser}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: '#f3f4f6',
    overflow: 'hidden',
  },

  // LEFT PANEL
  leftPanel: {
    width: '320px',
    background: 'white',
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  leftHeader: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },

  newChatBtn: {
    background: '#EEF2FF',
    color: '#4338CA',
    border: '1px solid #C7D2FE',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  searchInput: {
    margin: '12px',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
  },

  convList: {
    flex: 1,
    overflow: 'auto',
  },

  convRow: {
    padding: '12px',
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid #E5E7EB',
    background: '#FFFFFF',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  convRowActive: {
    background: '#EEF2FF',
    color: '#1F2937',
    borderLeft: '3px solid #4F46E5',
  },

  convAvatar: {
    display: 'flex',
    alignItems: 'center',
  },

  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    flexShrink: 0,
  },

  convContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  convTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },

  convName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#111827',
  },

  convTime: {
    fontSize: '12px',
    color: '#6B7280',
  },

  convMiddle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },

  roleBadge: {
    fontSize: '11px',
    fontWeight: '600',
  },

  'roleBadge span': {
    padding: '2px 8px',
    borderRadius: '12px',
  },

  unreadBadge: {
    background: '#EF4444',
    color: 'white',
    fontSize: '11px',
    fontWeight: '700',
    padding: '1px 6px',
    borderRadius: '999px',
    minWidth: '18px',
    textAlign: 'center',
  },

  convPreview: {
    fontSize: '12px',
    color: '#6B7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  emptyState: {
    padding: '28px 20px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },

  emptyStateTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '6px',
  },

  emptyStateSub: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginBottom: '12px',
  },

  emptyStateBtn: {
    background: '#EEF2FF',
    color: '#4338CA',
    border: '1px solid #C7D2FE',
    padding: '7px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },

  // RIGHT PANEL
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#F8FAFC',
    overflow: 'hidden',
  },

  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    padding: '20px',
  },

  emptyChatCard: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '14px',
    padding: '28px 24px',
    textAlign: 'center',
    maxWidth: '420px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.05)',
  },

  emptyIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    padding: '0 14px',
    borderRadius: '999px',
    background: '#EEF2FF',
    color: '#4338CA',
    fontSize: '13px',
    fontWeight: '700',
    marginBottom: '14px',
  },

  emptyText: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '6px',
  },

  emptySubText: {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '14px',
  },

  // Chat Header
  chatHeader: {
    padding: '16px',
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },

  chatHeaderName: {
    fontWeight: '600',
    fontSize: '14px',
  },

  chatHeaderInfo: {
    fontSize: '12px',
    color: '#6b7280',
  },

  onlineIndicator: {
    marginRight: '4px',
  },

  // Messages Area
  messagesArea: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: '#F9FAFB',
  },

  loadingMessages: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
  },

  noMessages: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px',
    background: '#FFFFFF',
    border: '1px dashed #D1D5DB',
    borderRadius: '12px',
  },

  noMessagesTitle: {
    color: '#1F2937',
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '4px',
  },

  noMessagesSub: {
    color: '#6B7280',
    fontSize: '12px',
    marginBottom: '12px',
  },

  quickHintCard: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    padding: '10px 12px',
    marginBottom: '6px',
  },

  quickHintTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: '8px',
  },

  quickStarterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },

  quickStarterBtn: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    color: '#374151',
    fontSize: '12px',
    borderRadius: '999px',
    padding: '6px 10px',
    cursor: 'pointer',
  },

  dateSeparator: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9ca3af',
    margin: '12px 0',
    position: 'relative',
  },

  messageWrapper: {
    display: 'flex',
    gap: '8px',
    flexDirection: 'column',
  },

  messageMeta: {
    marginBottom: '2px',
  },

  senderName: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
  },

  messageBubble: {
    maxWidth: '60%',
    padding: '10px 12px',
    borderRadius: '12px',
    fontSize: '14px',
    wordWrap: 'break-word',
  },

  myMessage: {
    background: '#E0E7FF',
    color: '#1F2937',
    borderRadius: '12px 12px 2px 12px',
    alignSelf: 'flex-end',
    border: '1px solid #C7D2FE',
  },

  otherMessage: {
    background: '#FFFFFF',
    color: '#1f2937',
    borderRadius: '12px 12px 12px 2px',
    alignSelf: 'flex-start',
    border: '1px solid #E5E7EB',
  },

  myAttachmentMessage: {
    background: '#FFFFFF',
    color: '#1F2937',
    borderRadius: '12px 12px 2px 12px',
    alignSelf: 'flex-end',
    border: '1px solid #C7D2FE',
  },

  otherAttachmentMessage: {
    background: '#FFFFFF',
    color: '#1F2937',
    borderRadius: '12px 12px 12px 2px',
    alignSelf: 'flex-start',
    border: '1px solid #E5E7EB',
  },

  // Input Area
  inputForm: {
    padding: '12px 16px',
    background: 'white',
    borderTop: '1px solid #D1D5DB',
    display: 'flex',
    gap: '8px',
  },

  messageInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },

  attachBtn: {
    background: '#F3F4F6',
    color: '#374151',
    border: '1px solid #D1D5DB',
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedFileChip: {
    maxWidth: '180px',
    padding: '10px 12px',
    borderRadius: '6px',
    background: '#F3F4F6',
    fontSize: '12px',
    color: '#374151',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    border: '1px solid #E5E7EB',
  },

  sendBtn: {
    background: '#4F46E5',
    color: 'white',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
