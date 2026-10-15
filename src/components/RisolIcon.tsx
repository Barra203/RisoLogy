import React from 'react';

interface RisolIconProps {
  className?: string;
  size?: number;
}

/**
 * RisolIcon - Distinctive, appetizing vector icon representing an Indonesian Risol
 * (golden crispy rolled pastry with breadcrumb texture, diagonal ridges, and savory steam).
 */
export const RisolIcon: React.FC<RisolIconProps> = ({
  className = 'w-5 h-5',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Risol"
    >
      {/* Cylindrical golden crispy roll body with rounded ends */}
      <rect x="2" y="7" width="20" height="10" rx="5" ry="5" />

      {/* Crispy golden diagonal breadcrumb roll markings */}
      <line x1="7" y1="9.5" x2="8.5" y2="14.5" />
      <line x1="11" y1="9.5" x2="12.5" y2="14.5" />
      <line x1="15" y1="9.5" x2="16.5" y2="14.5" />

      {/* Fresh savory steam aroma puffs wafting above */}
      <path d="M6.5 3.8c.5-.7 1.4-.7 1.9 0" strokeWidth="1.5" />
      <path d="M11 2.8c.5-.7 1.4-.7 1.9 0" strokeWidth="1.5" />
      <path d="M15.5 3.8c.5-.7 1.4-.7 1.9 0" strokeWidth="1.5" />

      {/* Breadcrumb crispy textured flecks */}
      <circle cx="4.2" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="19.8" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
};
