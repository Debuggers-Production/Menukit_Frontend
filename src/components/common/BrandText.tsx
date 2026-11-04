import React from 'react';

interface BrandTextProps {
  className?: string;
  capitalKit?: boolean;
}

export function BrandText({ className = '', capitalKit = false }: BrandTextProps) {
  return (
    <span className={`font-bold tracking-tight text-orange-600 dark:text-orange-500 ${className}`}>
      Menu{capitalKit ? 'Kit' : 'kit'}
    </span>
  );
}
