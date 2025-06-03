'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      router.replace('/practice');
    } else {
      router.replace('/register');
    }
  }, [router]);

  // Render null or a loading spinner while redirecting
  return null;
  // Or a loading indicator:
  // return (
  //   <div className="flex items-center justify-center min-h-screen">
  //     <p>Loading...</p>
  //   </div>
  // );
}
