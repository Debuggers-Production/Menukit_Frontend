import React, { useState, useMemo } from 'react';
import { extractUrlsAndCleanText } from '@/utils/urlPlatformHelper';
import { PlatformLinkBadges } from '@/components/common/PlatformLinkBadges';

interface LinkifiedTextProps {
  text?: string | null;
  className?: string;
  linkClassName?: string;
  showIcon?: boolean;
}

export const LinkifiedText: React.FC<LinkifiedTextProps> = ({
  text,
  className = '',
}) => {
  if (!text) return null;

  const { cleanText, links } = useMemo(() => {
    return extractUrlsAndCleanText(text);
  }, [text]);

  if (links.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline ${className}`}>
      {cleanText && <span>{cleanText} </span>}
      <span className="inline-flex align-middle ml-1">
        <PlatformLinkBadges links={links} variant="card" />
      </span>
    </span>
  );
};

export default LinkifiedText;
