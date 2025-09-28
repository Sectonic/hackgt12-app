import { useEffect, useCallback } from 'react';
import { useCedarStore } from 'cedar-os';
import type { RoomDefinition, PlacedEntity } from '@/app/plans/[planId]/types';

interface FloorPlanChatHookProps {
  onFloorPlanUpdate: (data: {
    roomDefinitions: RoomDefinition[];
    placedEntities: PlacedEntity[];
  }) => void;
  onError?: (error: string) => void;
}

export const useFloorPlanChat = ({
  onFloorPlanUpdate,
  onError,
}: FloorPlanChatHookProps) => {
  const { messages, addMessage } = useCedarStore();

  // Listen for floor plan results in Cedar messages
  useEffect(() => {
    const handleMessages = () => {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage?.type === 'assistant' && lastMessage.data) {
        try {
          // Check if the message contains floor plan data
          if (lastMessage.data.type === 'floor-plan-result' && lastMessage.data.payload) {
            const { RoomDefinition, PlacedEntity } = lastMessage.data.payload;
            
            if (RoomDefinition && PlacedEntity) {
              onFloorPlanUpdate({
                roomDefinitions: RoomDefinition,
                placedEntities: PlacedEntity,
              });
            }
          } else if (lastMessage.data.type === 'floor-plan-complete' && lastMessage.data.payload) {
            const { RoomDefinition, PlacedEntity } = lastMessage.data.payload;
            
            if (RoomDefinition && PlacedEntity) {
              onFloorPlanUpdate({
                roomDefinitions: RoomDefinition,
                placedEntities: PlacedEntity,
              });
            }
          } else if (lastMessage.data.type === 'error') {
            onError?.(lastMessage.data.content || 'Unknown error occurred');
          }
        } catch (error) {
          console.error('Error processing floor plan message:', error);
          onError?.('Failed to process floor plan data');
        }
      }
    };

    handleMessages();
  }, [messages, onFloorPlanUpdate, onError]);

  const sendFloorPlanRequest = useCallback((prompt: string, context?: {
    buildingType?: string;
    approximateSize?: string;
    stylePreference?: string;
    specialRequirements?: string[];
  }) => {
    const message = {
      role: 'user' as const,
      content: prompt,
      data: {
        additionalContext: context,
      },
    };

    addMessage(message);
  }, [addMessage]);

  const sendFloorPlanWithImage = useCallback((prompt: string, imageData: string, context?: {
    buildingType?: string;
    approximateSize?: string;
    stylePreference?: string;
    specialRequirements?: string[];
  }) => {
    const message = {
      role: 'user' as const,
      content: prompt,
      data: {
        imageData,
        additionalContext: context,
      },
    };

    addMessage(message);
  }, [addMessage]);

  const sendFloorPlanWithSVG = useCallback((prompt: string, svgData: string, context?: {
    buildingType?: string;
    approximateSize?: string;
    stylePreference?: string;
    specialRequirements?: string[];
  }) => {
    const message = {
      role: 'user' as const,
      content: prompt,
      data: {
        svgData,
        additionalContext: context,
      },
    };

    addMessage(message);
  }, [addMessage]);

  return {
    sendFloorPlanRequest,
    sendFloorPlanWithImage,
    sendFloorPlanWithSVG,
    messages,
  };
};
