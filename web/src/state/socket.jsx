"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './auth.jsx'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { token, loading } = useAuth()

  useEffect(() => {
    console.log('🔧 SocketProvider effect triggered:', { loading, hasToken: !!token })
    
    // Don't create socket if still loading auth or no token
    if (loading || !token) {
      console.log('⏸️ Skipping socket creation:', { loading, hasToken: !!token })
      if (socket) {
        console.log('🔌 Disconnecting existing socket')
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    console.log('🚀 Creating new socket connection with token')
    // If VITE_API_URL is set, derive base from it; else use current origin (works with Vite proxy)
    const baseFromEnv = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/$/, '').replace('/api', '')
      : window.location.origin
    const apiUrl = baseFromEnv
    console.log('🌐 Connecting to:', apiUrl)
    console.log('🔍 VITE_API_URL:', import.meta.env.VITE_API_URL)
    console.log('🔍 Final socket URL:', apiUrl)
    
    const newSocket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      auth: {
        token: token
      }
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket server', {
        id: newSocket.id,
        connected: newSocket.connected,
        transport: newSocket.io.engine.transport.name
      })
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server')
      setConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error)
      setConnected(false)
    })

    newSocket.on('auth_error', (error) => {
      console.error('❌ WebSocket auth error:', error)
      setConnected(false)
    })

    // Listen for any event (debugging)
    newSocket.onAny((eventName, ...args) => {
      console.log('🔊 Socket event received:', eventName, args)
    })

    setSocket(newSocket)

    return () => {
      console.log('🧹 Cleaning up socket connection')
      newSocket.close()
    }
  }, [token, loading])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

