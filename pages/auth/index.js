/**
 * Auth Index - Redirects to Sign In
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/signin');
  }, [router]);

  return null;
}
