// src/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // Assuming Shadcn UI Button is available
import { Input } from '@/components/ui/input';   // Assuming Shadcn UI Input is available
import { Label } from '@/components/ui/label';   // Assuming Shadcn UI Label is available

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Note: FastAPI's OAuth2PasswordRequestForm expects 'username' and 'password'
      // in a form-data payload, not JSON.
      const formData = new URLSearchParams();
      formData.append('username', email); // FastAPI's OAuth2PasswordRequestForm uses 'username' for email
      formData.append('password', password);

      const response = await fetch('/api/auth/login/token', { // Assuming Next.js API route proxies this
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      if (data.access_token) {
        localStorage.setItem('accessToken', data.access_token);
        // Optionally store token type or other info if needed
        // localStorage.setItem('tokenType', data.token_type);
        router.push('/practice'); // Redirect to practice page on successful login
      } else {
        throw new Error('Access token not received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Login to Your Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div>
            <Button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          还没有账户?{' '}
          <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}