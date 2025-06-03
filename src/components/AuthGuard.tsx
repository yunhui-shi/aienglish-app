'use client';

import { useEffect, useState } from 'react'; // Import useState
import { usePathname, useRouter } from 'next/navigation';

const UNAUTHENTICATED_PATHS = ['/login', '/register'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false); // 新增：认证状态

  useEffect(() => {
    // 确保在客户端执行
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      const isUnauthenticatedPath = UNAUTHENTICATED_PATHS.includes(pathname);

      if (!accessToken && !isUnauthenticatedPath) {
        // 如果用户未登录且当前路径不在允许的未认证路径列表中
        console.log('AuthGuard: User not authenticated, redirecting to /login from:', pathname);
        router.replace('/login');
        // 不需要设置 isVerified，因为组件会因重定向而卸载或路径改变重新评估
      } else if (accessToken && (pathname === '/login' || pathname === '/register')) {
        // 如果用户已登录但试图访问登录或注册页
        console.log('AuthGuard: User authenticated, redirecting from login/register to /practice');
        router.replace('/practice');
        // 不需要设置 isVerified
      } else {
        // 用户已认证可以访问当前路径，或者当前路径是公共路径
        setIsVerified(true);
      }
    }
  }, [pathname, router]);

  if (!isVerified) {
    // 在认证状态明确或重定向发生前，不渲染子组件
    // 这可以防止子组件过早执行需要认证的内部逻辑
    return null; // 或者您可以返回一个全局的加载组件，例如 <LoadingSpinner />
  }

  return <>{children}</>;
}