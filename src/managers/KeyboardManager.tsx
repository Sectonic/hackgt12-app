"use client";

import { useEffect, useState } from 'react';
import { Item, PlacedItem, PlacedEntity } from '@/app/plans/[planId]/types';
import { SelectionManager } from './SelectionManager';

interface KeyHint {
  key: string;
  label: string;
  displayKey: string;
}

interface KeyboardManagerProps {
  currentItem: Item | null;
  onItemChange: (item: Item) => void;
  selectedItems: PlacedEntity[];
  onSelectedItemsChange: (items: PlacedEntity[]) => void;
  isEditingMode: boolean;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteSelectedItems: () => void;
  hasValidPlacement: boolean;
  screenCursorPos: { x: number; y: number };
  stageScale: number;
  roomShortcutsEnabled?: boolean;
  onRoomConfirm?: () => void;
  onRoomCancel?: () => void;
  roomBuilderIsValid?: boolean;
}

const transformKeyHints: KeyHint[] = [
  { key: 'q', label: 'Rotate Left', displayKey: 'Q' },
  { key: 'e', label: 'Rotate Right', displayKey: 'E' },
  { key: 'w', label: 'Enlarge', displayKey: 'W' },
  { key: 's', label: 'Shrink', displayKey: 'S' },
  { key: 'a', label: 'Flip Left', displayKey: 'A' },
  { key: 'd', label: 'Flip Right', displayKey: 'D' },
];

const editingKeyHints: KeyHint[] = [
  { key: 'enter', label: 'Save', displayKey: '↵' },
  { key: 'escape', label: 'Cancel', displayKey: 'Esc' },
  { key: 'delete', label: 'Delete Selected', displayKey: 'Del' },
];

const roomKeyHints: KeyHint[] = [
  { key: 'enter', label: 'Confirm Room', displayKey: '↵' },
  { key: 'escape', label: 'Cancel Room', displayKey: 'Esc' },
];

