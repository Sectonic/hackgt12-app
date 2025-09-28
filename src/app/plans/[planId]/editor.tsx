"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import { useWindow } from '@/hooks/useWindow';
import { useZoom } from '@/hooks/useZoom';
import Toolbar, { ToolType } from './toolBar';
import { PreviewIcon } from './IconComponents';
import {
  DEFAULT_ROOM_FLOORING,
  FlooringType,
  Item,
  PlacedItem,
  PlacedEntity,
  RoomDefinition,
  WallItem,
  NOT_IN_ROOM_ID,
  PlanSnapshot,
  createInitialPlanSnapshot,
  createInitialRoomDefinitions
} from './types';
import { SelectionManager } from '@/managers/SelectionManager';
import { CollisionManager } from '@/managers/CollisionManager';
import { EditingManager, EditingState } from '@/managers/EditingManager';
import { MouseInteractionManager, MouseState } from '@/managers/MouseInteractionManager';
import { WallManager, WallState } from '@/managers/WallManager';
import { v4 as uuidv4 } from 'uuid';
import History from '@/components/History';
import KeyboardManager from '@/managers/KeyboardManager';
import { SnapManager } from '@/managers/SnapManager';
import { canPlaceOnWall } from '@/utils/wallAttachment';
import {
  assignEntitiesToRooms,
  computeRooms,
  findRoomAtPoint,
  generateRoomColor,
  generateRoomName
} from '@/utils/roomUtils';
import {
  RoomBuilderState,
  buildRoomDefinitionFromState,
  createEmptyRoomBuilderState,
  findClosestWall,
  handleWallSelection,
  initializeBuilderFromRoom,
  roomBuilderHasValidCycle,
  ROOM_WALL_TOLERANCE
} from '@/utils/roomBuilder';
import KonvaCanvas from '@/components/KonvaCanvas';
import SelectedItemsPreview from '@/components/SelectedItemsPreview';
import { MinimalisticCedarCaptionChat } from '@/components/MinimalisticCedarCaptionChat';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/app/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import type { Database, Json } from '@/lib/supabase/types';

const cloneSnapshot = (snapshot: PlanSnapshot): PlanSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as PlanSnapshot;

const normalizeSnapshot = (snapshot: unknown): PlanSnapshot => {
  if (!snapshot || typeof snapshot !== 'object') {
    return createInitialPlanSnapshot();
  }

  const candidate = snapshot as Partial<PlanSnapshot>;
  const placedEntities = Array.isArray(candidate.placedEntities) ? candidate.placedEntities : [];
  const roomDefinitions = Array.isArray(candidate.roomDefinitions) && candidate.roomDefinitions.length > 0
    ? candidate.roomDefinitions
    : createInitialRoomDefinitions();

  return {
    placedEntities,
    roomDefinitions,
  } satisfies PlanSnapshot;
};

const AUTOSAVE_DELAY_MS = 600;

interface EditorProps {
  planId: string;
  items: Item[];
}

type PlanRevisionRow = Database['public']['Tables']['plan_revisions']['Row'];

