import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { Message, User } from '../types'
import { useAuthStore } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'

export default function MessagesPage() {
  const { userId } = useParams<{ userId?: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Message[]>([])
  const [activeUser, setActiveUser] = useState<User | null>(null)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { sendMessage } = useWebSocket((msg) => {
    if (
      activeUser &&
      (msg.sender_id === activeUser.id || msg.receiver_id === activeUser.id)
    ) {
      setMessages((prev) => [...prev, msg])
    }
  })

  useEffect(() => {
    api.get('/messages/conversations').then((res) => setConversations(res.data))
  }, [])

  useEffect(() => {
    if (!userId) return
    api.get(`/users/${userId}`).then((res) => setActiveUser(res.data))
    api.get(`/messages/history/${userId}`).then((res) => setMessages(res.data))
  }, [userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || !activeUser) return
    sendMessage(activeUser.id, input.trim())
    setInput('')
  }

  const uniqueUsers = Array.from(
    new Map(conversations.map((m) => {
      const otherId = m.sender_id === currentUser?.id ? m.receiver_id : m.sender_id
      return [otherId, m]
    })).values()
  )

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="w-64 border-r border-gray-200 overflow-y-auto shrink-0">
        <div className="p-3 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900">Messages</h2>
        </div>
        {uniqueUsers.length === 0 && (
          <p className="text-xs text-gray-400 p-4">No conversations yet.</p>
        )}
        {uniqueUsers.map((m) => {
          const otherId = m.sender_id === currentUser?.id ? m.receiver_id : m.sender_id
          return (
            <button
              key={otherId}
              onClick={() => window.location.href = `/messages/${otherId}`}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 text-sm ${activeUser?.id === otherId ? 'bg-brand-50' : ''}`}
            >
              <span className="font-medium text-gray-800">{otherId.slice(0, 8)}...</span>
              <p className="text-xs text-gray-500 truncate">{m.content}</p>
            </button>
          )
        })}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!activeUser ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-100 font-medium text-sm text-gray-900">
              {activeUser.username}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((msg) => {
                const isMine = msg.sender_id === currentUser?.id
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleSend}
                className="bg-brand-600 text-white px-4 py-2 rounded-full text-sm hover:bg-brand-700"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
