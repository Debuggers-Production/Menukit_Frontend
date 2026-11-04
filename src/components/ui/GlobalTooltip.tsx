import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipState {
  text: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  visible: boolean;
}

export function GlobalTooltip() {
  const [state, setState] = useState<TooltipState>({
    text: '',
    x: 0,
    y: 0,
    placement: 'top',
    visible: false,
  });

  const [pos, setPos] = useState<{ x: number; y: number; placement: 'top' | 'bottom' }>({
    x: 0,
    y: 0,
    placement: 'top',
  });

  const timerRef = useRef<number | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('[title], [data-tooltip-content], [data-menukit-tooltip]') as HTMLElement | null;

      if (!target) {
        if (state.visible) {
          setState((prev) => ({ ...prev, visible: false }));
        }
        if (timerRef.current) clearTimeout(timerRef.current);
        currentTargetRef.current = null;
        return;
      }

      if (currentTargetRef.current === target && state.visible) return;

      // Extract text and suppress native browser tooltip
      let text = target.getAttribute('data-tooltip-content') || target.getAttribute('data-menukit-tooltip') || '';
      if (target.hasAttribute('title')) {
        const rawTitle = target.getAttribute('title') || '';
        if (rawTitle.trim()) {
          text = rawTitle.trim();
          target.setAttribute('data-menukit-tooltip', text);
        }
        target.removeAttribute('title');
      }

      if (!text) return;

      currentTargetRef.current = target;
      if (timerRef.current) clearTimeout(timerRef.current);

      // Short delay (75ms) for snappy, delightful hover response
      timerRef.current = window.setTimeout(() => {
        if (!currentTargetRef.current) return;
        const rect = currentTargetRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const placement = spaceAbove < 45 ? 'bottom' : 'top';
        const targetCenterX = rect.left + rect.width / 2;
        const y = placement === 'top' ? rect.top - 6 : rect.bottom + 6;

        // Pre-clamp estimate to avoid any visual jitter
        const margin = 20;
        const screenW = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
        const estimatedHalfWidth = Math.min(160, Math.max(50, text.length * 3.5));
        let initialX = targetCenterX;
        if (initialX + estimatedHalfWidth > screenW - margin) {
          initialX = screenW - margin - estimatedHalfWidth;
        }
        if (initialX - estimatedHalfWidth < margin) {
          initialX = margin + estimatedHalfWidth;
        }

        setState({
          text,
          x: targetCenterX,
          y,
          placement,
          visible: true,
        });

        setPos({
          x: initialX,
          y,
          placement,
        });
      }, 75);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (currentTargetRef.current && (!related || !currentTargetRef.current.contains(related))) {
        if (timerRef.current) clearTimeout(timerRef.current);
        currentTargetRef.current = null;
        setState((prev) => ({ ...prev, visible: false }));
      }
    };

    const handleScrollOrClick = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      currentTargetRef.current = null;
      setState((prev) => ({ ...prev, visible: false }));
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('scroll', handleScrollOrClick, true);
    document.addEventListener('mousedown', handleScrollOrClick, true);
    window.addEventListener('resize', handleScrollOrClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('scroll', handleScrollOrClick, true);
      document.removeEventListener('mousedown', handleScrollOrClick, true);
      window.removeEventListener('resize', handleScrollOrClick, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.visible]);

  // Pixel-perfect bounds checking and collision prevention before browser paint
  useLayoutEffect(() => {
    if (!state.visible || !tooltipRef.current) return;

    const tooltipEl = tooltipRef.current;
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const margin = 20;
    const halfWidth = tooltipRect.width / 2;
    const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    const viewportHeight = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);

    let clampedX = state.x;
    if (clampedX + halfWidth > viewportWidth - margin) {
      clampedX = viewportWidth - margin - halfWidth;
    }
    if (clampedX - halfWidth < margin) {
      clampedX = margin + halfWidth;
    }

    let clampedY = state.y;
    let placement = state.placement;

    // Flip vertically if overflowing top or bottom edge of viewport
    if (placement === 'top' && clampedY - tooltipRect.height < margin) {
      if (currentTargetRef.current) {
        const targetRect = currentTargetRef.current.getBoundingClientRect();
        clampedY = targetRect.bottom + 6;
        placement = 'bottom';
      }
    } else if (placement === 'bottom' && clampedY + tooltipRect.height > viewportHeight - margin) {
      if (currentTargetRef.current) {
        const targetRect = currentTargetRef.current.getBoundingClientRect();
        clampedY = targetRect.top - 6;
        placement = 'top';
      }
    }

    setPos({ x: clampedX, y: clampedY, placement });
  }, [state.visible, state.x, state.y, state.placement, state.text]);

  if (!state.visible || !state.text) return null;

  return createPortal(
    <div
      className="fixed z-[9999999] pointer-events-none select-none transition-all duration-75 ease-out"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: pos.placement === 'top' 
          ? 'translate(-50%, -100%)' 
          : 'translate(-50%, 0)',
      }}
    >
      <div 
        ref={tooltipRef}
        className="relative px-2.5 py-1.5 rounded-md bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] font-semibold tracking-wide shadow-xl border border-slate-700/60 backdrop-blur-xs max-w-[min(340px,calc(100vw-36px))] whitespace-normal break-words text-center leading-snug animate-in fade-in-0 zoom-in-95 duration-100"
      >
        {state.text}
      </div>
    </div>,
    document.body
  );
}

