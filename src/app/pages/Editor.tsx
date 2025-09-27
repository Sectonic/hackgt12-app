import { useParams } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  MousePointer2,
  Move,
  Square,
  Home,
  Package,
  Type,
  Eraser,
  ZoomIn,
  ZoomOut,
  Save,
} from 'lucide-react';

interface EditorProps {
  user: any;
}

export default function Editor({ user }: EditorProps) {
  const { id } = useParams();

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-canvas">
      {/* Left Toolbar */}
      <Card className="w-16 h-full rounded-none border-r border-border">
        <div className="flex flex-col items-center py-4 space-y-2">
          <Button variant="outline" size="icon" className="w-12 h-12">
            <MousePointer2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12">
            <Move className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12">
            <Square className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12">
            <Home className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12">
            <Package className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12">
            <Type className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-12 h-12">
            <Eraser className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        {/* Top Toolbar */}
        <Card className="absolute top-4 left-4 right-4 z-10 rounded-lg border border-border bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Plan #{id}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">100%</span>
              <Button variant="ghost" size="sm">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="default" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </Card>

        {/* Canvas */}
        <div className="w-full h-full bg-canvas relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                   linear-gradient(to right, hsl(var(--grid)) 1px, transparent 1px),
                   linear-gradient(to bottom, hsl(var(--grid)) 1px, transparent 1px)
                 `,
              backgroundSize: '16px 16px',
            }}
          ></div>

          {/* Canvas content placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Square className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Start designing your floor plan</p>
              <p className="text-sm">Use the tools on the left to add walls, rooms, and objects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Chat Panel */}
      <Card className="w-80 h-full rounded-none border-l border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">AI Assistant</h3>
          <p className="text-sm text-muted-foreground">Chat with your design assistant</p>
        </div>
        <div className="flex-1 p-4">
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-sm">AI assistant coming soon...</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
