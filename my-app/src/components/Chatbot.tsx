"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, BarChart2, AlertCircle, Loader2 } from "lucide-react"

interface ChatMessage {
  id: string
  content: string
  isBot: boolean
}

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        content:
          "Hello! I'm CrediSure, your finance assistant. Ask me anything about financial concepts or investment strategies.",
        isBot: true,
      },
    ])
  }, [])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatMessageContent = (content: string) => {
    return content.split(/(\*[^*]+\*)/g).map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <strong key={index} className="font-semibold text-emerald-700">
            {part.slice(1, -1)}
          </strong>
        )
      }
      return part
    })
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    setIsLoading(true)
    setError(null)

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: inputMessage,
        isBot: false,
      },
    ])

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_CHAT_API_URL + "/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: inputMessage }),
      })

      if (!response.ok) throw new Error("Request failed")

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: data.response_id,
          content: data.message,
          isBot: true,
        },
      ])
    } catch (err) {
      setError("Failed to get response. Please try again.")
      console.error("API Error:", err)
    } finally {
      setIsLoading(false)
      setInputMessage("")
    }
  }

  const messageVariants = {
    initial: (isBot: boolean) => ({
      opacity: 0,
      x: isBot ? -20 : 20,
      y: 10,
      scale: 0.9,
    }),
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        type: "spring",
        stiffness: 260,
        damping: 20,
      },
    },
    exit: (isBot: boolean) => ({
      opacity: 0,
      x: isBot ? -20 : 20,
      scale: 0.9,
      transition: { duration: 0.2 },
    }),
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
  }

  const typingIndicator = (
    <div className="flex space-x-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100 max-w-[80%]">
      <motion.div
        className="w-2 h-2 rounded-full bg-emerald-500"
        animate={{
          y: [0, -5, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.6,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          delay: 0,
        }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-emerald-500"
        animate={{
          y: [0, -5, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.6,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          delay: 0.15,
        }}
      />
      <motion.div
        className="w-2 h-2 rounded-full bg-emerald-500"
        animate={{
          y: [0, -5, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.6,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          delay: 0.3,
        }}
      />
    </div>
  )

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-background)] relative">
      <motion.div
        className="absolute -z-10 w-64 h-64 rounded-full bg-emerald-200 opacity-20 blur-3xl"
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        style={{ top: "10%", left: "10%" }}
      />
      <motion.div
        className="absolute -z-10 w-64 h-64 rounded-full bg-blue-200 opacity-20 blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, -20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 18,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        style={{ bottom: "10%", right: "10%" }}
      />

      <motion.div
        className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-4 shadow-md"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        <div className="flex items-center  gap-2">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <BarChart2 className="h-6 w-6" />
          </motion.div>
          <div>
            <motion.h1
              className="text-xl font-bold"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              CrediSure
            </motion.h1>
            <motion.p
              className="text-slate-100 opacity-90 text-sm"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Your Financial Intelligence Assistant
            </motion.p>
          </div>
        </div>
      </motion.div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              custom={message.isBot}
              variants={messageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              whileHover="hover"
              layout
              className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
            >
              <motion.div
                className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                  message.isBot
                    ? "bg-emerald-50 text-slate-800 border border-emerald-100"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className={message.isBot ? "space-y-2" : ""}>
                  {message.isBot ? (
                    formatMessageContent(message.content)
                  ) : (
                    message.content
                  )}
                </div>
                <motion.div
                  className={`h-1 w-0 mt-2 rounded-full ${message.isBot ? "bg-emerald-300" : "bg-blue-300"}`}
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8 }}
                />
              </motion.div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              {typingIndicator}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, -5, 5, -5, 5, 0],
                transition: {
                  x: { duration: 0.5 },
                },
              }}
              className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 rounded-lg border border-red-100"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <motion.div
        className="border-t p-4 bg-[var(--color-background)] text-white"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex gap-2"
        >
          <motion.input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            placeholder="Ask about finance concepts, SHAP values..."
            className="flex-1 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={isLoading}
            whileFocus={{ scale: 1.01 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <motion.button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white p-2 rounded-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Loader2 className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
                <Send className="h-5 w-5" />
              </motion.div>
            )}
            <span className="sr-only">Send</span>
          </motion.button>
        </form>
        <motion.div
          className="text-xs text-slate-400 mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          CrediSure helps you understand complex financial concepts with ease
        </motion.div>
      </motion.div>
    </div>
  )
}