export default function KeyboardManager({ 
  currentItem, 
  onItemChange,
  selectedItems,
  onSelectedItemsChange,
  isEditingMode,
  onSaveEdit,
  onCancelEdit,
  onDeleteSelectedItems,
  hasValidPlacement,
  screenCursorPos, 
  stageScale,
  roomShortcutsEnabled = false,
  onRoomConfirm,
  onRoomCancel,
  roomBuilderIsValid = true
}: KeyboardManagerProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let keyPressed: string | null = null;
      let transformedItems: PlacedEntity[] | null = null;
      let transformedCurrentItem: Item | null = null;

      const lowerKey = e.key.toLowerCase();

      if (roomShortcutsEnabled) {
        switch (lowerKey) {
          case 'enter':
            onRoomConfirm?.();
            keyPressed = 'enter';
            break;
          case 'escape':
            onRoomCancel?.();
            keyPressed = 'escape';
            break;
        }
      }

      if (keyPressed) {
        e.preventDefault();
      } else if (isEditingMode) {
        switch (lowerKey) {
          case 'enter':
            if (hasValidPlacement) {
              onSaveEdit();
              keyPressed = 'enter';
            }
            break;
          case 'escape':
            onCancelEdit();
            keyPressed = 'escape';
            break;
          case 'delete':
          case 'backspace':
            if (selectedItems.length > 0) {
              onDeleteSelectedItems();
              keyPressed = 'delete';
            }
            break;
        }
      }

      if (currentItem) {
        switch (lowerKey) {
          case 'q':
            transformedCurrentItem = {
              ...currentItem,
              rotation: (currentItem.rotation - 45 + 360) % 360
            };
            keyPressed = 'q';
            break;
          case 'e':
            transformedCurrentItem = {
              ...currentItem,
              rotation: (currentItem.rotation + 45) % 360
            };
            keyPressed = 'e';
            break;
          case 'w':
            transformedCurrentItem = {
              ...currentItem,
              scale: Math.min(currentItem.scale + 0.05, 3)
            };
            keyPressed = 'w';
            break;
          case 's':
            transformedCurrentItem = {
              ...currentItem,
              scale: Math.max(currentItem.scale - 0.05, 0.1)
            };
            keyPressed = 's';
            break;
          case 'a':
            transformedCurrentItem = {
              ...currentItem,
              inverted: true
            };
            keyPressed = 'a';
            break;
          case 'd':
            transformedCurrentItem = {
              ...currentItem,
              inverted: false
            };
            keyPressed = 'd';
            break;
        }

        if (transformedCurrentItem && keyPressed) {
          onItemChange(transformedCurrentItem);
        }
      } else if (selectedItems.length > 0) {
        switch (lowerKey) {
          case 'q':
            transformedItems = SelectionManager.rotateSelectedEntities(selectedItems, -45);
            keyPressed = 'q';
            break;
          case 'e':
            transformedItems = SelectionManager.rotateSelectedEntities(selectedItems, 45);
            keyPressed = 'e';
            break;
          case 'w':
            transformedItems = SelectionManager.scaleSelectedEntities(selectedItems, 1.05);
            keyPressed = 'w';
            break;
          case 's':
            transformedItems = SelectionManager.scaleSelectedEntities(selectedItems, 0.95);
            keyPressed = 's';
            break;
          case 'a':
            transformedItems = SelectionManager.flipSelectedEntities(selectedItems, 'horizontal');
            keyPressed = 'a';
            break;
          case 'd':
            transformedItems = SelectionManager.flipSelectedEntities(selectedItems, 'horizontal');
            keyPressed = 'd';
            break;
        }

        if (transformedItems && keyPressed) {
          onSelectedItemsChange(transformedItems);
        }
      }

      if (keyPressed) {
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
  }, [
    currentItem,
    selectedItems,
    isEditingMode,
    hasValidPlacement,
    onItemChange,
    onSelectedItemsChange,
    onSaveEdit,
    onCancelEdit,
    onDeleteSelectedItems,
    roomShortcutsEnabled,
    onRoomConfirm,
    onRoomCancel
  ]);

  // Don't render during SSR to prevent hydration mismatches
  if (!isClient) {
    return null;
  }

  // Show keyboard manager if:
  // 1. We have a current item (placing new items)
  // 2. We have selected items (editing existing items)
  // 3. We're in editing mode (even if selection is temporarily empty)
  if (!currentItem && selectedItems.length === 0 && !isEditingMode && !roomShortcutsEnabled) {
    return null;
  }

  const effectiveItemWidth = currentItem ? currentItem.width * currentItem.scale * stageScale : 0;

  const hints = roomShortcutsEnabled
    ? roomKeyHints
    : (
        (currentItem || selectedItems.length > 0)
          ? transformKeyHints
          : []
      ).concat(isEditingMode ? editingKeyHints : []);

  if (hints.length === 0) {
    return null;
  }

  const hintsComponent = (
    <div 
      className="fixed z-11 pointer-events-none"
      style={{
        left: screenCursorPos.x + effectiveItemWidth / 2 + 20,
        top: screenCursorPos.y + 20,
      }}
    >
      <div className="bg-white/30 rounded-lg p-2 shadow-sm">
        <div className="space-y-1">
          {hints.map((hint) => {
            const isPressed = pressedKeys.has(hint.key);
            const isDisabled = hint.key === 'enter'
              ? roomShortcutsEnabled
                ? !roomBuilderIsValid
                : isEditingMode && !hasValidPlacement
              : false;
            
            return (
              <div key={hint.key} className="flex items-center gap-2">
                <div
                  className={`
                    w-6 h-5 rounded flex items-center justify-center text-xs font-mono font-bold
                    transition-all duration-200 ease-out
                    ${isPressed 
                      ? 'bg-blue-500 text-white scale-125 shadow-md' 
                      : isDisabled
                      ? 'bg-gray-400 text-gray-600'
                      : 'bg-white/80 text-gray-800'
                    }
                  `}
                >
                  {hint.displayKey}
                </div>
                <span className={`text-xs min-w-[50px] font-medium drop-shadow-sm ${
                  isDisabled ? 'text-gray-500' : 'text-black'
                }`}>
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
