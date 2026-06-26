'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message, Profile } from '@/lib/types'
import { initials } from '@/lib/utils'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { Send, Loader2, Lock } from 'lucide-react'

interface Props {
  jobId: string
  currentUser: Profile
}

function formatMessageTime(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
  return format(d, 'd MMM, HH:mm')
}

export default function MessageChannel({ jobId, currentUser }: Props) {
  const [messages, setMessages] = useState<(Message & { sender: Profile })[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [canMessage, setCanMessage] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const isAdmin = currentUser.role === 'owner' || currentUser.role === 'admin'

  useEffect(() => {
    async function init() {
      // Check if user can access channel
      if (isAdmin) {
        setCanMessage(true)
      } else {
        const { data } = await supabase
          .from('job_assignments')
          .select('status')
          .eq('job_id', jobId)
          .eq('crew_id', currentUser.id)
          .single()
        setCanMessage(!!data && data.status === 'accepted')
      }

      // Load messages
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })

      setMessages((data as any[]) || [])
      setLoading(false)
    }
    init()

    // Realtime subscription
    const channel = supabase
      .channel(`job-channel-${jobId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `job_id=eq.${jobId}`,
      }, async (payload) => {
        const { data: msgWithSender } = await supabase
          .from('messages')
          .select('*, sender:profiles(*)')
          .eq('id', payload.new.id)
          .single()
        if (msgWithSender) {
          setMessages(prev => [...prev, msgWithSender as any])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [jobId, currentUser.id, isAdmin])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || sending) return

    setSending(true)
    setNewMessage('')
    await supabase.from('messages').insert({
      job_id: jobId,
      sender_id: currentUser.id,
      content,
    })
    setSending(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 size={20} className="animate-spin text-[#E8820C]" />
    </div>
  )

  if (!canMessage && !isAdmin) return (
    <div className="card p-8 text-center text-gray-400">
      <Lock size={24} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Accept this job to access the team channel.</p>
    </div>
  )

  return (
    <div className="card flex flex-col" style={{ height: '420px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#E8820C]" />
        <span className="text-sm font-semibold text-[#2B2B2B]">Job Channel</span>
        <span className="text-xs text-gray-400 ml-auto">Assigned crew only</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No messages yet. Start the conversation.
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUser.id
          const showAvatar = !isMe && (i === 0 || messages[i-1]?.sender_id !== msg.sender_id)

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div className={`w-7 h-7 rounded-full bg-[#2B2B2B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                  {initials(msg.sender?.full_name)}
                </div>
              )}
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {showAvatar && !isMe && (
                  <span className="text-xs text-gray-400 px-1">{msg.sender?.full_name?.split(' ')[0]}</span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-[#E8820C] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 px-1">{formatMessageTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canMessage ? (
        <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Message the team…"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <button type="submit" disabled={!newMessage.trim() || sending} className="btn-primary px-3">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          Read-only — accept the job to send messages
        </div>
      )}
    </div>
  )
}
