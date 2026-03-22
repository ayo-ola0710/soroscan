"use client";

import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { setTokens } from '@/lib/auth';
import { Button } from '@/components/terminal/Button';
import { Input } from '@/components/terminal/Input';

// Login mutation - using gql here since codegen might not have run yet
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      access
      refresh
      user {
        id
        email
      }
    }
  }
`;

const loginSchema = z.object({
  email: z.string().email('INVALID_EMAIL_FORMAT'),
  password: z.string().min(8, 'PASSWORD_MIN_8_CHARACTERS'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * LoginPage provides a terminal-styled interface for user authentication.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as unknown as Parameters<typeof zodResolver>[0]),
  });

  const [login] = useMutation(LOGIN_MUTATION);

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      const { data } = await login({
        variables: {
          email: values.email,
          password: values.password,
        },
      });

      if (data?.login) {
        setTokens({
          access: data.login.access,
          refresh: data.login.refresh,
        });
        router.push(callbackUrl);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'AUTHENTICATION_FAILED';
      setError(errorMessage.toUpperCase().replace(/\s+/g, '_'));
    }
  };

  return (
    <div className="min-h-screen bg-terminal-black flex flex-col items-center justify-center p-6 font-terminal-mono selection:bg-terminal-green selection:text-terminal-black">
      <div className="w-full max-auto max-w-md border-2 border-terminal-green/30 p-8 bg-terminal-black/50 backdrop-blur-sm relative overflow-hidden">
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-terminal-green" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-terminal-green" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-terminal-green" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-terminal-green" />

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-terminal-green tracking-tighter mb-2">
            [SOROSCAN_SECURE_AUTH]
          </h1>
          <p className="text-[10px] text-terminal-gray uppercase tracking-widest">
            ESTABLISHING_ENCRYPTED_SESSION...
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-[10px] text-terminal-green uppercase tracking-widest mb-2">
              &gt; USER_EMAIL
            </label>
            <Input
              {...register('email')}
              placeholder="operator@soroscan.io"
              className={errors.email ? 'border-terminal-danger text-terminal-danger' : ''}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-[10px] text-terminal-danger">
                {String(errors.email.message)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] text-terminal-green uppercase tracking-widest mb-2">
              &gt; ACCESS_PASSWORD
            </label>
            <Input
              {...register('password')}
              type="password"
              placeholder="********"
              className={errors.password ? 'border-terminal-danger text-terminal-danger' : ''}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1 text-[10px] text-terminal-danger">
                {String(errors.password.message)}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 border border-terminal-danger bg-terminal-danger/10 text-terminal-danger text-xs text-center font-bold">
              ERROR: {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'AUTHENTICATING...' : '> SIGN_IN'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-terminal-green/10 flex justify-between items-center text-[10px] text-terminal-gray">
          <span>&copy; 2026 SOROSCAN_SYSTEMS</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
            SECURE_LINK_ACTIVE
          </span>
        </div>
      </div>

      <p className="mt-6 text-[10px] text-terminal-gray uppercase tracking-widest text-center">
        Restricted access authorized personnel only.<br />
        All activity is logged and monitored.
      </p>
    </div>
  );
}
