"use client";

import { useSyncExternalStore, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';

interface AuthGuardProps {
  children: ReactNode;
}

// Helper to detect if we are on the client
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * AuthGuard component protects routes by checking for a valid session.
 * If the user is not logged in, it redirects them to the login page.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (isClient && !isLoggedIn()) {
      const searchParams = new URLSearchParams();
      searchParams.set('callbackUrl', pathname);
      router.push(`/login?${searchParams.toString()}`);
    }
  }, [isClient, router, pathname]);

  // Prevent flash of protected content while redirecting or during hydration
  if (!isClient || !isLoggedIn()) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center font-terminal-mono text-terminal-green">
        <div className="animate-pulse">
          &gt; AUTHORIZING_SESSION...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
