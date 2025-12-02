import './style.css'

import { GlobalProvider } from '../global-context'
import { NextIntlProvider } from 'next-intl'
import { AuthProvider } from '../lib/hooks/useAuth'

export default function MyApp({ Component, pageProps }) {
  return (
    <NextIntlProvider messages={pageProps?.messages}>
      <AuthProvider>
        <GlobalProvider>
          <Component {...pageProps} />
        </GlobalProvider>
      </AuthProvider>
    </NextIntlProvider>
  )
}
