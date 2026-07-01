import React from 'react';

export function Button({ className = '', variant = 'default', size = 'default', ...props }) {
  const hasJustify = className.includes('justify-');
  let baseStyle = `inline-flex items-center ${hasJustify ? '' : 'justify-center'} rounded-lg font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-transform duration-100`;
  
  let variants = {
    default: 'bg-neutral-900 text-neutral-50 hover:bg-neutral-900/90 shadow-sm',
    ghost: 'hover:bg-neutral-100 hover:text-neutral-900 text-neutral-900',
    outline: 'border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-900',
    secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80'
  };
  
  let sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    sm: 'h-9 px-3 text-xs',
    lg: 'h-11 px-8',
    icon: 'h-8 w-8'
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`} 
      {...props} 
    />
  );
}
