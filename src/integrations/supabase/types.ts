export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      homework_assignments: {
        Row: {
          assigned_at: string
          homework_id: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          homework_id: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          homework_id?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          assignment_id: string
          details: Json | null
          grade: number | null
          id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          details?: Json | null
          grade?: number | null
          id?: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          details?: Json | null
          grade?: number | null
          id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      homeworks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          material_id: string | null
          quiz_id: string | null
          title: string
          type: Database["public"]["Enums"]["homework_item_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          material_id?: string | null
          quiz_id?: string | null
          title: string
          type: Database["public"]["Enums"]["homework_item_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          material_id?: string | null
          quiz_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["homework_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "homeworks_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeworks_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          issue_date: string
          method: string
          number: string
          period: string | null
          reference: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date: string
          method: string
          number: string
          period?: string | null
          reference?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          method?: string
          number?: string
          period?: string | null
          reference?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_by: string
          description: string | null
          downloads: number
          file_ext: string | null
          file_path: string
          file_size_bytes: number
          id: string
          mime_type: string
          school_year: string | null
          subject: Database["public"]["Enums"]["subject_enum"]
          tags: string[] | null
          title: string
          upload_date: string
          visibility: Database["public"]["Enums"]["visibility_enum"]
        }
        Insert: {
          created_by: string
          description?: string | null
          downloads?: number
          file_ext?: string | null
          file_path: string
          file_size_bytes?: number
          id?: string
          mime_type: string
          school_year?: string | null
          subject?: Database["public"]["Enums"]["subject_enum"]
          tags?: string[] | null
          title: string
          upload_date?: string
          visibility?: Database["public"]["Enums"]["visibility_enum"]
        }
        Update: {
          created_by?: string
          description?: string | null
          downloads?: number
          file_ext?: string | null
          file_path?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          school_year?: string | null
          subject?: Database["public"]["Enums"]["subject_enum"]
          tags?: string[] | null
          title?: string
          upload_date?: string
          visibility?: Database["public"]["Enums"]["visibility_enum"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      notifications_outbox: {
        Row: {
          body: string
          channel: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_name: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_name?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_outbox_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          hours: number
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          allergies: string | null
          allow_pospago: boolean
          auth_user_id: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          course: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          gender: string | null
          guardian_contact: string | null
          guardian_name: string | null
          horas: number
          id: string
          institution: string | null
          level: number
          marital_status: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          privacy_newsletter: boolean
          privacy_share_email: boolean
          privacy_share_phone: boolean
          privacy_statistics: boolean
          religion: string | null
          saldo: number
          special_needs: string | null
          tax_number: string | null
          updated_at: string
          username: string
          wants_receipt: boolean | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          allow_pospago?: boolean
          auth_user_id: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          horas?: number
          id?: string
          institution?: string | null
          level?: number
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          privacy_newsletter?: boolean
          privacy_share_email?: boolean
          privacy_share_phone?: boolean
          privacy_statistics?: boolean
          religion?: string | null
          saldo?: number
          special_needs?: string | null
          tax_number?: string | null
          updated_at?: string
          username: string
          wants_receipt?: boolean | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          allow_pospago?: boolean
          auth_user_id?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          horas?: number
          id?: string
          institution?: string | null
          level?: number
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          privacy_newsletter?: boolean
          privacy_share_email?: boolean
          privacy_share_phone?: boolean
          privacy_statistics?: boolean
          religion?: string | null
          saldo?: number
          special_needs?: string | null
          tax_number?: string | null
          updated_at?: string
          username?: string
          wants_receipt?: boolean | null
        }
        Relationships: []
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          label: string
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label: string
          question_id: string
          text: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: string
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          order_index: number
          quiz_id: string
          statement: string
        }
        Insert: {
          id?: string
          order_index: number
          quiz_id: string
          statement: string
        }
        Update: {
          id?: string
          order_index?: number
          quiz_id?: string
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          school_year: string | null
          subject: Database["public"]["Enums"]["subject_enum"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          school_year?: string | null
          subject?: Database["public"]["Enums"]["subject_enum"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          school_year?: string | null
          subject?: Database["public"]["Enums"]["subject_enum"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      school_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          allergies: string | null
          allow_pospago: boolean
          city: string | null
          course: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          gender: string | null
          guardian_contact: string | null
          guardian_name: string | null
          horas: number
          id: string
          institution: string | null
          level_id: string | null
          marital_status: string | null
          nationality: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          privacy_newsletter: boolean
          privacy_share_email: boolean
          privacy_share_phone: boolean
          privacy_statistics: boolean
          religion: string | null
          saldo: number
          special_needs: string | null
          tax_number: string | null
          updated_at: string
          username: string
          wants_receipt: boolean | null
          year: number | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          allow_pospago?: boolean
          city?: string | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          horas?: number
          id?: string
          institution?: string | null
          level_id?: string | null
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          privacy_newsletter?: boolean
          privacy_share_email?: boolean
          privacy_share_phone?: boolean
          privacy_statistics?: boolean
          religion?: string | null
          saldo?: number
          special_needs?: string | null
          tax_number?: string | null
          updated_at?: string
          username: string
          wants_receipt?: boolean | null
          year?: number | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          allow_pospago?: boolean
          city?: string | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          guardian_contact?: string | null
          guardian_name?: string | null
          horas?: number
          id?: string
          institution?: string | null
          level_id?: string | null
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          privacy_newsletter?: boolean
          privacy_share_email?: boolean
          privacy_share_phone?: boolean
          privacy_statistics?: boolean
          religion?: string | null
          saldo?: number
          special_needs?: string | null
          tax_number?: string | null
          updated_at?: string
          username?: string
          wants_receipt?: boolean | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "school_levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
    }
    Enums: {
      homework_item_type: "material" | "quiz"
      subject_enum: "Matemática" | "Física" | "Química" | "Outros"
      visibility_enum: "private" | "students" | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      homework_item_type: ["material", "quiz"],
      subject_enum: ["Matemática", "Física", "Química", "Outros"],
      visibility_enum: ["private", "students", "public"],
    },
  },
} as const
