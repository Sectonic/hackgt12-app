"use client";

import { useEffect, useState } from 'react';
import { Item } from '@/app/plans/[planId]/types';

interface KeyHint {
  key: string;
  label: string;
  displayKey: string;
}

interface KeyboardManagerProps {
  currentItem: Item | null;
  onItemChange: (item: Item) => void;
  screenCursorPos: { x: number; y: number };
  stageScale: number;
}

const keyHints: KeyHint[] = [
  { key: 'r', label: 'Rotate', displayKey: 'R' },
  { key: 'f', label: 'Flip', displayKey: 'F' },
  { key: '+', label: 'Scale Up', displayKey: '+' },
  { key: '-', label: 'Scale Down', displayKey: '-' },
];

export default function KeyboardManager({ 
  currentItem, 
  onItemChange, 
  screenCursorPos, 
  stageScale 
}: KeyboardManagerProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentItem) return;

      let newItem: Item | null = null;
      let keyPressed: string | null = null;

      switch (e.key.toLowerCase()) {
        case 'r':
          newItem = {
            ...currentItem,
            rotation: (currentItem.rotation + 45) % 360
          };
          keyPressed = 'r';
          break;
        case 'f':
          newItem = {
            ...currentItem,
            inverted: !currentItem.inverted
          };
          keyPressed = 'f';
          break;
        case '=':
        case '+':
          newItem = {
            ...currentItem,
            scale: Math.min(currentItem.scale + 0.05, 3)
          };
          keyPressed = '+';
          break;
        case '_':
        case '-':
          newItem = {
            ...currentItem,
            scale: Math.max(currentItem.scale - 0.05, 0.1)
          };
          keyPressed = '-';
          break;
      }

      if (newItem && keyPressed) {
        onItemChange(newItem);
        
        setPressedKeys(prev => new Set(prev).add(keyPressed!));
        setTimeout(() => {
          setPressedKeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(keyPressed!);
            return newSet;
          });
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, onItemChange]);

  if (!currentItem) {
    return null;
  }

  const effectiveItemWidth = currentItem.width * currentItem.scale * stageScale;

  const hintsComponent = (
    <div 
      className="fixed z-10 pointer-events-none"
      style={{
        left: screenCursorPos.x + effectiveItemWidth / 2 + 20,
        top: screenCursorPos.y + 20,
      }}
    >
      <div className="bg-white/30 rounded-lg p-2 shadow-sm">
        <div className="space-y-1">
          {keyHints.map((hint) => {
            const isPressed = pressedKeys.has(hint.key);
            return (
              <div key={hint.key} className="flex items-center gap-2">
                <div
                  className={`
                    w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-bold
                    transition-all duration-200 ease-out
                    ${isPressed 
                      ? 'bg-blue-500 text-white scale-125 shadow-md' 
                      : 'bg-white/80 text-gray-800'
                    }
                  `}
                >
                  {hint.displayKey}
                </div>
                <span className="text-xs text-black min-w-[50px] font-medium drop-shadow-sm">
                  {hint.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return hintsComponent;
}
