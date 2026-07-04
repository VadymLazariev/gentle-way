export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          day_a: string | null
          day_b: string | null
          day_c: string | null
          hard_sets_range: string | null
          id: number
          primary_goal: string | null
          title: string
          weeks_label: string
        }
        Insert: {
          day_a?: string | null
          day_b?: string | null
          day_c?: string | null
          hard_sets_range?: string | null
          id: number
          primary_goal?: string | null
          title: string
          weeks_label: string
        }
        Update: {
          day_a?: string | null
          day_b?: string | null
          day_c?: string | null
          hard_sets_range?: string | null
          id?: number
          primary_goal?: string | null
          title?: string
          weeks_label?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          abdomen_cm: number | null
          bicep_left_cm: number | null
          bicep_right_cm: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          chest_cm: number | null
          client_id: string
          created_at: string
          custom_fields: Json
          height_cm: number | null
          hip_cm: number | null
          id: string
          measured_at: string
          neck_cm: number | null
          notes: string | null
          shoulder_cm: number | null
          thigh_left_cm: number | null
          thigh_right_cm: number | null
          updated_at: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          abdomen_cm?: number | null
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          client_id?: string
          created_at?: string
          custom_fields?: Json
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_at?: string
          neck_cm?: number | null
          notes?: string | null
          shoulder_cm?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          updated_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdomen_cm?: number | null
          bicep_left_cm?: number | null
          bicep_right_cm?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          chest_cm?: number | null
          client_id?: string
          created_at?: string
          custom_fields?: Json
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          measured_at?: string
          neck_cm?: number | null
          notes?: string | null
          shoulder_cm?: number | null
          thigh_left_cm?: number | null
          thigh_right_cm?: number | null
          updated_at?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cheat_meals: {
        Row: {
          adjustment: Json | null
          amount_grams: number | null
          applied_target_id: string | null
          client_id: string
          coach_notes: string | null
          created_at: string
          estimated_calories: number | null
          id: string
          name: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          adjustment?: Json | null
          amount_grams?: number | null
          applied_target_id?: string | null
          client_id?: string
          coach_notes?: string | null
          created_at?: string
          estimated_calories?: number | null
          id?: string
          name: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          adjustment?: Json | null
          amount_grams?: number | null
          applied_target_id?: string | null
          client_id?: string
          coach_notes?: string | null
          created_at?: string
          estimated_calories?: number | null
          id?: string
          name?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheat_meals_applied_target_id_fkey"
            columns: ["applied_target_id"]
            isOneToOne: false
            referencedRelation: "nutrition_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheat_meals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheat_meals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_injuries: {
        Row: {
          checkin_id: string
          id: string
          injury_id: string
          severity_at_time: string
        }
        Insert: {
          checkin_id: string
          id?: string
          injury_id: string
          severity_at_time: string
        }
        Update: {
          checkin_id?: string
          id?: string
          injury_id?: string
          severity_at_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_injuries_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "session_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_injuries_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injuries"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          client_id: string
          created_at: string
          id: string
          mesocycle_id: string | null
          schedule: Json
          start_date: string
          template_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          mesocycle_id?: string | null
          schedule?: Json
          start_date?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          mesocycle_id?: string | null
          schedule?: Json
          start_date?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_diet_assignments: {
        Row: {
          active: boolean
          client_id: string
          coach_id: string
          created_at: string
          id: string
          mode: string
          override_calories: number | null
          override_carbs_g: number | null
          override_fat_g: number | null
          override_protein_g: number | null
          override_water_ml: number | null
          start_date: string
          template_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          coach_id: string
          created_at?: string
          id?: string
          mode?: string
          override_calories?: number | null
          override_carbs_g?: number | null
          override_fat_g?: number | null
          override_protein_g?: number | null
          override_water_ml?: number | null
          start_date?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          mode?: string
          override_calories?: number | null
          override_carbs_g?: number | null
          override_fat_g?: number | null
          override_protein_g?: number | null
          override_water_ml?: number | null
          start_date?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_diet_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_diet_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_diet_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invites: {
        Row: {
          coach_id: string
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invites_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_settings: {
        Row: {
          client_id: string
          created_at: string
          current_week: number | null
          program_start_date: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_week?: number | null
          program_start_date?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_week?: number | null
          program_start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          client_id: string
          coach_id: string
          created_at: string
        }
        Insert: {
          client_id: string
          coach_id: string
          created_at?: string
        }
        Update: {
          client_id?: string
          coach_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_template_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_item_id: string | null
          id: string
          label: string | null
          meal_id: string | null
          meal_type: string | null
          notes: string | null
          protein_g: number | null
          quantity: number | null
          sort_order: number
          template_id: string
          unit: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_item_id?: string | null
          id?: string
          label?: string | null
          meal_id?: string | null
          meal_type?: string | null
          notes?: string | null
          protein_g?: number | null
          quantity?: number | null
          sort_order?: number
          template_id: string
          unit?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_item_id?: string | null
          id?: string
          label?: string | null
          meal_id?: string | null
          meal_type?: string | null
          notes?: string | null
          protein_g?: number | null
          quantity?: number | null
          sort_order?: number
          template_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_template_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_template_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "diet_template_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_template_meals: {
        Row: {
          created_at: string
          id: string
          meal_type: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_type: string
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_type?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_template_meals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_templates: {
        Row: {
          carbs_g: number
          coach_id: string | null
          created_at: string
          description: string | null
          fat_g: number
          id: string
          is_system: boolean
          name: string
          notes: string | null
          protein_g: number
          target_calories: number
          updated_at: string
          water_ml: number | null
        }
        Insert: {
          carbs_g: number
          coach_id?: string | null
          created_at?: string
          description?: string | null
          fat_g: number
          id?: string
          is_system?: boolean
          name: string
          notes?: string | null
          protein_g: number
          target_calories: number
          updated_at?: string
          water_ml?: number | null
        }
        Update: {
          carbs_g?: number
          coach_id?: string | null
          created_at?: string
          description?: string | null
          fat_g?: number
          id?: string
          is_system?: boolean
          name?: string
          notes?: string | null
          protein_g?: number
          target_calories?: number
          updated_at?: string
          water_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          block_id: number
          day_code: string
          day_label: string
          default_prescription: string | null
          exercise: string
          id: number
          rest: string | null
          rpe: string | null
          sort_order: number
          transfer: string | null
        }
        Insert: {
          block_id: number
          day_code: string
          day_label: string
          default_prescription?: string | null
          exercise: string
          id?: never
          rest?: string | null
          rpe?: string | null
          sort_order: number
          transfer?: string | null
        }
        Update: {
          block_id?: number
          day_code?: string
          day_label?: string
          default_prescription?: string | null
          exercise?: string
          id?: never
          rest?: string | null
          rpe?: string | null
          sort_order?: number
          transfer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_library_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_per_100g: number | null
          calories_per_serving: number | null
          carbs_per_100g: number | null
          carbs_per_serving: number | null
          created_at: string
          fat_per_100g: number | null
          fat_per_serving: number | null
          id: string
          is_favorite: boolean
          name: string
          off_product_id: string | null
          owner_client_id: string | null
          protein_per_100g: number | null
          protein_per_serving: number | null
          serving_description: string | null
          serving_size_g: number | null
          source: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g?: number | null
          calories_per_serving?: number | null
          carbs_per_100g?: number | null
          carbs_per_serving?: number | null
          created_at?: string
          fat_per_100g?: number | null
          fat_per_serving?: number | null
          id?: string
          is_favorite?: boolean
          name: string
          off_product_id?: string | null
          owner_client_id?: string | null
          protein_per_100g?: number | null
          protein_per_serving?: number | null
          serving_description?: string | null
          serving_size_g?: number | null
          source: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g?: number | null
          calories_per_serving?: number | null
          carbs_per_100g?: number | null
          carbs_per_serving?: number | null
          created_at?: string
          fat_per_100g?: number | null
          fat_per_serving?: number | null
          id?: string
          is_favorite?: boolean
          name?: string
          off_product_id?: string | null
          owner_client_id?: string | null
          protein_per_100g?: number | null
          protein_per_serving?: number | null
          serving_description?: string | null
          serving_size_g?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_items_owner_client_id_fkey"
            columns: ["owner_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_rules: {
        Row: {
          id: number
          implementation: string | null
          priority: number | null
          rule: string
        }
        Insert: {
          id?: never
          implementation?: string | null
          priority?: number | null
          rule: string
        }
        Update: {
          id?: never
          implementation?: string | null
          priority?: number | null
          rule?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          achieved_at: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deadline: string | null
          direction: string | null
          exercise_name: string | null
          goal_type: string
          id: string
          measurement_field: string | null
          notes: string | null
          period: string | null
          status: string
          target_count: number | null
          target_unit: string | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          direction?: string | null
          exercise_name?: string | null
          goal_type: string
          id?: string
          measurement_field?: string | null
          notes?: string | null
          period?: string | null
          status?: string
          target_count?: number | null
          target_unit?: string | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          direction?: string | null
          exercise_name?: string | null
          goal_type?: string
          id?: string
          measurement_field?: string | null
          notes?: string | null
          period?: string | null
          status?: string
          target_count?: number | null
          target_unit?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      injuries: {
        Row: {
          body_area: string
          client_id: string
          created_at: string
          id: string
          noted_at: string
          notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          body_area: string
          client_id?: string
          created_at?: string
          id?: string
          noted_at?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          body_area?: string
          client_id?: string
          created_at?: string
          id?: string
          noted_at?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "injuries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      judo_sessions: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number
          ground_randori_rounds: number
          id: string
          intensity_rpe: number | null
          notes: string | null
          session_date: string
          standing_randori_rounds: number
          updated_at: string
          week_number: number | null
        }
        Insert: {
          client_id?: string
          created_at?: string
          duration_minutes?: number
          ground_randori_rounds?: number
          id?: string
          intensity_rpe?: number | null
          notes?: string | null
          session_date?: string
          standing_randori_rounds?: number
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number
          ground_randori_rounds?: number
          id?: string
          intensity_rpe?: number | null
          notes?: string | null
          session_date?: string
          standing_randori_rounds?: number
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "judo_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judo_sessions_week_number_fkey"
            columns: ["week_number"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["week_number"]
          },
        ]
      }
      meal_log_items: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          food_item_id: string
          id: string
          meal_log_id: string
          protein_g: number
          quantity: number
          template_item_id: string | null
          unit: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_item_id: string
          id?: string
          meal_log_id: string
          protein_g?: number
          quantity: number
          template_item_id?: string | null
          unit?: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          food_item_id?: string
          id?: string
          meal_log_id?: string
          protein_g?: number
          quantity?: number
          template_item_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_log_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_items_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_log_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "diet_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          logged_at: string
          meal_type: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          logged_at?: string
          meal_type: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          logged_at?: string
          meal_type?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mesocycles: {
        Row: {
          created_at: string
          focus: string | null
          id: string
          name: string
          sort_order: number
          template_id: string
          updated_at: string
          weeks: number
        }
        Insert: {
          created_at?: string
          focus?: string | null
          id?: string
          name: string
          sort_order?: number
          template_id: string
          updated_at?: string
          weeks?: number
        }
        Update: {
          created_at?: string
          focus?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
          updated_at?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "mesocycles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          auto_calculated: boolean
          calories: number
          carbs_g: number
          client_id: string
          created_at: string
          effective_from: string
          fat_g: number
          id: string
          protein_g: number
          set_by: string | null
          source: string
          template_id: string | null
          updated_at: string
          water_ml: number | null
        }
        Insert: {
          auto_calculated?: boolean
          calories: number
          carbs_g: number
          client_id?: string
          created_at?: string
          effective_from?: string
          fat_g: number
          id?: string
          protein_g: number
          set_by?: string | null
          source?: string
          template_id?: string | null
          updated_at?: string
          water_ml?: number | null
        }
        Update: {
          auto_calculated?: boolean
          calories?: number
          carbs_g?: number
          client_id?: string
          created_at?: string
          effective_from?: string
          fat_g?: number
          id?: string
          protein_g?: number
          set_by?: string | null
          source?: string
          template_id?: string | null
          updated_at?: string
          water_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_targets_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_targets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          block_id: number
          day_code: string
          day_label: string
          exercise: string
          id: number
          prescription: string | null
          rest: string | null
          sort_order: number
          target_rpe: string | null
          transfer: string | null
          week_number: number
        }
        Insert: {
          block_id: number
          day_code: string
          day_label: string
          exercise: string
          id?: never
          prescription?: string | null
          rest?: string | null
          sort_order: number
          target_rpe?: string | null
          transfer?: string | null
          week_number: number
        }
        Update: {
          block_id?: number
          day_code?: string
          day_label?: string
          exercise?: string
          id?: never
          prescription?: string | null
          rest?: string | null
          sort_order?: number
          target_rpe?: string | null
          transfer?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_week_number_fkey"
            columns: ["week_number"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["week_number"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          height_cm: number | null
          id: string
          name: string | null
          role: string
          sex: string | null
          starting_weight_kg: number | null
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          height_cm?: number | null
          id: string
          name?: string | null
          role?: string
          sex?: string | null
          starting_weight_kg?: number | null
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          height_cm?: number | null
          id?: string
          name?: string | null
          role?: string
          sex?: string | null
          starting_weight_kg?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      program_templates: {
        Row: {
          coach_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_weeks: {
        Row: {
          block_id: number
          day_a_main: string | null
          day_b_main: string | null
          day_c_focus: string | null
          focus: string | null
          hard_sets: number | null
          main_rpe: number | null
          week_number: number
        }
        Insert: {
          block_id: number
          day_a_main?: string | null
          day_b_main?: string | null
          day_c_focus?: string | null
          focus?: string | null
          hard_sets?: number | null
          main_rpe?: number | null
          week_number: number
        }
        Update: {
          block_id?: number
          day_a_main?: string | null
          day_b_main?: string | null
          day_c_focus?: string | null
          focus?: string | null
          hard_sets?: number | null
          main_rpe?: number | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_weeks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          id: string
          storage_path: string
          taken_at: string
        }
        Insert: {
          caption?: string | null
          client_id?: string
          created_at?: string
          id?: string
          storage_path: string
          taken_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          id?: string
          storage_path?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_rules: {
        Row: {
          block_id: number
          id: number
          implementation: string | null
          rule: string
          sort_order: number
        }
        Insert: {
          block_id: number
          id?: never
          implementation?: string | null
          rule: string
          sort_order: number
        }
        Update: {
          block_id?: number
          id?: never
          implementation?: string | null
          rule?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "progression_rules_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          client_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          client_id?: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          client_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_adjustments: {
        Row: {
          action: string
          exercise: string
          id: string
          prescription_id: number | null
          reason: string | null
          rpe_cap: number | null
          session_id: string
          substitute_exercise: string | null
        }
        Insert: {
          action: string
          exercise: string
          id?: string
          prescription_id?: number | null
          reason?: string | null
          rpe_cap?: number | null
          session_id: string
          substitute_exercise?: string | null
        }
        Update: {
          action?: string
          exercise?: string
          id?: string
          prescription_id?: number | null
          reason?: string | null
          rpe_cap?: number | null
          session_id?: string
          substitute_exercise?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_adjustments_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_adjustments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_checkins: {
        Row: {
          client_id: string
          created_at: string
          fatigue: number | null
          id: string
          mood: number | null
          notes: string | null
          overall_feeling: number | null
          recovery: number | null
          sleep_quality: number | null
          soreness: number | null
          stress: number | null
        }
        Insert: {
          client_id?: string
          created_at?: string
          fatigue?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          overall_feeling?: number | null
          recovery?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          stress?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          fatigue?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          overall_feeling?: number | null
          recovery?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          stress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_checkins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          actual_rpe: number | null
          client_id: string
          created_at: string
          day_code: string | null
          exercise: string
          id: string
          load_kg: number | null
          log_date: string
          notes: string | null
          prescription_id: number | null
          reps_done: string | null
          session_quality: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          actual_rpe?: number | null
          client_id?: string
          created_at?: string
          day_code?: string | null
          exercise: string
          id?: string
          load_kg?: number | null
          log_date?: string
          notes?: string | null
          prescription_id?: number | null
          reps_done?: string | null
          session_quality?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          actual_rpe?: number | null
          client_id?: string
          created_at?: string
          day_code?: string | null
          exercise?: string
          id?: string
          load_kg?: number | null
          log_date?: string
          notes?: string | null
          prescription_id?: number | null
          reps_done?: string | null
          session_quality?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_week_number_fkey"
            columns: ["week_number"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["week_number"]
          },
        ]
      }
      session_sets: {
        Row: {
          completed: boolean
          created_at: string
          exercise: string
          id: string
          is_bodyweight: boolean
          prescription_id: number | null
          reps: number | null
          rpe: number | null
          session_id: string
          set_index: number
          set_type: string
          template_session_id: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise: string
          id?: string
          is_bodyweight?: boolean
          prescription_id?: number | null
          reps?: number | null
          rpe?: number | null
          session_id: string
          set_index: number
          set_type?: string
          template_session_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise?: string
          id?: string
          is_bodyweight?: boolean
          prescription_id?: number | null
          reps?: number | null
          rpe?: number | null
          session_id?: string
          set_index?: number
          set_type?: string
          template_session_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_sets_template_session_id_fkey"
            columns: ["template_session_id"]
            isOneToOne: false
            referencedRelation: "template_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_logs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          logged_on: string
          notes: string | null
          supplement_id: string
          taken: boolean
          taken_slots: number[]
        }
        Insert: {
          client_id?: string
          created_at?: string
          id?: string
          logged_on?: string
          notes?: string | null
          supplement_id: string
          taken?: boolean
          taken_slots?: number[]
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          logged_on?: string
          notes?: string | null
          supplement_id?: string
          taken?: boolean
          taken_slots?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_logs_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      supplements: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          dosage: string | null
          dosage_amount: number | null
          dosage_unit: string | null
          frequency: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          schedule_days: number[]
          schedule_times: string[]
          updated_at: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          dosage_amount?: number | null
          dosage_unit?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          schedule_days?: number[]
          schedule_times?: string[]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          dosage_amount?: number | null
          dosage_unit?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          schedule_days?: number[]
          schedule_times?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sessions: {
        Row: {
          created_at: string
          day_code: string
          day_label: string | null
          exercise: string
          id: string
          mesocycle_id: string
          prescription: string | null
          rest: string | null
          sort_order: number
          target_rpe: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          created_at?: string
          day_code: string
          day_label?: string | null
          exercise: string
          id?: string
          mesocycle_id: string
          prescription?: string | null
          rest?: string | null
          sort_order?: number
          target_rpe?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          created_at?: string
          day_code?: string
          day_label?: string | null
          exercise?: string
          id?: string
          mesocycle_id?: string
          prescription?: string | null
          rest?: string | null
          sort_order?: number
          target_rpe?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_sessions_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_calendar: {
        Row: {
          day: string
          id: number
          intensity_rule: string | null
          notes: string | null
          session: string | null
          sort_order: number
          training: string | null
        }
        Insert: {
          day: string
          id?: never
          intensity_rule?: string | null
          notes?: string | null
          session?: string | null
          sort_order: number
          training?: string | null
        }
        Update: {
          day?: string
          id?: never
          intensity_rule?: string | null
          notes?: string | null
          session?: string | null
          sort_order?: number
          training?: string | null
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          client_id: string
          client_notes: string | null
          coach_notes: string | null
          created_at: string
          id: string
          measurements_snapshot: Json | null
          mood: number | null
          overall_feeling: number | null
          recovery: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stress: number | null
          submitted_at: string | null
          updated_at: string
          week_end: string
          week_start: string
          weight_kg: number | null
          weight_summary: Json | null
        }
        Insert: {
          client_id?: string
          client_notes?: string | null
          coach_notes?: string | null
          created_at?: string
          id?: string
          measurements_snapshot?: Json | null
          mood?: number | null
          overall_feeling?: number | null
          recovery?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stress?: number | null
          submitted_at?: string | null
          updated_at?: string
          week_end: string
          week_start: string
          weight_kg?: number | null
          weight_summary?: Json | null
        }
        Update: {
          client_id?: string
          client_notes?: string | null
          coach_notes?: string | null
          created_at?: string
          id?: string
          measurements_snapshot?: Json | null
          mood?: number | null
          overall_feeling?: number | null
          recovery?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stress?: number | null
          submitted_at?: string | null
          updated_at?: string
          week_end?: string
          week_start?: string
          weight_kg?: number | null
          weight_summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          block_id: number | null
          checkin_id: string | null
          client_id: string
          created_at: string
          day_code: string | null
          duration_seconds: number | null
          finished_at: string | null
          id: string
          mesocycle_id: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          started_at: string
          template_id: string | null
          template_week: number | null
          title: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          block_id?: number | null
          checkin_id?: string | null
          client_id?: string
          created_at?: string
          day_code?: string | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          mesocycle_id?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          started_at?: string
          template_id?: string | null
          template_week?: number | null
          title?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          block_id?: number | null
          checkin_id?: string | null
          client_id?: string
          created_at?: string
          day_code?: string | null
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          mesocycle_id?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          started_at?: string
          template_id?: string | null
          template_week?: number | null
          title?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "session_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_mesocycle_id_fkey"
            columns: ["mesocycle_id"]
            isOneToOne: false
            referencedRelation: "mesocycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "program_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_week_number_fkey"
            columns: ["week_number"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["week_number"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_diet_template: { Args: { p_template: string }; Returns: boolean }
      can_read_template: { Args: { p_template: string }; Returns: boolean }
      invite_status: { Args: { p_token: string }; Returns: string }
      is_coach_of: { Args: { p_client: string }; Returns: boolean }
      owns_diet_template: { Args: { p_template: string }; Returns: boolean }
      owns_template: { Args: { p_template: string }; Returns: boolean }
      redeem_invite: { Args: { p_token: string }; Returns: string }
      template_of_mesocycle: { Args: { p_meso: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

