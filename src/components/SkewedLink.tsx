import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import React from 'react';

interface SkewedLinkProps {
  children: React.ReactNode;
  to?: string;
  href?: string;
  className?: string;
  uppercase?: boolean;
  bold?: boolean;
  hoverColor?: string;
}

export const SkewedLink: React.FC<SkewedLinkProps> = ({ children, to, href, className = '', uppercase = true, bold = true, hoverColor }) => {
  const [isHovered, setIsHovered] = useState(false);

  const textClass = `block text-zinc-100 ${uppercase ? 'uppercase' : ''} ${bold ? 'font-bold' : ''}`;

  const content = (
    <div className="relative overflow-hidden inline-block py-1">
      <motion.div
        className="relative flex flex-col items-start justify-start"
        initial={{ y: "0%", skewY: 0 }}
        animate={{ 
          y: isHovered ? "-100%" : "0%", 
          skewY: isHovered ? [0, 5, 0] : [0, -5, 0] 
        }}
        transition={{ 
          duration: 0.5, 
          ease: [0.76, 0, 0.24, 1]
        }}
      >
        <span className={textClass}>{children}</span>
        <span className={`absolute top-full left-0 w-full text-left ${textClass}`} style={{ color: hoverColor }} aria-hidden="true">{children}</span>
      </motion.div>
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] w-full"
        style={{ backgroundColor: hoverColor || 'currentColor', transformOrigin: isHovered ? 'left' : 'right' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
      />
    </div>
  );

  if (to) {
    return (
      <Link 
        to={to} 
        className={`inline-block group ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </Link>
    );
  }

  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-block group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </a>
  );
}
