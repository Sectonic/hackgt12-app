"use client";
import { CiLocationArrow1 } from "react-icons/ci";
import { LiaCouchSolid } from "react-icons/lia";
import { PiWallLight } from "react-icons/pi";
import { 
  FaChair, 
  FaBed, 
  FaTable, 
  FaTv,
  FaDoorOpen,
  FaWindowMaximize
} from "react-icons/fa";

import Image from "next/image";

export type ToolType = 'select' | 'furniture' | 'wall';

interface Item {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface ToolbarProps {
  selectedTool: ToolType;
  onToolSelect: (tool: ToolType) => void;
}

export default function Toolbar({ selectedTool, onToolSelect }: ToolbarProps) {

  const tools = [
    { id: 'select' as ToolType, icon: <CiLocationArrow1/>, label: 'Select' },
    { id: 'furniture' as ToolType, icon: <LiaCouchSolid/>, label: 'Furniture' },
    { id: 'wall' as ToolType, icon: <PiWallLight />, label: 'Wall' },
  ];

  const furnitureItems: Item[] = [
    { id: 'chair', name: 'Chair', icon: <FaChair /> },
    { id: 'bed', name: 'Bed', icon: <FaBed /> },
    { id: 'table', name: 'Table', icon: <FaTable /> },
    { id: 'tv', name: 'TV', icon: <FaTv /> },
    { id: 'door', name: 'Door', icon: <FaDoorOpen /> },
    { id: 'window', name: 'Window', icon: <FaWindowMaximize /> },
  ];

  const foundationalItems: Item[] = [
    { id: 'wall', name: 'Wall', icon: <Image src="/icons/wall.svg" alt="Wall" width={24} height={24} /> },
    { id: 'window', name: 'Window', icon: <Image src="/icons/window.svg" alt="Window" width={24} height={24} /> },
    { id: 'door', name: 'Door', icon: <Image src="/icons/door.svg" alt="Door" width={24} height={24} /> }
  ];


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
                } else {
                  onToolSelect(tool.id);
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

        {selectedTool === 'furniture' && (
          <div className="bg-white rounded-2xl shadow-lg p-2">
            <div className="grid grid-cols-2 gap-2 overflow-y-auto furniture-menu-scroll">
              {furnitureItems.map((item) => (
                <button
                  key={item.id}
                  className="
                    w-16 h-16 rounded-xl flex flex-col items-center justify-center
                    text-gray-600 hover:bg-gray-100 hover:text-blue-500
                    transition-all duration-200 cursor-pointer
                  "
                  title={item.name}
                >
                  <div className="h-6 w-6 flex items-center justify-center mb-1">{item.icon}</div>
                  <div className="text-xs">{item.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTool === 'wall' && (
          <div className="bg-white rounded-2xl shadow-lg p-2">
            <div className="grid grid-cols-2 gap-2 overflow-y-auto furniture-menu-scroll">
              {foundationalItems.map((item) => (
                <button
                  key={item.id}
                  className="
                    w-16 h-16 rounded-xl flex flex-col items-center justify-center
                    text-gray-600 hover:bg-gray-100 hover:text-blue-500
                    transition-all duration-200 cursor-pointer
                  "
                  title={item.name}
                >
                  <div className="h-6 w-6 flex items-center justify-center mb-1">{item.icon}</div>
                  <div className="text-xs">{item.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
