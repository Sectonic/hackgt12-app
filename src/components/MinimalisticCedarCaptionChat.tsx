'use client';

import React from 'react';
import { FloatingContainer } from '@/cedar/components/structural/FloatingContainer';
import { ChatInput } from '@/cedar/components/chatInput/ChatInput';
import Container3D from '@/cedar/components/containers/Container3D';
import { cn } from '@/lib/utils';

interface MinimalisticCedarCaptionChatProps {
  className?: string;
  stream?: boolean;
  width?: number;
}

export const MinimalisticCedarCaptionChat: React.FC<MinimalisticCedarCaptionChatProps> = ({
  className = '',
  stream = true,
  width = 400,
}) => {
  return (
    <FloatingContainer
      isActive={true}
      position="bottom-center"
      dimensions={{ width, maxWidth: width }}
      resizable={false}
      className={cn('cedar-minimalistic-caption-container', className)}
    >
      <Container3D className="px-4 py-2">
        <ChatInput 
          className="bg-transparent p-0 text-xs border-none shadow-none" 
          stream={stream}
        />
      </Container3D>
    </FloatingContainer>
  );
};
