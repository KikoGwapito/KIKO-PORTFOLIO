import React from 'react';

export function formatTextWithAccent(text: string, primaryColor: string) {
  if (!text) return null;
  
  const parts = text.split(/`([^`]+)`/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Even indices are normal text, odd indices are the text inside backticks
        if (index % 2 === 1) {
          return (
            <span key={index} className="relative inline-block whitespace-nowrap">
              <span 
                className="absolute left-0 top-0 w-full h-full opacity-60 pointer-events-none mix-blend-screen" 
                style={{ 
                  color: 'transparent',
                  textShadow: `0 0 20px ${primaryColor}, 0 0 40px ${primaryColor}`,
                  animation: 'text-glow-pulse 4s infinite ease-in-out alternate'
                }}
                aria-hidden="true"
              >
                {part}
              </span>
              <span className="relative z-10" style={{ color: primaryColor, textShadow: `0 0 10px ${primaryColor}80` }}>
                {part}
              </span>
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
