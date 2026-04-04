import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface StaggeredLinkProps {
  text: string;
  to: string;
  className?: string;
  hoverColor?: string;
  showArrow?: boolean;
}

export const StaggeredLink: React.FC<StaggeredLinkProps> = ({ text, to, className = '', hoverColor, showArrow }) => {
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <div className="flex items-center gap-3 md:gap-6 relative w-full py-2">
      {showArrow && (
        <motion.div
          animate={{ 
            x: isHovered ? 12 : 0, 
            color: isHovered && hoverColor ? hoverColor : 'inherit',
            scale: isHovered ? 1.1 : 1
          }}
          transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          className="flex items-center justify-center shrink-0"
        >
          <ArrowRight className="w-[0.8em] h-[0.8em]" strokeWidth={2} />
        </motion.div>
      )}
      <div className="relative overflow-hidden flex whitespace-nowrap">
        {text.split('').map((char, i) => (
          <div key={i} className="relative flex flex-col justify-start">
            {/* Hidden bold text to dictate width and prevent layout shift */}
            <span className="block font-bold invisible" aria-hidden="true">
              {char === ' ' ? '\u00A0' : char}
            </span>
            <motion.span
              className="absolute top-0 left-0 block font-normal"
              animate={{ y: isHovered ? "-100%" : "0%", opacity: isHovered ? 0 : 1 }}
              transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: i * 0.02 }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
            <motion.span
              className="absolute top-full left-0 block font-bold"
              style={{ color: hoverColor }}
              animate={{ y: isHovered ? "-100%" : "0%" }}
              transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: i * 0.02 }}
              aria-hidden="true"
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          </div>
        ))}
      </div>
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] w-full"
        style={{ backgroundColor: hoverColor || 'currentColor', transformOrigin: isHovered ? 'left' : 'right' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
      />
    </div>
  );

  return (
    <Link 
      to={to} 
      className={`inline-block group w-full ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </Link>
  );
};
