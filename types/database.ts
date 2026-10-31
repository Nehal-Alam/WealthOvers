export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number_masked: string | null
          account_type: Database["public"]["Enums"]["account_type_enum"]
          color: string
          created_at: string
          currency: string
          current_balance: number
          icon: string
          id: string
          initial_balance: number
          institution_name: string
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number_masked?: string | null
          account_type?: Database["public"]["Enums"]["account_type_enum"]
          color?: string
          created_at?: string
          currency?: string
          current_balance?: number
          icon?: string
          id?: string
          initial_balance?: number
          institution_name?: string
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number_masked?: string | null
          account_type?: Database["public"]["Enums"]["account_type_enum"]
          color?: string
          created_at?: string
          currency?: string
          current_balance?: number
          icon?: string
          id?: string
          initial_balance?: number
          institution_name?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          category: string
          created_at: string
          current_valuation: number
          id: string
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_valuation: number
          id?: string
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_valuation?: number
          id?: string
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          file_name: string
          file_path: string
          file_size_bytes: number
          id?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          allocated_amount: number
          budget_id: string
          category_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          allocated_amount: number
          budget_id: string
          category_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          budget_id?: string
          category_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_threshold_percent: number
          created_at: string
          end_date: string
          id: string
          name: string
          period_type: string
          rolled_over_amount: number
          rollover_enabled: boolean
          start_date: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold_percent?: number
          created_at?: string
          end_date: string
          id?: string
          name: string
          period_type?: string
          rolled_over_amount?: number
          rollover_enabled?: boolean
          start_date: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold_percent?: number
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          period_type?: string
          rolled_over_amount?: number
          rollover_enabled?: boolean
          start_date?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_system: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorization_rules: {
        Row: {
          created_at: string
          id: string
          keyword_pattern: string
          match_field: string
          priority: number
          target_category_id: string
          target_subcategory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword_pattern: string
          match_field?: string
          priority?: number
          target_category_id: string
          target_subcategory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword_pattern?: string
          match_field?: string
          priority?: number
          target_category_id?: string
          target_subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_target_category_id_fkey"
            columns: ["target_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_target_subcategory_id_fkey"
            columns: ["target_subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_statements: {
        Row: {
          created_at: string
          credit_card_id: string
          due_date: string
          id: string
          is_settled: boolean
          minimum_due: number
          statement_period_end: string
          statement_period_start: string
          total_due: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_card_id: string
          due_date: string
          id?: string
          is_settled?: boolean
          minimum_due: number
          statement_period_end: string
          statement_period_start: string
          total_due: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_card_id?: string
          due_date?: string
          id?: string
          is_settled?: boolean
          minimum_due?: number
          statement_period_end?: string
          statement_period_start?: string
          total_due?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_statements_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string
          apr_percentage: number | null
          card_name: string
          created_at: string
          credit_limit: number
          current_outstanding: number
          id: string
          issuer_name: string
          last_four_digits: string
          payment_due_day: number
          statement_date_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          apr_percentage?: number | null
          card_name: string
          created_at?: string
          credit_limit: number
          current_outstanding?: number
          id?: string
          issuer_name: string
          last_four_digits: string
          payment_due_day: number
          statement_date_day: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          apr_percentage?: number | null
          card_name?: string
          created_at?: string
          credit_limit?: number
          current_outstanding?: number
          id?: string
          issuer_name?: string
          last_four_digits?: string
          payment_due_day?: number
          statement_date_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_model: string | null
          device_name: string
          device_token_hash: string
          id: string
          last_sync_at: string | null
          status: Database["public"]["Enums"]["device_status_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_model?: string | null
          device_name: string
          device_token_hash: string
          id?: string
          last_sync_at?: string | null
          status?: Database["public"]["Enums"]["device_status_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_model?: string | null
          device_name?: string
          device_token_hash?: string
          id?: string
          last_sync_at?: string | null
          status?: Database["public"]["Enums"]["device_status_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          category: string
          created_at: string
          current_amount: number
          id: string
          name: string
          target_amount: number
          target_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          target_amount: number
          target_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          target_amount?: number
          target_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          goal_id: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date: string
          created_at?: string
          goal_id: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          account_id: string | null
          created_at: string
          error_log: string | null
          file_format: string
          file_name: string
          id: string
          status: Database["public"]["Enums"]["import_status_enum"]
          total_duplicates: number
          total_imported: number
          total_parsed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          error_log?: string | null
          file_format: string
          file_name: string
          id?: string
          status?: Database["public"]["Enums"]["import_status_enum"]
          total_duplicates?: number
          total_imported?: number
          total_parsed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          error_log?: string | null
          file_format?: string
          file_name?: string
          id?: string
          status?: Database["public"]["Enums"]["import_status_enum"]
          total_duplicates?: number
          total_imported?: number
          total_parsed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_transactions: {
        Row: {
          created_at: string
          fees_and_taxes: number
          id: string
          investment_id: string
          notes: string | null
          quantity: number
          total_amount: number
          transaction_date: string
          transaction_type: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fees_and_taxes?: number
          id?: string
          investment_id: string
          notes?: string | null
          quantity: number
          total_amount: number
          transaction_date: string
          transaction_type: string
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fees_and_taxes?: number
          id?: string
          investment_id?: string
          notes?: string | null
          quantity?: number
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          account_id: string | null
          asset_type: Database["public"]["Enums"]["investment_type_enum"]
          average_buy_price: number
          broker_name: string
          created_at: string
          currency: string
          current_nav_or_price: number
          current_valuation: number
          id: string
          last_price_update_at: string | null
          name: string
          notes: string | null
          symbol: string | null
          total_invested_amount: number
          total_quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          asset_type: Database["public"]["Enums"]["investment_type_enum"]
          average_buy_price?: number
          broker_name?: string
          created_at?: string
          currency?: string
          current_nav_or_price?: number
          current_valuation?: number
          id?: string
          last_price_update_at?: string | null
          name: string
          notes?: string | null
          symbol?: string | null
          total_invested_amount?: number
          total_quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          asset_type?: Database["public"]["Enums"]["investment_type_enum"]
          average_buy_price?: number
          broker_name?: string
          created_at?: string
          currency?: string
          current_nav_or_price?: number
          current_valuation?: number
          id?: string
          last_price_update_at?: string | null
          name?: string
          notes?: string | null
          symbol?: string | null
          total_invested_amount?: number
          total_quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          category: string
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          outstanding_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          outstanding_amount: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          outstanding_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          created_at: string
          emi_amount: number
          extra_prepayment: number
          id: string
          interest_component: number
          loan_id: string
          payment_date: string
          principal_component: number
          remaining_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emi_amount: number
          extra_prepayment?: number
          id?: string
          interest_component: number
          loan_id: string
          payment_date: string
          principal_component: number
          remaining_balance: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emi_amount?: number
          extra_prepayment?: number
          id?: string
          interest_component?: number
          loan_id?: string
          payment_date?: string
          principal_component?: number
          remaining_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          account_id: string | null
          annual_interest_rate: number
          created_at: string
          id: string
          lender_or_borrower_name: string
          loan_type: Database["public"]["Enums"]["loan_type_enum"]
          maturity_date: string
          monthly_emi: number
          notes: string | null
          outstanding_balance: number
          principal_amount: number
          start_date: string
          tenure_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          annual_interest_rate: number
          created_at?: string
          id?: string
          lender_or_borrower_name: string
          loan_type?: Database["public"]["Enums"]["loan_type_enum"]
          maturity_date: string
          monthly_emi: number
          notes?: string | null
          outstanding_balance: number
          principal_amount: number
          start_date: string
          tenure_months: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          annual_interest_rate?: number
          created_at?: string
          id?: string
          lender_or_borrower_name?: string
          loan_type?: Database["public"]["Enums"]["loan_type_enum"]
          maturity_date?: string
          monthly_emi?: number
          notes?: string | null
          outstanding_balance?: number
          principal_amount?: number
          start_date?: string
          tenure_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          created_at: string
          default_category_id: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_category_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_category_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_default_category_id_fkey"
            columns: ["default_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string
          amount: number
          auto_record: boolean
          category_id: string | null
          created_at: string
          currency: string
          end_date: string | null
          id: string
          interval_count: number
          is_active: boolean
          merchant_id: string | null
          name: string
          next_occurrence_date: string
          recurrence_interval: Database["public"]["Enums"]["recurrence_interval_enum"]
          start_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          auto_record?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          interval_count?: number
          is_active?: boolean
          merchant_id?: string | null
          name: string
          next_occurrence_date: string
          recurrence_interval?: Database["public"]["Enums"]["recurrence_interval_enum"]
          start_date: string
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          auto_record?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          id?: string
          interval_count?: number
          is_active?: boolean
          merchant_id?: string | null
          name?: string
          next_occurrence_date?: string
          recurrence_interval?: Database["public"]["Enums"]["recurrence_interval_enum"]
          start_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string | null
          billing_cycle: Database["public"]["Enums"]["recurrence_interval_enum"]
          cancellation_reminder_days: number
          category_id: string | null
          cost: number
          created_at: string
          currency: string
          id: string
          name: string
          renewal_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["recurrence_interval_enum"]
          cancellation_reminder_days?: number
          category_id?: string | null
          cost: number
          created_at?: string
          currency?: string
          id?: string
          name: string
          renewal_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["recurrence_interval_enum"]
          cancellation_reminder_days?: number
          category_id?: string | null
          cost?: number
          created_at?: string
          currency?: string
          id?: string
          name?: string
          renewal_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          device_id: string
          error_message: string | null
          id: string
          records_flagged_for_review: number
          records_ingested: number
          records_received: number
          sync_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          error_message?: string | null
          id?: string
          records_flagged_for_review?: number
          records_ingested?: number
          records_received?: number
          sync_status: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          error_message?: string | null
          id?: string
          records_flagged_for_review?: number
          records_ingested?: number
          records_received?: number
          sync_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          description: string
          destination_account_id: string | null
          id: string
          idempotency_hash: string | null
          is_reviewed: boolean
          merchant_id: string | null
          notes: string | null
          original_transaction_id: string | null
          parser_confidence: number | null
          reference_number: string | null
          source: Database["public"]["Enums"]["transaction_source_enum"]
          subcategory_id: string | null
          tags: string[] | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          destination_account_id?: string | null
          id?: string
          idempotency_hash?: string | null
          is_reviewed?: boolean
          merchant_id?: string | null
          notes?: string | null
          original_transaction_id?: string | null
          parser_confidence?: number | null
          reference_number?: string | null
          source?: Database["public"]["Enums"]["transaction_source_enum"]
          subcategory_id?: string | null
          tags?: string[] | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          destination_account_id?: string | null
          id?: string
          idempotency_hash?: string | null
          is_reviewed?: boolean
          merchant_id?: string | null
          notes?: string | null
          original_transaction_id?: string | null
          parser_confidence?: number | null
          reference_number?: string | null
          source?: Database["public"]["Enums"]["transaction_source_enum"]
          subcategory_id?: string | null
          tags?: string[] | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          currency: string
          financial_year_start_month: number
          id: string
          is_privacy_mode: boolean
          locale: string
          theme_preference: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          financial_year_start_month?: number
          id?: string
          is_privacy_mode?: boolean
          locale?: string
          theme_preference?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          financial_year_start_month?: number
          id?: string
          is_privacy_mode?: boolean
          locale?: string
          theme_preference?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type_enum:
        | "savings"
        | "current"
        | "salary"
        | "cash"
        | "upi_wallet"
        | "fixed_deposit"
        | "recurring_deposit"
        | "credit_card"
        | "loan_account"
        | "investment_demat"
        | "other"
      device_status_enum: "active" | "revoked" | "pending_approval"
      import_status_enum: "pending" | "processing" | "completed" | "failed"
      investment_type_enum:
        | "stock_in"
        | "stock_us"
        | "mutual_fund"
        | "etf"
        | "sovereign_gold_bond"
        | "gold_physical"
        | "gold_digital"
        | "fixed_deposit"
        | "recurring_deposit"
        | "ppf"
        | "epf"
        | "nps"
        | "crypto"
        | "other"
      loan_type_enum:
        | "personal"
        | "home"
        | "education"
        | "vehicle"
        | "credit_card_debt"
        | "loan_given"
        | "loan_received"
        | "other"
      recurrence_interval_enum:
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "half_yearly"
        | "yearly"
      transaction_source_enum:
        | "manual"
        | "csv_import"
        | "xlsx_import"
        | "pdf_import"
        | "android_sms_sync"
        | "notification_sync"
        | "recurring_rule"
      transaction_type_enum:
        | "income"
        | "expense"
        | "transfer"
        | "refund"
        | "investment_buy"
        | "investment_sell"
        | "loan_disbursement"
        | "loan_repayment"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_type_enum: [
        "savings",
        "current",
        "salary",
        "cash",
        "upi_wallet",
        "fixed_deposit",
        "recurring_deposit",
        "credit_card",
        "loan_account",
        "investment_demat",
        "other",
      ],
      device_status_enum: ["active", "revoked", "pending_approval"],
      import_status_enum: ["pending", "processing", "completed", "failed"],
      investment_type_enum: [
        "stock_in",
        "stock_us",
        "mutual_fund",
        "etf",
        "sovereign_gold_bond",
        "gold_physical",
        "gold_digital",
        "fixed_deposit",
        "recurring_deposit",
        "ppf",
        "epf",
        "nps",
        "crypto",
        "other",
      ],
      loan_type_enum: [
        "personal",
        "home",
        "education",
        "vehicle",
        "credit_card_debt",
        "loan_given",
        "loan_received",
        "other",
      ],
      recurrence_interval_enum: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "half_yearly",
        "yearly",
      ],
      transaction_source_enum: [
        "manual",
        "csv_import",
        "xlsx_import",
        "pdf_import",
        "android_sms_sync",
        "notification_sync",
        "recurring_rule",
      ],
      transaction_type_enum: [
        "income",
        "expense",
        "transfer",
        "refund",
        "investment_buy",
        "investment_sell",
        "loan_disbursement",
        "loan_repayment",
      ],
    },
  },
} as const
