import React from 'react';
import { ControlledGoogleAd, ControlledGoogleAdProps } from './ControlledGoogleAd';

export interface PublicMenuAdBannerProps {
  variant?: 'header' | 'in-feed' | 'topbar' | 'bottombar';
  position?: 'topbar' | 'bottombar';
  showAds?: boolean;
  className?: string;
  adSlotId?: string;
}

/**
 * Public Menu Ad Banner
 * Controlled directly by Menukit subscription checks.
 * Completely removed when the shop has an active paid subscription.
 */
export const PublicMenuAdBanner: React.FC<PublicMenuAdBannerProps> = ({
  variant = 'topbar',
  position,
  showAds = false,
  className = '',
  adSlotId,
}) => {
  const resolvedPosition = position || (variant === 'in-feed' ? 'bottombar' : 'topbar');
  return (
    <ControlledGoogleAd
      position={resolvedPosition}
      showAds={showAds}
      className={className}
      adSlotId={adSlotId}
    />
  );
};

export { ControlledGoogleAd };
