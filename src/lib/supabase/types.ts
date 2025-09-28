export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      plan_members: {
        Row: {
          created_at: string | null;
          id: string;
          plan_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          plan_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          plan_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_members_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_revisions: {
        Row: {
          created_at: string | null;
          id: string;
          plan_id: string;
          snapshot: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          plan_id: string;
          snapshot: Json;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          plan_id?: string;
          snapshot?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_revisions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string | null;
          id: string;
          is_archived: boolean | null;
          owner_id: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_archived?: boolean | null;
          owner_id: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_archived?: boolean | null;
          owner_id?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      share_links: {
        Row: {
          can_edit: boolean | null;
          created_at: string | null;
          created_by: string;
          expires_at: string | null;
          id: string;
          plan_id: string;
          token: string;
        };
        Insert: {
          can_edit?: boolean | null;
          created_at?: string | null;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          plan_id: string;
          token: string;
        };
        Update: {
          can_edit?: boolean | null;
          created_at?: string | null;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          plan_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'share_links_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_role: {
        Args: { plan_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
