import { useState, useRef, useEffect } from 'react'

const API_URL = 'http://localhost:3000/api/chat'

const WELCOME_MSG = {
  id: 'welcome',
  role: 'bot',
  content:
    "Namaste! 👋 I'm the ShopEase support assistant. Ask me anything about orders, returns, shipping, payments, sizing, or exchanges — I'm here to help!",
  sources: [],
}

const SUGGESTIONS = [
  'What is the return policy?',
  'How much does shipping cost?',
  'What payment methods do you accept?',
  'How do I track my order?',
  'Can I exchange items?',
]

/* ─── Theme definitions ────────────────────────────────────────── */
const DARK = {
  root:       'bg-[#0a0d14] text-gray-100',
  header:     { background: 'linear-gradient(180deg,#0d1117 0%,#0f1623 100%)' },
  hdrBorder:  'border-gray-800/80',
  title:      'text-white',
  status:     'text-gray-400',
  clearBtn:   'text-gray-400 hover:text-white bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700/50',
  msgsBg:     'bg-[#0a0d14]',
  botBubble:  'bg-gray-800 text-gray-100 border border-gray-700/50',
  userBubble: 'bg-blue-600 text-white',
  inputBar:   'bg-[#0d1117] border-gray-800/80',
  inputField: 'bg-gray-800/70 border-gray-700/60 text-gray-100 placeholder-gray-500 focus:border-teal-500/70',
  hint:       'text-gray-600',
  hintKbd:    'bg-gray-800 border-gray-700 text-gray-400',
  suggLabel:  'text-gray-500',
  suggBtn:    'text-teal-300 bg-teal-950/50 border-teal-700/40 hover:bg-teal-900/60 hover:border-teal-600/60',
  srcLabel:   'text-gray-500',
  srcBadge:   'bg-teal-950/60 text-teal-300 border border-teal-700/40',
  copyBtn:    'text-gray-500 hover:text-gray-200 hover:bg-gray-700/60',
  errorBox:   'bg-red-950/60 border-red-800/40 text-red-400',
  toggleIcon: 'text-yellow-300',
  scrollbar:  '#1f2937',
}

const LIGHT = {
  root:       'bg-slate-50 text-gray-900',
  header:     { background: '#ffffff' },
  hdrBorder:  'border-gray-200',
  title:      'text-gray-900',
  status:     'text-gray-500',
  clearBtn:   'text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200',
  msgsBg:     'bg-slate-50',
  botBubble:  'bg-white text-gray-800 border border-gray-200 shadow-sm',
  userBubble: 'bg-blue-600 text-white',
  inputBar:   'bg-white border-gray-200',
  inputField: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-teal-500',
  hint:       'text-gray-400',
  hintKbd:    'bg-gray-100 border-gray-300 text-gray-500',
  suggLabel:  'text-gray-400',
  suggBtn:    'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100 hover:border-teal-300',
  srcLabel:   'text-gray-400',
  srcBadge:   'bg-teal-50 text-teal-700 border border-teal-200',
  copyBtn:    'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
  errorBox:   'bg-red-50 border-red-200 text-red-600',
  toggleIcon: 'text-gray-600',
  scrollbar:  '#cbd5e1',
}

/* ─── Render inline markdown (bold only) ──────────────────────── */
function renderMarkdown(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

/* ─── Copy-to-clipboard button ─────────────────────────────────── */
function CopyButton({ text, th }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — silently ignore
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy answer'}
      className={`inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5 transition-colors duration-150 cursor-pointer ${th.copyBtn}`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

/* ─── Typing indicator ─────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="dot-1 w-2 h-2 rounded-full bg-teal-400 inline-block" />
      <span className="dot-2 w-2 h-2 rounded-full bg-teal-400 inline-block" />
      <span className="dot-3 w-2 h-2 rounded-full bg-teal-400 inline-block" />
    </div>
  )
}

/* ─── Avatars ──────────────────────────────────────────────────── */
function BotAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 mt-1 flex items-center justify-center text-white text-[10px] font-bold"
      style={{ background: 'linear-gradient(135deg,#0d9488 0%,#2563eb 100%)' }}
    >
      SE
    </div>
  )
}

function UserAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 mt-1 flex items-center justify-center text-white text-[10px] font-bold"
      style={{ background: 'linear-gradient(135deg,#2563eb 0%,#4f46e5 100%)' }}
    >
      You
    </div>
  )
}

