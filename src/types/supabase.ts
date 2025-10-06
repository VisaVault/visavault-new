export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; created_at: string };
      };
      visa_apps: {
        Row: {
          id: string;
          user_id: string;
          visa_type: string;
          score: number;
          status: string;
          progress: number;
          cost_estimate: number;
          policy_notes: string | null;
          created_at: string;
        };
      };
      documents: {
        Row: {
          id: string;
          app_id: string;
          name: string;
          file_url: string;
          uploaded_at: string;
        };
      };
    };
  };
}