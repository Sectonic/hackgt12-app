"use client";

import { CiLocationArrow1 } from "react-icons/ci";
import { LiaCouchSolid } from "react-icons/lia";
import { PiWallLight } from "react-icons/pi";
import { Tooltip } from 'react-tooltip';

import Image from "next/image";
import { Item } from "./types";

export type ToolType = 'select' | 'furniture' | 'wall';

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

interface ToolbarProps {
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
  items: Item[];
  currentItem: Item | null;
  onItemSelect: (item: Item | null) => void;
}

export default function Toolbar({ selectedTool, onToolSelect, items, currentItem, onItemSelect }: ToolbarProps) {

  const tools = [
    { id: 'select' as ToolType, icon: <CiLocationArrow1/>, label: 'Select' },
    { id: 'furniture' as ToolType, icon: <LiaCouchSolid/>, label: 'Furniture' },
    { id: 'wall' as ToolType, icon: <PiWallLight />, label: 'Wall' },
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
      </div>
    </div>
  );
}