/* ─── Single message bubble ────────────────────────────────────── */
function MessageBubble({ msg, th }) {
  const isUser = msg.role === 'user'
  // Defensive dedup — sources already deduped on API, but guard here too
  const sources = [...new Set(msg.sources || [])]

  return (
    <div className={`flex items-start gap-2 sm:gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

      {isUser ? <UserAvatar /> : <BotAvatar />}

      {/* max-w wider on small screens */}
      <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'} max-w-[82%] sm:max-w-[72%]`}>

        {/* Bubble */}
        <div className={`px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap select-text ${
          isUser
            ? `rounded-2xl rounded-tr-sm ${th.userBubble}`
            : `rounded-2xl rounded-tl-sm ${th.botBubble}`
        }`}>
          {isUser ? msg.content : renderMarkdown(msg.content)}
        </div>

        {/* Error badge */}
        {msg.error && (
          <div className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border ${th.errorBox}`}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {msg.error}
          </div>
        )}

        {/* Actions row: copy + sources */}
        {!isUser && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">

            {/* Copy button */}
            <CopyButton text={msg.content} th={th} />

            {/* Source badges */}
            {sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[11px] font-medium uppercase tracking-wide ${th.srcLabel}`}>
                  Sources
                </span>
                {sources.map((src) => (
                  <span key={src} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-0.5 ${th.srcBadge}`}>
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

/* ─── Main App ─────────────────────────────────────────────────── */
export default function App() {
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [isDark, setIsDark]     = useState(true)

  const th         = isDark ? DARK : LIGHT
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  const showSuggestions = messages.length === 1

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Auto-resize textarea */
  function resizeTextarea(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 112) + 'px'
  }

  /* Send message */
  async function handleSend(preset) {
    const question = (preset ?? input).trim()
    if (!question || loading) return

    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: question }])
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    setLoading(true)

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })

      if (!res.ok) throw new Error(`Server returned ${res.status}`)

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'bot', content: data.answer, sources: data.sources || [] },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'bot',
          content: "Sorry, I couldn't reach the server. Please check your connection and try again.",
          sources: [],
          error: err.message,
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function clearChat() {
    setMessages([{ ...WELCOME_MSG, id: Date.now(), content: 'Chat cleared! How can I help you today? 😊' }])
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${th.root}`}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        className={`shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b ${th.hdrBorder}`}
        style={th.header}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg,#0d9488 0%,#2563eb 100%)' }}
          >
            S
          </div>
          <div>
            <h1 className={`text-[15px] font-semibold leading-tight tracking-tight m-0 ${th.title}`}>
              ShopEase Support
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className={`text-[11px] ${th.status}`}>Online · Replies instantly</span>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">

          {/* Dark / Light toggle */}
          <button
            onClick={() => setIsDark((d) => !d)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer ${th.clearBtn}`}
          >
            {isDark ? (
              /* Sun icon */
              <svg className={`w-4 h-4 ${th.toggleIcon}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              /* Moon icon */
              <svg className={`w-4 h-4 ${th.toggleIcon}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Clear chat */}
          <button
            onClick={clearChat}
            title="Clear chat"
            className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-colors duration-150 cursor-pointer ${th.clearBtn}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </header>

      {/* ── Messages area ──────────────────────────────────────── */}
      <main className={`flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 ${th.msgsBg}`}>

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} th={th} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-2 sm:gap-2.5">
            <BotAvatar />
            <div className={`rounded-2xl rounded-tl-sm px-4 py-3 ${th.botBubble}`}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── Suggested questions (welcome screen only) ──────────── */}
      {showSuggestions && !loading && (
        <div className={`shrink-0 px-4 sm:px-6 pb-3 ${th.msgsBg}`}>
          <p className={`text-[11px] uppercase tracking-wider mb-2 font-medium ${th.suggLabel}`}>
            Try asking
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={loading}
                className={`text-xs rounded-full px-3.5 py-1.5 border transition-colors duration-150 cursor-pointer disabled:opacity-50 ${th.suggBtn}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ──────────────────────────────────────────── */}
      <div className={`shrink-0 border-t px-4 sm:px-6 pt-3 pb-4 ${th.inputBar} ${th.hdrBorder}`}>
        <div className="flex items-end gap-2.5 max-w-3xl mx-auto">

          <div className="flex-1">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                resizeTextarea(e.target)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about orders, returns, shipping, sizing…"
              disabled={loading}
              className={`w-full resize-none border rounded-xl px-4 py-3 text-sm outline-none transition-colors duration-150 disabled:opacity-50 leading-relaxed ${th.inputField}`}
              style={{ minHeight: '46px', maxHeight: '112px' }}
            />
          </div>

          {/* Send / spinner button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            title="Send message"
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: !input.trim() || loading
                ? 'rgba(37,99,235,0.25)'
                : 'linear-gradient(135deg,#0d9488 0%,#2563eb 100%)',
            }}
          >
            {loading ? (
              <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Keyboard hint — hidden on very small screens */}
        <p className={`hidden sm:block text-center text-[11px] mt-2 ${th.hint}`}>
          <kbd className={`rounded px-1 font-mono text-[10px] border ${th.hintKbd}`}>Enter</kbd>
          {' '}to send ·{' '}
          <kbd className={`rounded px-1 font-mono text-[10px] border ${th.hintKbd}`}>Shift+Enter</kbd>
          {' '}for new line
        </p>
      </div>

    </div>
  )
}
