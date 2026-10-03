import React from 'react';

export default function ReelMark({ size = 24, className = '', alt = 'Rainbow Packages Logo' }) {
  return (
    <img
      src="/rainbow-packaging-icon.png"
      alt={alt}
      width={size}
      height={size}
      style={{ width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
