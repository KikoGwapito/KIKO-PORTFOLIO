import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Magnetic } from './Magnetic';

interface InteractiveIconProps {
  icon: React.ReactNode;
  href: string;
  hoverColor?: string;
  className?: string;
}

export const InteractiveIcon: React.FC<InteractiveIconProps> = ({ icon, href, hoverColor = '#fff', className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Magnetic strength={0.3}>
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative flex items-center justify-center w-14 h-14 rounded-full border border-zinc-800 overflow-hidden group ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: hoverColor }}
          initial={{ scale: 0 }}
          animate={{ scale: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
        />
        <motion.div
          className="relative z-10 text-zinc-400 group-hover:text-zinc-950 transition-colors duration-300"
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
        >
          {icon}
        </motion.div>
      </a>
    </Magnetic>
  );
};
