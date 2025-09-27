"use client";

import { useState, useCallback, useEffect } from 'react';
import { LuRedo2, LuUndo2 } from "react-icons/lu";

interface HistoryOptions {
  maxHistorySize?: number;
}

interface HistoryProps<T> {
  initialState: T;
  onChange: (newState: T) => void;
  options?: HistoryOptions;
}

export default function History<T>({ 
  initialState, 
  onChange, 
  options = {} 
}: HistoryProps<T>) {
  const { maxHistorySize = 50 } = options;

  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentState = history[historyIndex];

  useEffect(() => {
    onChange(currentState);
  }, [currentState, onChange]);

  const addToHistory = useCallback((newState: T) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex, maxHistorySize]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && canRedo) {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return {
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    component: (
      <div className="fixed top-4 left-4 z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`
              w-12 h-8 rounded-xl flex items-center justify-center text-lg
              transition-all duration-200
              ${canUndo 
                ? 'text-black hover:bg-gray-100 hover:scale-105 cursor-pointer' 
                : 'text-gray-300 cursor-not-allowed'
              }
            `}
            title="Undo (Ctrl+Z)"
          >
            <LuUndo2 />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`
              w-12 h-8 rounded-xl flex items-center justify-center text-lg
              transition-all duration-200
              ${canRedo 
                ? 'text-black hover:bg-gray-100 hover:scale-105 cursor-pointer' 
                : 'text-gray-300 cursor-not-allowed'
              }
            `}
            title="Redo (Ctrl+Y)"
          >
            <LuRedo2 />
          </button>
        </div>
      </div>
    )
  };
}
