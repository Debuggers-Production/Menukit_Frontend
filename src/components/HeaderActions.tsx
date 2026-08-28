import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HeaderActionsProps {
  children: ReactNode;
}

export function HeaderActions({ children }: HeaderActionsProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Give the layout a tick to mount the portal target
    const timeout = setTimeout(() => {
      containerRef.current = document.getElementById('header-actions-portal');
      setMounted(true);
    }, 10);
    return () => clearTimeout(timeout);
  }, []);

  if (!mounted || !containerRef.current) return null;

  return createPortal(children, containerRef.current);
}