export default function Editor({ planId, items }: EditorProps) {
  const { innerWidth, innerHeight } = useWindow();
  const { scale, position, handleWheel } = useZoom();
  const { toast } = useToast();
  const { user } = useAuth();

  const [roomDefinitions, setRoomDefinitions] = useState<RoomDefinition[]>(() => createInitialRoomDefinitions());

  // Core state
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [screenCursorPos, setScreenCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentStagePosition, setCurrentStagePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snappedPosition, setSnappedPosition] = useState<{ x: number; y: number } | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const [placedEntities, setPlacedEntities] = useState<PlacedEntity[]>([]);
  const [canPlaceAtPosition, setCanPlaceAtPosition] = useState<boolean>(true);
  const [isClient, setIsClient] = useState(false);
  const [roomToolMode, setRoomToolMode] = useState<'view' | 'creating' | 'editing'>('view');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomBuilderState, setRoomBuilderState] = useState<RoomBuilderState>(createEmptyRoomBuilderState());
  const [roomToolError, setRoomToolError] = useState<string | null>(null);

  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isSnapshotReady, setIsSnapshotReady] = useState(false);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [lastRevisionId, setLastRevisionId] = useState<string | null>(null);
  const [hasPendingSave, setHasPendingSave] = useState(false);

  // Manager states
  const [editingState, setEditingState] = useState<EditingState>({
    selectedItems: [],
    originalState: [],
    itemValidityMap: new Map()
  });
  
  const [mouseState, setMouseState] = useState<MouseState>({
    isDraggingSelection: false,
    dragStartPos: null,
    hasDraggedItems: false
  });

  const [wallState, setWallState] = useState<WallState>({
    startPoint: null
  });

  const lastSerializedSnapshotRef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRevisionIdRef = useRef<string | null>(null);
  const latestRequestedSerializedRef = useRef<string | null>(null);
  const pendingRevisionIdsRef = useRef<Set<string>>(new Set());
  const stageRef = useRef<KonvaStage | null>(null);
  const previewUploadInFlightRef = useRef(false);
  const lastUploadedSerializedRef = useRef<string | null>(null);

  const initialEntities = useMemo(
    () => assignEntitiesToRooms([], roomDefinitions),
    [roomDefinitions]
  );

  const historyManager = History<PlacedEntity[]>({
    initialState: initialEntities,
    onChange: setPlacedEntities,
    options: { maxHistorySize: 50 }
  });
  const { addToHistory, resetHistory } = historyManager;

  const applySnapshot = useCallback(
    (snapshot: PlanSnapshot | unknown, options: { fromRemote?: boolean; revisionId?: string } = {}) => {
      const normalized = normalizeSnapshot(snapshot);
      const safeSnapshot = cloneSnapshot(normalized);
      const normalizedRooms = safeSnapshot.roomDefinitions.length > 0
        ? safeSnapshot.roomDefinitions
        : createInitialRoomDefinitions();
      const normalizedEntities = assignEntitiesToRooms(safeSnapshot.placedEntities, normalizedRooms);

      isApplyingRemoteRef.current = Boolean(options.fromRemote);

      setRoomDefinitions(normalizedRooms);
      setPlacedEntities(normalizedEntities);
      resetHistory(normalizedEntities);

      setActiveRoomId((prev) => {
        if (!prev) return prev;
        return normalizedRooms.some((room) => room.id === prev) ? prev : null;
      });

      if (options.revisionId) {
        setLastRevisionId(options.revisionId);
        lastRevisionIdRef.current = options.revisionId;
      }

      const serialized = JSON.stringify({
        placedEntities: normalizedEntities,
        roomDefinitions: normalizedRooms,
      });
      lastSerializedSnapshotRef.current = serialized;
      setHasPendingSave(false);
    },
    [resetHistory, setHasPendingSave]
  );

  useEffect(() => {
    let isActive = true;

    const loadLatestRevision = async () => {
      setSnapshotLoading(true);
      setSnapshotError(null);

      try {
        const { data, error } = await supabase
          .from('plan_revisions')
          .select('id, snapshot')
          .eq('plan_id', planId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isActive) return;

        if (error) throw error;

        if (data) {
          applySnapshot(data.snapshot, { fromRemote: true, revisionId: data.id });
        } else {
          applySnapshot(createInitialPlanSnapshot(), { fromRemote: true });
        }

        setSnapshotLoading(false);
        setIsSnapshotReady(true);
      } catch (loadError) {
        if (!isActive) return;
        const message = loadError instanceof Error ? loadError.message : 'Unable to load this plan.';
        setSnapshotError(message);
        setSnapshotLoading(false);
      }
    };

    loadLatestRevision();

    const channel = supabase
      .channel(`plan-revisions-${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_revisions',
          filter: `plan_id=eq.${planId}`,
        },
        (payload) => {
          const revision = payload.new as PlanRevisionRow;
          if (!revision || !isActive) {
            return;
          }

          if (pendingRevisionIdsRef.current.has(revision.id)) {
            pendingRevisionIdsRef.current.delete(revision.id);
            return;
          }

          if (revision.id === lastRevisionIdRef.current) {
            return;
          }

          applySnapshot(revision.snapshot, { fromRemote: true, revisionId: revision.id });
          setSnapshotError(null);
          setSnapshotLoading(false);
          setIsSnapshotReady(true);
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [applySnapshot, planId]);

  // Calculate bounds of all placed entities for cropping
  const calculateEntityBounds = useCallback(
    (entities: PlacedEntity[], stageWidth: number, stageHeight: number) => {
      if (entities.length === 0) {
        return null;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      entities.forEach((entity) => {
        if (entity.type === 'wall') {
          const wall = entity as WallItem;
          minX = Math.min(minX, wall.startX, wall.endX);
          minY = Math.min(minY, wall.startY, wall.endY);
          maxX = Math.max(maxX, wall.startX, wall.endX);
          maxY = Math.max(maxY, wall.startY, wall.endY);
        } else {
          const item = entity as PlacedItem;
          const scaledWidth = item.width * item.scale;
          const scaledHeight = item.height * item.scale;

          // Account for rotation by using bounding box
          const halfWidth = scaledWidth / 2;
          const halfHeight = scaledHeight / 2;

          minX = Math.min(minX, item.x - halfWidth);
          minY = Math.min(minY, item.y - halfHeight);
          maxX = Math.max(maxX, item.x + halfWidth);
          maxY = Math.max(maxY, item.y + halfHeight);
        }
      });

      const rawWidth = Math.max(1, maxX - minX);
      const rawHeight = Math.max(1, maxY - minY);

      // Expand the frame to include more of the surrounding plan
      const marginX = Math.max(rawWidth * 0.5, 250);
      const marginY = Math.max(rawHeight * 0.5, 250);

      const paddedMinX = Math.max(0, minX - marginX);
      const paddedMinY = Math.max(0, minY - marginY);

      const maxWidth = Math.max(1, stageWidth - paddedMinX);
      const maxHeight = Math.max(1, stageHeight - paddedMinY);

      const paddedWidth = Math.min(maxWidth, rawWidth + marginX * 2);
      const paddedHeight = Math.min(maxHeight, rawHeight + marginY * 2);

      return {
        x: paddedMinX,
        y: paddedMinY,
        width: paddedWidth,
        height: paddedHeight,
      };
    },
    []
  );

  const uploadPlanPreview = useCallback(
    async (serializedSnapshot: string): Promise<string | null> => {
      if (typeof window === 'undefined') {
        return null;
      }

      if (!user) {
        return null;
      }

      if (previewUploadInFlightRef.current) {
        return null;
      }

      if (lastUploadedSerializedRef.current === serializedSnapshot) {
        return null;
      }

      const stage = stageRef.current;
      if (!stage) {
        return null;
      }

      previewUploadInFlightRef.current = true;

      try {
        // Calculate bounds of placed entities for cropping
        const stageWidth = stage.width();
        const stageHeight = stage.height();
        const bounds = calculateEntityBounds(placedEntities, stageWidth, stageHeight);
        
        let dataUrl: string;
        if (bounds) {
          // Crop to entity bounds
          dataUrl = stage.toDataURL({
            pixelRatio: 2,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          });
        } else {
          // No entities, use full stage
          dataUrl = stage.toDataURL({ pixelRatio: 2 });
        }

        if (!dataUrl) {
          return null;
        }

        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const filePath = `previews/${planId}.png`;
        const storage = supabase.storage.from('plans');

        const { error: uploadError } = await storage.upload(filePath, blob, {
          cacheControl: '3600',
          contentType: 'image/png',
          upsert: true,
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = storage.getPublicUrl(filePath);

        lastUploadedSerializedRef.current = serializedSnapshot;

        return publicData?.publicUrl ?? null;
      } catch (previewError) {
        console.error('Failed to upload plan preview', previewError);
        return null;
      } finally {
        previewUploadInFlightRef.current = false;
      }
    },
    [planId, user, calculateEntityBounds, placedEntities]
  );

  const persistSnapshot = useCallback(
    async (snapshot: PlanSnapshot, serialized: string) => {
      if (!user) return;

      const payload = cloneSnapshot(snapshot);

      try {
        setIsSavingRevision(true);

        const { data, error } = await supabase
          .from('plan_revisions')
          .insert({
            plan_id: planId,
            user_id: user.id,
            snapshot: payload as unknown as Json,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (!data) throw new Error('Revision was not recorded.');

        pendingRevisionIdsRef.current.add(data.id);

        if (latestRequestedSerializedRef.current === serialized) {
          setLastRevisionId(data.id);
          lastRevisionIdRef.current = data.id;
          lastSerializedSnapshotRef.current = serialized;
          setSnapshotError(null);
          setHasPendingSave(false);
        }

        // Update plan timestamp
        const updates: Database['public']['Tables']['plans']['Update'] = {
          updated_at: new Date().toISOString(),
        };

        const { error: planUpdateError } = await supabase
          .from('plans')
          .update(updates)
          .eq('id', planId);

        if (planUpdateError) {
          console.warn('Failed to update plan details', planUpdateError);
        }
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : 'Unable to save changes.';
        setSnapshotError(message);
        toast({
          variant: 'destructive',
          title: 'Could not save plan',
          description: message,
        });
      } finally {
        setIsSavingRevision(false);
      }
    },
    [planId, setHasPendingSave, toast, user]
  );

  const savePlanPreview = useCallback(
    async (serialized: string) => {
      if (!user) return;

      try {
        const previewUrl = await uploadPlanPreview(serialized);

        if (previewUrl) {
          const updates: Database['public']['Tables']['plans']['Update'] = {
            image_url: previewUrl,
          };

          const { error: planUpdateError } = await supabase
            .from('plans')
            .update(updates)
            .eq('id', planId);

          if (planUpdateError) {
            console.error('Failed to update plan preview', planUpdateError);
          }
        }
      } catch (previewError) {
        console.error('Failed to save plan preview', previewError);
      }
    },
    [planId, uploadPlanPreview, user]
  );

  useEffect(() => {
    return () => {
      const serialized = JSON.stringify({
        placedEntities,
        roomDefinitions,
      });
      
      if (placedEntities.length > 0) {
        savePlanPreview(serialized);
      }
    };
  }, [placedEntities, roomDefinitions, savePlanPreview]);

  useEffect(() => {
    if (!isSnapshotReady || !user) {
      return;
    }

    const snapshot: PlanSnapshot = {
      placedEntities,
      roomDefinitions,
    };
    const serialized = JSON.stringify(snapshot);

    if (isApplyingRemoteRef.current) {
      isApplyingRemoteRef.current = false;
      lastSerializedSnapshotRef.current = serialized;
      return;
    }

    if (lastSerializedSnapshotRef.current === serialized) {
      return;
    }

    latestRequestedSerializedRef.current = serialized;
    setHasPendingSave(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      persistSnapshot(snapshot, serialized);
      saveTimeoutRef.current = null;
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [isSnapshotReady, persistSnapshot, placedEntities, roomDefinitions, setHasPendingSave, user]);

  // Initialize managers
  const editingManager = new EditingManager(editingState, setEditingState, placedEntities, () => editingState);
  const mouseManager = new MouseInteractionManager(mouseState, setMouseState);
  const wallManager = new WallManager(wallState, setWallState);

  // Update managers when entities change
  useEffect(() => {
    editingManager.updatePlacedEntities(placedEntities);
  }, [placedEntities]);

  const computedRooms = useMemo(
    () => isClient ? computeRooms(roomDefinitions, placedEntities) : [],
    [roomDefinitions, placedEntities, isClient]
  );

  const walls = useMemo(
    () => placedEntities.filter((entity): entity is WallItem => entity.type === 'wall'),
    [placedEntities]
  );

  const roomColorMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    roomDefinitions.forEach((room) => {
      map.set(room.id, room.color);
    });
    return map;
  }, [roomDefinitions]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const setCurrentItemWithDefaults = (item: Item | null) => {
    if (item) {
      setCurrentItem({
        ...item,
        inverted: false,
        rotation: 0,
        scale: 1
      });
    } else {
      setCurrentItem(null);
    }
  };

  const resetRoomWorkflow = useCallback(() => {
    setRoomToolMode('view');
    setActiveRoomId(null);
    setRoomBuilderState(createEmptyRoomBuilderState());
    setRoomToolError(null);
  }, []);

  const startRoomCreation = useCallback(() => {
    setRoomToolMode('creating');
    setActiveRoomId(null);
    setRoomBuilderState(createEmptyRoomBuilderState());
    setRoomToolError(null);
  }, []);

  const startRoomEditing = useCallback((roomId: string) => {
    const definition = roomDefinitions.find((room) => room.id === roomId);
    if (!definition) return;

    setRoomToolMode('editing');
    setActiveRoomId(roomId);
    setRoomBuilderState(initializeBuilderFromRoom(definition, walls));
    setRoomToolError(null);
  }, [roomDefinitions, walls]);

  const selectRoomById = useCallback((roomId: string | null) => {
    setActiveRoomId(roomId);
    setRoomToolMode('view');
    setRoomBuilderState(createEmptyRoomBuilderState());
    setRoomToolError(null);
  }, []);

  const applyRoomDefinitions = useCallback(
    (nextDefinitions: RoomDefinition[], options: { pushHistory?: boolean } = {}) => {
      setRoomDefinitions(nextDefinitions);
      const normalizedEntities = assignEntitiesToRooms(placedEntities, nextDefinitions);

      if (options.pushHistory === false) {
        setPlacedEntities(normalizedEntities);
      } else {
        addToHistory(normalizedEntities);
      }
    },
    [addToHistory, placedEntities, setPlacedEntities]
  );

  const handleRoomRename = useCallback((roomId: string, name: string) => {
    setRoomDefinitions((prev) => prev.map((room) => (
      room.id === roomId ? { ...room, name } : room
    )));
  }, []);

  const handleRoomFlooringChange = useCallback((roomId: string, flooring: FlooringType) => {
    setRoomDefinitions((prev) => prev.map((room) => (
      room.id === roomId ? { ...room, flooring } : room
    )));
  }, []);

  const validateWallAvailability = useCallback(
    (candidate: RoomDefinition, excludeRoomId?: string): { valid: boolean; conflictWallId?: string } => {
      const usage = new Map<string, number>();

      roomDefinitions.forEach((room) => {
        if (room.id === excludeRoomId) return;
        room.walls.forEach(({ wallId }) => {
          usage.set(wallId, (usage.get(wallId) ?? 0) + 1);
        });
      });

      for (const { wallId } of candidate.walls) {
        const count = usage.get(wallId) ?? 0;
        if (count >= 2) {
          return { valid: false, conflictWallId: wallId };
        }
      }

      return { valid: true };
    },
    [roomDefinitions]
  );

  const handleRoomWallClick = useCallback((stageX: number, stageY: number) => {
    if (roomToolMode === 'view') return;

    const candidate = findClosestWall(walls, stageX, stageY, ROOM_WALL_TOLERANCE);
    if (!candidate) {
      setRoomToolError('Select the wall segments to trace your room.');
      return;
    }

    setRoomToolError(null);
    setRoomBuilderState((prev) => handleWallSelection(prev, candidate, walls));
  }, [roomToolMode, walls]);

  const builderIsValid = useMemo(() => roomBuilderHasValidCycle(roomBuilderState), [roomBuilderState]);
  const roomShortcutsEnabled = selectedTool === 'rooms' && (roomToolMode === 'creating' || roomToolMode === 'editing');

  const confirmRoomChange = useCallback(() => {
    if (!builderIsValid) {
      setRoomToolError('Rooms need at least three connected walls that form a loop.');
      return;
    }

    if (roomToolMode === 'creating') {
      const newRoomId = `room-${uuidv4()}`;
      const name = generateRoomName(roomDefinitions.filter((room) => room.id !== NOT_IN_ROOM_ID));
      const color = generateRoomColor(roomDefinitions);
      const definition = buildRoomDefinitionFromState(roomBuilderState, {
        id: newRoomId,
        name,
        color,
        flooring: DEFAULT_ROOM_FLOORING
      });

      if (!definition) return;

      const validation = validateWallAvailability(definition);
      if (!validation.valid) {
        setRoomToolError(
          validation.conflictWallId
            ? `Wall ${validation.conflictWallId} already belongs to two rooms.`
            : 'One of the selected walls is already shared by two rooms.'
        );
        return;
      }

      const nextDefinitions = [...roomDefinitions, definition];
      applyRoomDefinitions(nextDefinitions);
      setRoomToolMode('view');
      setActiveRoomId(newRoomId);
      setRoomBuilderState(createEmptyRoomBuilderState());
      setRoomToolError(null);
      return;
    }

    if (roomToolMode === 'editing' && activeRoomId) {
      const existing = roomDefinitions.find((room) => room.id === activeRoomId);
      if (!existing) return;

      const updatedDefinition = buildRoomDefinitionFromState(roomBuilderState, {
        id: activeRoomId,
        name: existing.name,
        color: existing.color,
        flooring: existing.flooring
      });

      if (!updatedDefinition) return;

      const validation = validateWallAvailability(updatedDefinition, activeRoomId);
      if (!validation.valid) {
        setRoomToolError(
          validation.conflictWallId
            ? `Wall ${validation.conflictWallId} already belongs to two rooms.`
            : 'One of the selected walls is already shared by two rooms.'
        );
        return;
      }

      const nextDefinitions = roomDefinitions.map((room) =>
        room.id === activeRoomId
          ? { ...room, walls: updatedDefinition.walls }
          : room
      );

      applyRoomDefinitions(nextDefinitions);
      setRoomToolMode('view');
      setRoomToolError(null);
      setRoomBuilderState(createEmptyRoomBuilderState());
    }
  }, [
    builderIsValid,
    roomToolMode,
    roomDefinitions,
    roomBuilderState,
    validateWallAvailability,
    applyRoomDefinitions,
    activeRoomId
  ]);

  // Helper functions using managers
  const handleSelectedItemsChange = (updatedItems: PlacedEntity[]) => {
    const updatedEntities = placedEntities.map(entity => {
      const updatedEntity = updatedItems.find(item => item.id === entity.id);
      return updatedEntity || entity;
    });
    const normalizedEntities = assignEntitiesToRooms(updatedEntities, roomDefinitions);
    const normalizedSelectedItems = normalizedEntities.filter(entity =>
      updatedItems.some(item => item.id === entity.id)
    );

    if (!editingManager.isEditing) {
      historyManager.addToHistory(normalizedEntities);
    } else {
      setPlacedEntities(normalizedEntities);
      editingManager.updateSelectedItems(normalizedSelectedItems, normalizedEntities);
    }
  };

  const handleDeleteSelectedItems = () => {
    if (!editingManager.isEditing || editingState.selectedItems.length === 0) {
      return;
    }

    const selectedIds = new Set(editingState.selectedItems.map((item) => item.id));
    const remainingEntities = placedEntities.filter((entity) => !selectedIds.has(entity.id));

    // Avoid unnecessary state updates when nothing was removed
    if (remainingEntities.length === placedEntities.length) {
      return;
    }

    const normalizedEntities = assignEntitiesToRooms(remainingEntities, roomDefinitions);

    addToHistory(normalizedEntities);
    setSnapGuides({});
    setSnappedPosition(null);
    editingManager.reset();
  };

  const handleSave = () => {
    const savedState = editingManager.save();
    if (savedState) {
      const normalizedState = assignEntitiesToRooms(savedState, roomDefinitions);
      historyManager.addToHistory(normalizedState);
    }
  };

  const handleCancel = () => {
    const restoredState = editingManager.cancel();
    const normalizedState = assignEntitiesToRooms(restoredState, roomDefinitions);
    setPlacedEntities(normalizedState);
  };

  const handleStageMouseMove = (e: any) => {
    if (!isClient) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    setScreenCursorPos({ x: pointer.x, y: pointer.y });
    setCurrentStagePosition({ x: stage.x(), y: stage.y() });
    const stageX = (pointer.x - stage.x()) / stage.scaleX();
    const stageY = (pointer.y - stage.y()) / stage.scaleY();

    // Handle current item placement
    if (currentItem) {
      const snapDistance = currentItem.file === 'wall' ? 20 : 8;
      const snapManager = new SnapManager({ snapDistance, scale });
      const snapResult = snapManager.getSnappedPosition(stageX, stageY, currentItem, placedEntities);
      
      setSnappedPosition({ x: snapResult.x, y: snapResult.y });

      const previewItem: PlacedItem = {
        id: 'preview-item',
        file: currentItem.file,
        type: currentItem.type,
        subtype: currentItem.subtype,
        name: currentItem.name,
        width: currentItem.width,
        height: currentItem.height,
        inverted: currentItem.inverted,
        rotation: currentItem.rotation,
        scale: currentItem.scale,
        x: snapResult.x,
        y: snapResult.y,
        roomId: NOT_IN_ROOM_ID
      };

      const attachesToWall = canPlaceOnWall(currentItem, previewItem.x, previewItem.y, placedEntities);
      const overlapsEntities = CollisionManager.checkItemCollisions(previewItem, placedEntities);
      setCanPlaceAtPosition(attachesToWall && !overlapsEntities);
      
      const guides: { x?: number; y?: number } = {};
      if (snapResult.snappedX && snapResult.snapLineX !== undefined) guides.x = snapResult.snapLineX;
      if (snapResult.snappedY && snapResult.snapLineY !== undefined) guides.y = snapResult.snapLineY;
      setSnapGuides(guides);
    } else {
      setSnappedPosition(null);
      setSnapGuides({});
    }


    // Handle drag selection
    if (mouseManager.isDraggingSelection && editingState.selectedItems.length > 0) {
      const dragResult = mouseManager.updateDragSelection(
        stageX, 
        stageY, 
        editingState.selectedItems,
        placedEntities,
        scale
      );
      
      if (dragResult) {
        handleSelectedItemsChange(dragResult.movedItems);
      }
    }
    
    // Show snap guides when in edit mode (always, regardless of dragging state)
    if (editingState.selectedItems.length > 0) {
      const snapDistance = 8;
      const snapManager = new SnapManager({ snapDistance, scale });
      
      // Calculate selection bounds for snapping
      const selectionCenter = SelectionManager.getSelectionCenter(editingState.selectedItems);
      
      // Create a virtual item representing the selection bounds
      const virtualItem = {
        file: 'selection',
        name: 'Selection',
        type: 'furniture' as const,
        width: 50, // This will be overridden by the actual bounds calculation
        height: 50,
        scale: 1,
        rotation: 0,
        inverted: false,
        x: selectionCenter.x,
        y: selectionCenter.y
      };
      
      // Calculate actual selection bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      
      editingState.selectedItems.forEach(entity => {
        if (entity.type === 'wall') {
          const wall = entity as WallItem;
          minX = Math.min(minX, wall.startX, wall.endX);
          maxX = Math.max(maxX, wall.startX, wall.endX);
          minY = Math.min(minY, wall.startY, wall.endY);
          maxY = Math.max(maxY, wall.startY, wall.endY);
        } else {
          const item = entity as PlacedItem;
          const halfWidth = (item.width * item.scale) / 2;
          const halfHeight = (item.height * item.scale) / 2;
          minX = Math.min(minX, item.x - halfWidth);
          maxX = Math.max(maxX, item.x + halfWidth);
          minY = Math.min(minY, item.y - halfHeight);
          maxY = Math.max(maxY, item.y + halfHeight);
        }
      });
      
      // Update virtual item with actual bounds
      virtualItem.width = maxX - minX;
      virtualItem.height = maxY - minY;
      
      const snapResult = snapManager.getSnappedPosition(
        selectionCenter.x, 
        selectionCenter.y, 
        virtualItem, 
        placedEntities.filter(entity => !editingState.selectedItems.some(selected => selected.id === entity.id))
      );
      
      const guides: { x?: number; y?: number } = {};
      if (snapResult.snappedX && snapResult.snapLineX !== undefined) guides.x = snapResult.snapLineX;
      if (snapResult.snappedY && snapResult.snapLineY !== undefined) guides.y = snapResult.snapLineY;
      setSnapGuides(guides);
    }
  };

  const handleStageClick = (e: any) => {
    if (e.evt.button !== 0) return;
    if (!isClient) return;
    
    // If we just finished dragging items, ignore this click to prevent deselection
    if (mouseManager.hasDraggedItems) {
      mouseManager.clearDragFlag();
      return;
    }
    
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const stageX = (pointer.x - stage.x()) / stage.scaleX();
    const stageY = (pointer.y - stage.y()) / stage.scaleY();

    if (selectedTool === 'rooms') {
      if (roomToolMode === 'view') {
        const hitRoom = findRoomAtPoint(computedRooms, stageX, stageY);
        if (!hitRoom) {
          selectRoomById(null);
          return;
        }

        if (hitRoom.id === NOT_IN_ROOM_ID) {
          selectRoomById(null);
        } else {
          startRoomEditing(hitRoom.id);
        }
      } else {
        handleRoomWallClick(stageX, stageY);
      }
      return;
    }

    if (selectedTool === 'select' && !currentItem) {
      const clickedEntity = mouseManager.findClickedEntity(stageX, stageY, placedEntities);

      if (clickedEntity) {
        const isCtrlOrCmd = e.evt.ctrlKey || e.evt.metaKey;
        let newSelection: PlacedEntity[];
        
        if (isCtrlOrCmd) {
          newSelection = SelectionManager.toggleEntitySelection(editingState.selectedItems, clickedEntity);
        } else {
          newSelection = SelectionManager.selectSingleEntity(clickedEntity);
        }
        
        editingManager.selectItems(newSelection);
        return;
      } else {
        // Click on empty space
        if (editingManager.isEditing) {
          handleCancel();
        }
      }
    }
    
    if (!currentItem) return;

    let finalX, finalY;
    if (snappedPosition) {
      finalX = snappedPosition.x;
      finalY = snappedPosition.y;
    } else {
      finalX = stageX;
      finalY = stageY;
    }

    if (currentItem.file === 'wall') {
      if (!wallManager.hasStartPoint) {
        wallManager.setStartPoint(finalX, finalY);
      } else {
        const newWall = wallManager.createWall(finalX, finalY);
        if (newWall) {
          const newEntities = [...placedEntities, newWall];
          const normalizedEntities = assignEntitiesToRooms(newEntities, roomDefinitions);
          historyManager.addToHistory(normalizedEntities);
        }
      }
    } else {

      if (!canPlaceAtPosition) {
        return;
      }
      
      const newItem: PlacedItem = {
        id: uuidv4(),
        file: currentItem.file,
        type: currentItem.type,
        subtype: currentItem.subtype,
        name: currentItem.name,
        width: currentItem.width,
        height: currentItem.height,
        inverted: currentItem.inverted,
        rotation: currentItem.rotation,
        scale: currentItem.scale,
        x: finalX,
        y: finalY,
        roomId: NOT_IN_ROOM_ID
      };

      const hasCollision = CollisionManager.checkItemCollisions(newItem, placedEntities);
      if (hasCollision) {
        return;
      }

      const newEntities = [...placedEntities, newItem];
      const normalizedEntities = assignEntitiesToRooms(newEntities, roomDefinitions);
      historyManager.addToHistory(normalizedEntities);
    }
  };

  const handleStageMouseDown = (e: any) => {
    if (e.evt.button !== 0) return;
    if (!isClient) return;
    if (currentItem || selectedTool !== 'select') return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const stageX = (pointer.x - stage.x()) / stage.scaleX();
    const stageY = (pointer.y - stage.y()) / stage.scaleY();

    const clickedEntity = mouseManager.findClickedEntity(stageX, stageY, placedEntities);

    if (clickedEntity && editingManager.isEditing && editingState.selectedItems.some(item => item.id === clickedEntity.id)) {
      mouseManager.startDragSelection(stageX, stageY);
    }
  };

  const handleStageMouseUp = (e: any) => {
    if (!isClient) return;
    mouseManager.resetSelection();
  };

  const handleStageRightClick = (e: any) => {
    e.evt.preventDefault();
    if (!isClient) return;
    
    if (currentItem) {
      setCurrentItem(null);
      wallManager.reset();
    } else if (selectedTool !== 'select') {
      setSelectedTool('select');
    } else if (editingManager.isEditing) {
      editingManager.reset();
    }
  };

  useEffect(() => {
    // Reset current item and wall state when switching away from placement tools
    if (selectedTool !== 'furniture' && selectedTool !== 'wall') {
      setCurrentItem(null);
      wallManager.reset();
    }
    
    // Reset editing mode and all related state when switching away from select tool
    if (selectedTool !== 'select') {
      if (editingManager.isEditing) {
        const restoredState = editingManager.cancel();
        const normalizedState = assignEntitiesToRooms(restoredState, roomDefinitions);
        setPlacedEntities(normalizedState);
      }
      mouseManager.resetAll();
    }

    if (selectedTool !== 'rooms') {
      resetRoomWorkflow();
    }
  }, [selectedTool]);

  if (!isClient) {
    return null;
  }

  if (snapshotLoading && !isSnapshotReady) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p>Loading your plan…</p>
      </div>
    );
  }

  if (snapshotError && !isSnapshotReady) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center text-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Unable to load this plan</h2>
          <p className="text-muted-foreground">
            {snapshotError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
        {isSnapshotReady ? (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            {snapshotError ? (
              <span className="flex items-center gap-2 text-destructive" title={snapshotError}>
                <AlertTriangle className="h-3.5 w-3.5" />
                Save failed
              </span>
            ) : hasPendingSave || isSavingRevision ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>
        ) : null}
        {historyManager.component}
              <KeyboardManager
                  currentItem={currentItem}
                  onItemChange={setCurrentItem}
                  selectedItems={editingState.selectedItems}
                  onSelectedItemsChange={handleSelectedItemsChange}
                  isEditingMode={editingManager.isEditing}
                  onSaveEdit={handleSave}
                  onCancelEdit={handleCancel}
                  onDeleteSelectedItems={handleDeleteSelectedItems}
                  hasValidPlacement={editingManager.canSave}
                  screenCursorPos={screenCursorPos}
                  stageScale={scale}
                  roomShortcutsEnabled={roomShortcutsEnabled}
                  onRoomConfirm={confirmRoomChange}
                  onRoomCancel={resetRoomWorkflow}
                  roomBuilderIsValid={builderIsValid}
              />
        {currentItem && currentItem.file !== 'wall' && (
            <PreviewIcon
            type={currentItem.type}
            file={currentItem.file}
            width={currentItem.width}
            height={currentItem.height}
            x={snappedPosition ? snappedPosition.x * scale + position.x : screenCursorPos.x}
            y={snappedPosition ? snappedPosition.y * scale + position.y : screenCursorPos.y}
            scale={scale}
            inverted={currentItem.inverted}
            rotation={currentItem.rotation}
            itemScale={currentItem.scale}
            isInvalid={!canPlaceAtPosition}
            />
        )}
        
        {isClient && (
          <SelectedItemsPreview
            selectedItems={editingState.selectedItems}
            itemValidityMap={editingState.itemValidityMap}
            stageScale={scale}
            stagePosition={currentStagePosition}
          />
        )}
        <Toolbar
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
            items={items}
            currentItem={currentItem}
            onItemSelect={setCurrentItemWithDefaults}
            rooms={roomDefinitions}
            activeRoomId={activeRoomId}
            roomToolMode={roomToolMode}
            onStartRoomCreation={startRoomCreation}
            onCancelRoomAction={resetRoomWorkflow}
            onConfirmRoomAction={confirmRoomChange}
            onRenameRoom={handleRoomRename}
            onRoomFlooringChange={handleRoomFlooringChange}
            roomToolError={roomToolError}
            builderIsValid={builderIsValid}
        />
        <KonvaCanvas
          ref={stageRef}
          width={innerWidth}
          height={innerHeight}
          scale={scale}
          position={position}
          placedEntities={placedEntities}
          rooms={computedRooms}
          selectedItems={editingState.selectedItems}
          itemValidityMap={editingState.itemValidityMap}
          snapGuides={snapGuides}
          wallStartPoint={wallState.startPoint}
          snappedPosition={snappedPosition}
          currentItem={currentItem}
          isRoomToolActive={selectedTool === 'rooms'}
          roomToolMode={roomToolMode}
          activeRoomId={activeRoomId}
          roomBuilderState={roomBuilderState}
          roomColorMap={roomColorMap}
          onWheel={handleWheel}
          onMouseMove={handleStageMouseMove}
          onMouseDown={handleStageMouseDown}
          onMouseUp={handleStageMouseUp}
          onClick={handleStageClick}
          onContextMenu={handleStageRightClick}
        />
        
        {/* Minimalistic Cedar Caption Chat */}
        <MinimalisticCedarCaptionChat 
          stream={true}
          width={380}
          className="z-40"
        />
    </>
  );
}
