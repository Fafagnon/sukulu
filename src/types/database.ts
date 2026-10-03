export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "superadmin" | "direction" | "enseignant" | "parent";
export type PeriodType = "trimestre" | "semestre";
export type PeriodStatus = "open" | "review" | "locked";
export type StudentStatus = "active" | "archived" | "graduated" | "transferred";
export type EnrollmentStatus = "enrolled" | "completed" | "dropped" | "transferred" | "repeating";
export type TeacherStatus = "active" | "inactive" | "on_leave";
export type Gender = "M" | "F";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type Database = {
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
          created_by: string | null;
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
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string | null;
          code?: string;
          logo_url?: string | null;
          address?: string | null;
          city?: string | null;
          country?: string;
          phone?: string | null;
          email?: string | null;
          currency?: string;
          academic_settings?: Json | null;
          status?: "active" | "inactive" | "suspended";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          school_id: string | null;
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
          school_id?: string | null;
          role?: UserRole;
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
        Update: {
          id?: string;
          school_id?: string | null;
          role?: UserRole;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          email?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      academic_years: {
        Row: {
          id: string;
          school_id: string;
          name: string;
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
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      periods: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          name: string;
          type: PeriodType;
          order_index: number;
          status: PeriodStatus;
          start_date: string;
          end_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          name: string;
          type?: PeriodType;
          order_index: number;
          status?: PeriodStatus;
          start_date: string;
          end_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          name?: string;
          type?: PeriodType;
          order_index?: number;
          status?: PeriodStatus;
          start_date?: string;
          end_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "periods_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "periods_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          }
        ];
      };
      classes: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          name: string;
          cycle: string;
          level: string;
          series: string | null;
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
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          name?: string;
          cycle?: string;
          level?: string;
          series?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          }
        ];
      };
      subjects: {
        Row: {
          id: string;
          school_id: string;
          name: string;
          code: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          name: string;
          code: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      class_subjects: {
        Row: {
          id: string;
          school_id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string | null;
          coefficient: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          class_id: string;
          subject_id: string;
          teacher_id?: string | null;
          coefficient?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          class_id?: string;
          subject_id?: string;
          teacher_id?: string | null;
          coefficient?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      timetable_slots: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          class_id: string;
          subject_id: string;
          teacher_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          class_id?: string;
          subject_id?: string;
          teacher_id?: string | null;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          room?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timetable_slots_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timetable_slots_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timetable_slots_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      students: {
        Row: {
          id: string;
          school_id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          gender: Gender;
          birth_date: string;
          birth_place: string | null;
          nationality: string | null;
          address: string | null;
          city: string | null;
          photo_url: string | null;
          blood_group: string | null;
          medical_notes: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          status: StudentStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          school_id: string;
          matricule: string;
          first_name: string;
          last_name: string;
          gender: Gender;
          birth_date: string;
          birth_place?: string | null;
          nationality?: string | null;
          address?: string | null;
          city?: string | null;
          photo_url?: string | null;
          blood_group?: string | null;
          medical_notes?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          status?: StudentStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          school_id?: string;
          matricule?: string;
          first_name?: string;
          last_name?: string;
          gender?: Gender;
          birth_date?: string;
          birth_place?: string | null;
          nationality?: string | null;
          address?: string | null;
          city?: string | null;
          photo_url?: string | null;
          blood_group?: string | null;
          medical_notes?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          status?: StudentStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      parent_profiles: {
        Row: {
          id: string;
          school_id: string;
          user_id: string | null;
          first_name: string;
          last_name: string;
          phone: string;
          phone_secondary: string | null;
          email: string | null;
          profession: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id?: string | null;
          first_name: string;
          last_name: string;
          phone: string;
          phone_secondary?: string | null;
          email?: string | null;
          profession?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string | null;
          first_name?: string;
          last_name?: string;
          phone?: string;
          phone_secondary?: string | null;
          email?: string | null;
          profession?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parent_profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_parents: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          parent_id: string;
          relationship: string;
          is_primary: boolean;
          can_pickup: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          parent_id: string;
          relationship: string;
          is_primary?: boolean;
          can_pickup?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          parent_id?: string;
          relationship?: string;
          is_primary?: boolean;
          can_pickup?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_parents_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_parents_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "parent_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      teacher_profiles: {
        Row: {
          id: string;
          school_id: string;
          user_id: string;
          matricule: string | null;
          specialty: string | null;
          qualification: string | null;
          phone: string | null;
          address: string | null;
          hire_date: string | null;
          status: TeacherStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          user_id: string;
          matricule?: string | null;
          specialty?: string | null;
          qualification?: string | null;
          phone?: string | null;
          address?: string | null;
          hire_date?: string | null;
          status?: TeacherStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          user_id?: string;
          matricule?: string | null;
          specialty?: string | null;
          qualification?: string | null;
          phone?: string | null;
          address?: string | null;
          hire_date?: string | null;
          status?: TeacherStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      enrollments: {
        Row: {
          id: string;
          school_id: string;
          student_id: string;
          academic_year_id: string;
          class_id: string;
          enrollment_date: string;
          status: EnrollmentStatus;
          is_repeater: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          student_id: string;
          academic_year_id: string;
          class_id: string;
          enrollment_date?: string;
          status?: EnrollmentStatus;
          is_repeater?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          student_id?: string;
          academic_year_id?: string;
          class_id?: string;
          enrollment_date?: string;
          status?: EnrollmentStatus;
          is_repeater?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          }
        ];
      };
      assessments: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          period_id: string;
          class_id: string;
          subject_id: string;
          teacher_id: string | null;
          title: string;
          type: "cc" | "composition";
          assessment_date: string;
          max_score: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          period_id: string;
          class_id: string;
          subject_id: string;
          teacher_id?: string | null;
          title: string;
          type?: "cc" | "composition";
          assessment_date?: string;
          max_score?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          period_id?: string;
          class_id?: string;
          subject_id?: string;
          teacher_id?: string | null;
          title?: string;
          type?: "cc" | "composition";
          assessment_date?: string;
          max_score?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      grades: {
        Row: {
          id: string;
          school_id: string;
          assessment_id: string;
          student_id: string;
          score: number;
          comment: string | null;
          entered_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          assessment_id: string;
          student_id: string;
          score: number;
          comment?: string | null;
          entered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          assessment_id?: string;
          student_id?: string;
          score?: number;
          comment?: string | null;
          entered_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grades_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance_records: {
        Row: {
          id: string;
          school_id: string;
          academic_year_id: string;
          class_id: string;
          student_id: string;
          timetable_slot_id: string | null;
          date: string;
          status: AttendanceStatus;
          arrival_time: string | null;
          reason: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          school_id: string;
          academic_year_id: string;
          class_id: string;
          student_id: string;
          timetable_slot_id?: string | null;
          date?: string;
          status: AttendanceStatus;
          arrival_time?: string | null;
          reason?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          school_id?: string;
          academic_year_id?: string;
          class_id?: string;
          student_id?: string;
          timetable_slot_id?: string | null;
          date?: string;
          status?: AttendanceStatus;
          arrival_time?: string | null;
          reason?: string | null;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_timetable_slot_id_fkey";
            columns: ["timetable_slot_id"];
            isOneToOne: false;
            referencedRelation: "timetable_slots";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_school_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
    };
    Enums: {
      user_role: UserRole;
      period_type: PeriodType;
      period_status: PeriodStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
