import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

import { useAppData } from '../context/AppDataContext';

interface ImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ src, alt, isOpen, onClose }: ImageViewerProps) {
  const { data } = useAppData();
  const speed = data.theme.animationSpeed || 1;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 / speed }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
          onContextMenu={(e) => e.preventDefault()}
        >
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Controls */}
                <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); resetTransform(); }}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-6 h-6" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full backdrop-blur-md transition-colors ml-4"
                    title="Close"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Image Container */}
                <div 
                  className="relative w-full h-full flex items-center justify-center overflow-hidden p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full max-h-full object-contain select-none pointer-events-auto cursor-grab active:cursor-grabbing"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </TransformComponent>
                </div>
              </>
            )}
          </TransformWrapper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
