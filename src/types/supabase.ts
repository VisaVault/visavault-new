export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
        Insert: { id?: string; email: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      visa_apps: {
        Row: {
          id: string;
          user_id: string;
          visa_type: string;           // NOTE: we’ll normalize to slug keys used by USE_CASES
          score: number;
          status: string;
          progress: number;
          cost_estimate: number;
          policy_notes: string | null;
          created_at: string;
          meta: Json | null;           // <-- NEW: stores inputs + affidavitDraft, etc.
        };
        Insert: {
          id?: string;
          user_id: string;
          visa_type: string;
          score: number;
          status: string;
          progress: number;
          cost_estimate: number;
          policy_notes?: string | null;
          created_at?: string;
          meta?: Json | null;          // <-- NEW
        };
        Update: Partial<Database['public']['Tables']['visa_apps']['Insert']>;
        Relationships: [];
      };
      documents: {
        Row: { id: string; app_id: string; name: string; file_url: string; uploaded_at: string };
        Insert: { id?: string; app_id: string; name: string; file_url: string; uploaded_at?: string };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
        Relationships: [];
      };
      evidence_uploads: {
        Row: {
          id: string;
          user_id: string;
          visa_app_id: string;
          evidence_id: string;
          files: Json; // [{name, url}]
          notes: string | null;
          in_english: boolean | null;
          complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          visa_app_id: string;
          evidence_id: string;
          files?: Json;
          notes?: string | null;
          in_english?: boolean | null;
          complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['evidence_uploads']['Insert']>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          visa_app_id: string;
          title: string;
          evidence_id: string | null;
          status: 'todo' | 'waiting' | 'done';
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          visa_app_id: string;
          title: string;
          evidence_id?: string | null;
          status?: 'todo' | 'waiting' | 'done';
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
