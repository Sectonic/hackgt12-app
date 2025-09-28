"use client";

import { useMemo } from 'react';
import { CiLocationArrow1 } from "react-icons/ci";
import { LiaCouchSolid } from "react-icons/lia";
import { PiWallLight } from "react-icons/pi";
import { Tooltip } from 'react-tooltip';
import { MdCheckBoxOutlineBlank } from "react-icons/md";
import { FiPlus } from 'react-icons/fi';

import Image from "next/image";
import { FlooringType, Item, RoomDefinition, NOT_IN_ROOM_ID } from "./types";

export type ToolType = 'select' | 'furniture' | 'wall' | 'rooms';

const renderItemGrid = (items: ToolbarItem[], currentItem: Item | null, onItemSelect: (item: Item | null) => void, allItems: Item[]) => (
  <div className="bg-white rounded-2xl shadow-lg p-2">
    <div className="grid grid-cols-2 gap-2 max-h-[480px] overflow-y-auto furniture-menu-scroll">
      {items.map((item) => (
        <button
          key={item.file}
            className={`
              w-16 h-16 rounded-xl flex items-center justify-center
              text-gray-600 transition-all duration-200 cursor-pointer
              ${currentItem?.file === item.file ? 'bg-blue-500/10 border border-blue-500 text-blue-500' : 'hover:bg-gray-100 hover:text-blue-500'}
            `}
            data-tooltip-id={`item-${item.file}`}
            data-tooltip-content={item.name}
            onClick={() => {
              const fullItem = allItems.find(i => i.file === item.file);
              onItemSelect(currentItem?.file === item.file ? null : fullItem || null);
            }}
        >
          <div className="h-6 w-6 flex items-center justify-center">{item.icon}</div>
          <Tooltip 
            id={`item-${item.file}`}
            place="bottom"
            style={{ backgroundColor: '#1f2937', color: 'white', fontSize: '12px' }}
          />
        </button>
      ))}
    </div>
  </div>
);

interface ToolbarItem {
  file: string;
  name: string;
  icon: React.ReactNode;
}

const flooringOptions: { value: FlooringType; label: string }[] = [
  { value: 'floor_tile', label: 'Tile' },
  { value: 'floor_wood', label: 'Wood' },
  { value: 'floor_stone', label: 'Stone' },
  { value: 'floor_carpet', label: 'Carpet' }
];

interface ToolbarProps {
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  items: Item[];
  currentItem: Item | null;
  onItemSelect: (item: Item | null) => void;
  rooms?: RoomDefinition[];
  activeRoomId?: string | null;
  roomToolMode?: 'view' | 'creating' | 'editing';
  onStartRoomCreation?: () => void;
  onCancelRoomAction?: () => void;
  onConfirmRoomAction?: () => void;
  onRenameRoom?: (roomId: string, name: string) => void;
  onRoomFlooringChange?: (roomId: string, flooring: FlooringType) => void;
  roomToolError?: string | null;
  builderIsValid?: boolean;
}

