import React from 'react';

export function Card({ className = '', ...props }) {
  return (
    <div 
      className={`rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm ${className}`} 
      {...props} 
    />
  );
}

export function CardContent({ className = '', ...props }) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}
