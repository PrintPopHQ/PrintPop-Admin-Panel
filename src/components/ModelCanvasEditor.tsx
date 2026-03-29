import { useEffect, useRef, useState } from 'react';
import { initializeCanvas, loadCaseImage, addTestDesign, updateClipRadius } from '../utils/canvas-utils';
import type { SafeArea } from '../utils/canvas-utils';

interface ModelCanvasEditorProps {
  modelImage: string;
  testDesignUrl: string;
  borderRadius: number;
  onModelLoaded?: (safeArea: SafeArea) => void;
}

export default function ModelCanvasEditor({
  modelImage,
  testDesignUrl,
  borderRadius,
  onModelLoaded,
}: ModelCanvasEditorProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any | null>(null);
  const safeAreaRef = useRef<SafeArea | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  useEffect(() => {
    if (!canvasContainerRef.current || canvasRef.current) return;

    const canvasEl = document.createElement('canvas');
    canvasEl.className = 'shadow-lg rounded-xl';
    canvasContainerRef.current.appendChild(canvasEl);

    // Fixed size for admin preview
    const canvas = initializeCanvas(canvasEl, 400, 800);
    canvasRef.current = canvas;
    setIsCanvasReady(true);

    return () => {
      canvas.dispose().then(() => {
        if (canvasEl.parentNode) canvasEl.remove();
      }).catch(console.error);
      canvasRef.current = null;
      setIsCanvasReady(false);
    };
  }, []);

  // Load Model Image
  useEffect(() => {
    const canvas = canvasRef.current;
    loadCaseImage(canvas, modelImage, borderRadius, (safeArea) => {
      safeAreaRef.current = safeArea;
      onModelLoaded?.(safeArea);
      
      // Add Test Design
      if (testDesignUrl) {
        addTestDesign(canvas, testDesignUrl, safeArea).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }, 360).catch((err) => {
      console.error('Failed to load model image:', err);
      setIsLoading(false);
    });
  }, [isCanvasReady, modelImage, testDesignUrl]);

  // Update Border Radius Live
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isCanvasReady || !canvas || !safeAreaRef.current) return;
    
    // Also update safe area stored in ref for future operations
    safeAreaRef.current.rx = borderRadius;
    safeAreaRef.current.ry = borderRadius;
    
    updateClipRadius(canvas, borderRadius);
  }, [isCanvasReady, borderRadius]);

  return (
    <div className="flex justify-center items-center py-4">
      <div className="relative w-[400px] h-[800px]">
        {/* Dedicated container for manually managed canvas */}
        <div ref={canvasContainerRef} className="absolute inset-0 z-0 flex items-center justify-center" />

        {!modelImage && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-10 pointer-events-none">
                <div className="w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <h3 className="text-white font-bold tracking-tight mb-2 text-base">Initialize Calibration</h3>
                <p className="max-w-[180px] text-[10px] text-white/40 font-medium uppercase tracking-[0.12em] leading-relaxed">
                    Upload a model PNG to begin<br/>fine-tuning the design safe-area
                </p>
            </div>
        )}
        
        {/* {isLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30 rounded-xl">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white text-[10px] font-black uppercase tracking-widest">Calibrating Preview...</p>
            </div>
        )} */}
      </div>
    </div>
  );
}
