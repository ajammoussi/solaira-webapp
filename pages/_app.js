import './style.css'

import { GlobalProvider } from '../global-context'
import { NextIntlProvider } from 'next-intl'
import { AuthProvider, useAuth } from '../lib/hooks/useAuth'
import SolarChatbot from '../components/SolarChatbot'
import SolarSetupModal from '../components/SolarSetupModal'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

function SetupEnforcer() {
  const { user, profile, loading, refreshProfile, isGuest } = useAuth()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Check if user is logged in and not a guest (anonymous)
    const isAnonymous = user?.is_anonymous || isGuest
    
    if (!loading && user && !isAnonymous) {
      // Check if setup is complete
      const isComplete = profile?.preferences?.setup_completed
      setShowModal(!isComplete)
    } else {
      setShowModal(false)
    }
  }, [loading, user, profile, isGuest])

  if (!showModal) return null

  return <SolarSetupModal onComplete={() => {
    refreshProfile()
    setShowModal(false)
  }} />
}

function ChatbotWrapper() {
  const { user, isGuest } = useAuth()
  const router = useRouter()
  
  // Render chatbot for everyone, passing user ID if available or 'guest'
  const userId = user?.email || user?.id || 'guest';
  
  return <SolarChatbot energyData={null} userId={userId} />
}

export default function MyApp({ Component, pageProps }) {
  return (
    <NextIntlProvider messages={pageProps?.messages}>
      <AuthProvider>
        <GlobalProvider>
          <Component {...pageProps} />
          <SetupEnforcer />
          <ChatbotWrapper />
        </GlobalProvider>
      </AuthProvider>
    </NextIntlProvider>
  )
}
