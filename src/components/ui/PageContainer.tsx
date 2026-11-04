import * as React from 'react';
import { cn } from '@/utils/cn';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  narrow?: boolean;
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, children, narrow, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto",
          narrow ? "max-w-4xl" : "max-w-7xl",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';
