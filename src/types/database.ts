export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "superadmin" | "direction" | "enseignant" | "parent";

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string;
          name: string;
          short_name: string | null;
          code: string;
          logo_url: string | null;
          address: string | null;
          city: string | null;
          country: string;
          phone: string | null;
          email: string | null;
          currency: string;
          academic_settings: Json | null;
          status: "active" | "inactive" | "suspended";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          short_name?: string | null;
          code: string;
          logo_url?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          currency?: string;
          academic_settings?: Json | null;
          status?: "active" | "inactive" | "suspended";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["schools"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string; // Fk to auth.users.id
          school_id: string;
          role: UserRole;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          school_id: string;
          role: UserRole;
          first_name: string;
          last_name: string;
          phone?: string | null;
          email: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      academic_years: {
        Row: {
          id: string;
          school_id: string;
          name: string; // e.g. "2026-2027"
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["academic_years"]["Insert"]>;
      };
      periods: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          name: string; // e.g. "Trimestre 1"
          type: "trimestre" | "semestre";
          order_index: number;
          status: "open" | "review" | "locked";
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          name: string;
          type?: "trimestre" | "semestre";
          order_index: number;
          status?: "open" | "review" | "locked";
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["periods"]["Insert"]>;
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          name: string; // e.g. "6ème A"
          cycle: string; // e.g. "Collège"
          level: string; // e.g. "6ème"
          series: string | null; // e.g. "A4", "C", "D"
          capacity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          name: string;
          cycle: string;
          level: string;
          series?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          school_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_data: Json | null;
          new_data: Json | null;
          reason: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          old_data?: Json | null;
          new_data?: Json | null;
          reason?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}
