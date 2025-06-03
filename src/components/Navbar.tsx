'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  // 不在登录和注册页面显示导航栏
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const navItems = [
    { href: '/practice', label: '练习', icon: '📚' },
    { href: '/vocab', label: '词汇', icon: '📖' },
    { href: '/mistakes', label: '错题', icon: '❌' },
    { href: '/review', label: '复习', icon: '🔄' },
    { href: '/monitor', label: '监控', icon: '📊' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/practice" className="flex items-center space-x-2">
              <span className="text-2xl">🎓</span>
              <span className="text-xl font-bold text-indigo-600">云辉哥哥监督你学英语</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  pathname === item.href
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-red-600 hover:border-red-300"
            >
              退出登录
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600 hover:text-indigo-600 focus:outline-none focus:text-indigo-600"
              aria-label="打开菜单"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    pathname === item.href
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <div className="px-3 py-2">
                <Button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-600 hover:text-red-600 hover:border-red-300"
                >
                  退出登录
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;