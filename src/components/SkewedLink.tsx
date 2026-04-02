import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import React from 'react';

interface SkewedLinkProps {
  children: React.ReactNode;
  to?: string;
  href?: string;
  className?: string;
}

export const SkewedLink: React.FC<SkewedLinkProps> = ({ children, to, href, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <div className="relative overflow-hidden inline-block">
      <motion.div
        className="relative flex flex-col items-center justify-center"
        initial={{ y: "0%", skewY: 0 }}
        animate={{ 
          y: isHovered ? "-100%" : "0%", 
          skewY: isHovered ? [0, 10, 0] : [0, -10, 0] 
        }}
        transition={{ 
          duration: 0.4, 
          ease: [0.19, 1, 0.22, 1] // expo.out
        }}
      >
        <span className="block uppercase font-bold text-zinc-100">{children}</span>
        <span className="absolute top-full left-0 w-full text-center block uppercase font-bold text-zinc-100" aria-hidden="true">{children}</span>
      </motion.div>
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