export default function Toolbar({
  selectedTool,
  onToolSelect,
  items,
  currentItem,
  onItemSelect,
  rooms = [],
  activeRoomId = null,
  roomToolMode = 'view',
  onStartRoomCreation,
  onCancelRoomAction,
  onConfirmRoomAction,
  onRenameRoom,
  onRoomFlooringChange,
  roomToolError,
  builderIsValid
}: ToolbarProps) {
  const orderedRooms = useMemo(() => {
    return rooms
      .filter((room) => room.id !== NOT_IN_ROOM_ID)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [rooms, activeRoomId]
  );

  const roomModeHint = useMemo(() => {
    switch (roomToolMode) {
      case 'creating':
        return 'Select wall endpoints to outline the room. Enter to confirm, Esc to cancel.';
      case 'editing':
        return 'Adjust the room by clicking wall nodes. Enter saves the changes, Esc discards them.';
      default:
        return 'Select a room to highlight it or start editing its wall cycle.';
    }
  }, [roomToolMode]);

  const tools = [
    { id: 'select' as ToolType, icon: <CiLocationArrow1/>, label: 'Select' },
    { id: 'furniture' as ToolType, icon: <LiaCouchSolid/>, label: 'Furniture' },
    { id: 'wall' as ToolType, icon: <PiWallLight />, label: 'Wall' },
    { id: 'rooms' as ToolType, icon: <MdCheckBoxOutlineBlank />, label: 'Rooms' },
  ];

  const furnitureItems: ToolbarItem[] = items
    .filter(item => item.type === 'furniture')
    .map(item => ({
      file: item.file,
      name: item.name,
      icon: <Image src={`/icons/furniture/${item.file}.svg`} alt={item.file} className="w-6 h-auto" height={0} width={0} sizes="100vw" />
    }));

  const foundationalItems: ToolbarItem[] = items
    .filter(item => item.type === 'foundational')
    .map(item => ({
      file: item.file,
      name: item.name,
      icon: <Image src={`/icons/foundational/${item.file}.svg`} alt={item.file} className="w-6 h-auto" height={0} width={0} sizes="100vw" />
    }));

  const renderRoomMenu = () => (
    <div className="bg-white rounded-2xl shadow-lg p-3 w-72 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">Rooms</span>
          {selectedRoom && (
            <span className="text-xs text-slate-500">{selectedRoom.name}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onStartRoomCreation?.();
          }}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600"
        >
          <FiPlus className="h-3.5 w-3.5" />
          <span>New</span>
        </button>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">{roomModeHint}</p>

      <div className="space-y-2 max-h-[360px] overflow-y-auto furniture-menu-scroll pr-1">
        {orderedRooms.map((room) => {
          const isActive = room.id === activeRoomId;
          const chipColor = room.color ?? '#94a3b8';
          const canRename = Boolean(onRenameRoom);
          const canUpdateFlooring = Boolean(onRoomFlooringChange);

          return (
            <div
              key={room.id}
              className={`rounded-xl border px-3 py-3 space-y-3 transition cursor-default ${
                isActive
                  ? 'border-blue-400 bg-blue-50/70 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chipColor }}
                />
                <input
                  value={room.name}
                  onChange={(event) => {
                    if (!canRename) return;
                    onRenameRoom?.(room.id, event.target.value);
                  }}
                  placeholder="Room name"
                  disabled={!canRename}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label={`${room.name} flooring`}
              >
                {flooringOptions.map((option) => {
                  const isSelected = room.flooring === option.value;
                  const isDisabled = !canUpdateFlooring;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled || option.value === room.flooring) return;
                        onRoomFlooringChange?.(room.id, option.value);
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 text-blue-600 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'
                      } ${isDisabled ? 'cursor-not-allowed opacity-60 hover:border-slate-200 hover:bg-transparent' : 'cursor-pointer'}`}
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white">
                        <Image
                          src={`/icons/furniture/${option.value}.svg`}
                          alt={option.value}
                          className="w-5 h-auto"
                          height={0}
                          width={0}
                          sizes="100vw"
                        />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {roomToolError && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-xs text-rose-600">
          {roomToolError}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-10">
      <div className="flex gap-3 items-center">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex flex-col gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                if (selectedTool === tool.id && tool.id !== 'select') {
                  onToolSelect('select');
                  onItemSelect(null);
                } else {
                  onToolSelect(tool.id);
                  if (tool.id === 'select') {
                    onItemSelect(null);
                  }
                }
              }}
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-xl
                transition-all duration-200 hover:scale-105 cursor-pointer
                ${selectedTool === tool.id 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'text-black hover:bg-gray-100'
                }
              `}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {selectedTool === 'furniture' && renderItemGrid(furnitureItems, currentItem, onItemSelect, items)}

        {selectedTool === 'wall' && renderItemGrid(foundationalItems, currentItem, onItemSelect, items)}

        {selectedTool === 'rooms' && renderRoomMenu()}

      </div>
    </div>
  );
}
