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
            <span key={index} style={{ color: primaryColor }}>
              {part}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
