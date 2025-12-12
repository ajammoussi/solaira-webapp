import './style.css'

import { GlobalProvider } from '../global-context'
import { NextIntlProvider } from 'next-intl'
import { AuthProvider, useAuth } from '../lib/hooks/useAuth'
import SolarChatbot from '../components/SolarChatbot'

function ChatbotWrapper() {
  const { user, isGuest } = useAuth()
  
  // Only render chatbot when user is logged in (not a guest)
  if (isGuest || !user) {
    return null
  }
  
  return <SolarChatbot energyData={null} userId={user.email || user.id} />
}

export default function MyApp({ Component, pageProps }) {
  return (
    <NextIntlProvider messages={pageProps?.messages}>
      <AuthProvider>
        <GlobalProvider>
          <Component {...pageProps} />
          <ChatbotWrapper />
        </GlobalProvider>
      </AuthProvider>
    </NextIntlProvider>
  )
}
