import React from 'react';
import { motion } from 'motion/react';
import { useAppData } from '../context/AppDataContext';
import { formatTextWithAccent } from '../utils/formatText';
import { HorizontalProcessScroll } from '../components/HorizontalProcessScroll';

export default function Process() {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;
  
  return (
    <div className="w-full mx-auto min-h-screen relative">
      <HorizontalProcessScroll 
        title={data.process.title}
        subtitle={data.process.subtitle}
        steps={data.process.steps} 
        media={data.process.media || []} 
        themeColor={data.theme.primaryColor} 
      />
    </div>
  );
}
