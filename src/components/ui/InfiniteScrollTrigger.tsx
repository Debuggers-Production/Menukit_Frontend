import { useEffect, useRef } from 'react';

export function InfiniteScrollTrigger({ 
  onIntersect, 
  isLoading, 
  hasMore 
}: { 
  onIntersect: () => void;
  isLoading: boolean;
  hasMore: boolean;
}) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onIntersectRef.current();
      }
    }, { threshold: 0.1 });

    if (triggerRef.current) {
      observer.observe(triggerRef.current);
    }

    return () => observer.disconnect();
  }, [isLoading, hasMore]);

  if (!hasMore) return null;

  return (
    <div ref={triggerRef} className="flex justify-center w-full min-h-[40px] items-center mt-4 pb-4">
      {isLoading ? (
        <span className="text-sm font-bold opacity-70">Loading...</span>
      ) : null}
    </div>
  );
}
