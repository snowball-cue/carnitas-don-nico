/**
 * Hand-written Supabase database types for Carnitas Don Nico.
 * Mirrors the generated shape so we can swap later without refactoring.
 *
 * Source of truth: supabase/migrations/0001_initial_schema.sql
 */

// -----------------------------------------------------------------------------
// Enum unions
// -----------------------------------------------------------------------------
export type AppRole = "customer" | "staff" | "admin";

export type MenuCategory =
  | "carnitas"
  | "chicharron"
  | "drinks"
  | "sides"
  | "other";

export type MenuUnit = "lb" | "each";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "picked_up"
  | "cancelled"
  | "no_show";

export type PaymentStatus =
  | "unpaid"
  | "deposit_paid"
  | "paid"
  | "refunded"
  | "failed";

export type PaymentMethod =
  | "stripe"
  | "cash"
  | "zelle"
  | "venmo"
  | "cashapp"
  | "other";

export type ExpenseCategory =
  | "carne"
  | "heb"
  | "sams"
  | "restaurant_depot"
  | "misc"
  | "cilantro_lime"
  | "tortilla"
  | "gas"
  | "packaging"
  | "other";

export type NotificationType =
  | "new_order"
  | "deposit_paid"
  | "cancellation"
  | "capacity_full"
  | "low_stock"
  | "pickup_reminder"
  | "review_received";

export type ReceiptStatus = "pending_review" | "approved" | "rejected";

// -----------------------------------------------------------------------------
// Json helper type
// -----------------------------------------------------------------------------
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// -----------------------------------------------------------------------------
// Row / Insert / Update helpers
// -----------------------------------------------------------------------------
type Timestamptz = string;
type DateString = string; // ISO YYYY-MM-DD
type TimeString = string; // HH:MM:SS
type Uuid = string;

// ============================================================================
// Tables
// ============================================================================

export interface CustomerProfileRow {
  id: Uuid;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  total_lbs_purchased: number;
  loyalty_points: number;
  referral_code: string;
  referred_by: Uuid | null;
  marketing_opt_in: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type CustomerProfileInsert = Partial<CustomerProfileRow> &
  Pick<CustomerProfileRow, "id" | "referral_code">;
export type CustomerProfileUpdate = Partial<CustomerProfileRow>;

export interface AppRoleRow {
  user_id: Uuid;
  role: AppRole;
  granted_at: Timestamptz;
  granted_by: Uuid | null;
}
export type AppRoleInsert = Pick<AppRoleRow, "user_id" | "role"> &
  Partial<Omit<AppRoleRow, "user_id" | "role">>;
export type AppRoleUpdate = Partial<AppRoleRow>;

export interface MenuItemRow {
  id: Uuid;
  slug: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  category: MenuCategory;
  unit: MenuUnit;
  price: number;
  min_quantity: number;
  quantity_step: number;
  image_url: string | null;
  in_stock: boolean;
  has_variants: boolean;
  sort_order: number;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type MenuItemInsert = Partial<MenuItemRow> &
  Pick<MenuItemRow, "slug" | "name_en" | "name_es" | "category" | "unit" | "price">;
export type MenuItemUpdate = Partial<MenuItemRow>;

export interface MenuItemVariantRow {
  id: Uuid;
  menu_item_id: Uuid;
  slug: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  price_delta: number;
  in_stock: boolean;
  sort_order: number;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type MenuItemVariantInsert = Partial<MenuItemVariantRow> &
  Pick<MenuItemVariantRow, "menu_item_id" | "slug" | "name_en" | "name_es">;
export type MenuItemVariantUpdate = Partial<MenuItemVariantRow>;

export interface PickupDateRow {
  id: Uuid;
  pickup_date: DateString;
  pickup_window_start: TimeString;
  pickup_window_end: TimeString;
  capacity_lbs: number;
  reserved_lbs: number;
  cutoff_at: Timestamptz;
  is_open: boolean;
  notes_en: string | null;
  notes_es: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type PickupDateInsert = Partial<PickupDateRow> &
  Pick<PickupDateRow, "pickup_date" | "capacity_lbs" | "cutoff_at">;
export type PickupDateUpdate = Partial<PickupDateRow>;

export interface OrderRow {
  id: Uuid;
  order_number: string;
  customer_id: Uuid | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  pickup_date_id: Uuid;
  pickup_date: DateString;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  deposit_paid: number;
  balance_remaining: number;
  total_lbs: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  cancelled_at: Timestamptz | null;
  confirmed_at: Timestamptz | null;
  picked_up_at: Timestamptz | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type OrderInsert = Partial<OrderRow> &
  Pick<OrderRow, "pickup_date_id" | "pickup_date">;
export type OrderUpdate = Partial<OrderRow>;

export interface OrderItemRow {
  id: Uuid;
  order_id: Uuid;
  menu_item_id: Uuid;
  variant_id: Uuid | null;
  name_snapshot_en: string;
  name_snapshot_es: string | null;
  variant_snapshot: string | null;
  quantity: number;
  unit: MenuUnit;
  unit_price_snapshot: number;
  line_total: number;
  notes: string | null;
  created_at: Timestamptz;
}
export type OrderItemInsert = Partial<OrderItemRow> &
  Pick<
    OrderItemRow,
    | "order_id"
    | "menu_item_id"
    | "name_snapshot_en"
    | "quantity"
    | "unit"
    | "unit_price_snapshot"
    | "line_total"
  >;
export type OrderItemUpdate = Partial<OrderItemRow>;

export interface ExpenseRow {
  id: Uuid;
  expense_date: DateString;
  event_date: DateString | null;
  category: ExpenseCategory;
  description: string | null;
  quantity: number | null;
  unit_cost: number | null;
  amount: number;
  receipt_image_url: string | null;
  receipt_id: Uuid | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type ExpenseInsert = Partial<ExpenseRow> &
  Pick<ExpenseRow, "expense_date" | "amount">;
export type ExpenseUpdate = Partial<ExpenseRow>;

export interface ManualRevenueRow {
  id: Uuid;
  event_date: DateString;
  amount: number;
  lbs_sold: number | null;
  description: string | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type ManualRevenueInsert = Partial<ManualRevenueRow> &
  Pick<ManualRevenueRow, "event_date" | "amount">;
export type ManualRevenueUpdate = Partial<ManualRevenueRow>;

export interface ShoppingListRow {
  id: Uuid;
  item_name_en: string;
  item_name_es: string | null;
  quantity: number | null;
  unit: string | null;
  estimated_cost: number | null;
  notes: string | null;
  needed_by_date: DateString | null;
  is_purchased: boolean;
  purchased_at: Timestamptz | null;
  purchased_by: Uuid | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type ShoppingListInsert = Partial<ShoppingListRow> &
  Pick<ShoppingListRow, "item_name_en">;
export type ShoppingListUpdate = Partial<ShoppingListRow>;

export interface InvestmentRow {
  id: Uuid;
  item_name: string;
  cost: number;
  purchase_date: DateString;
  category: string | null;
  notes: string | null;
  receipt_id: Uuid | null;
  created_by: Uuid | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type InvestmentInsert = Partial<InvestmentRow> &
  Pick<InvestmentRow, "item_name" | "cost" | "purchase_date">;
export type InvestmentUpdate = Partial<InvestmentRow>;

export interface ReceiptRow {
  id: Uuid;
  storage_path: string;
  uploaded_by: Uuid | null;
  parsed_json: Json | null;
  parsed_total: number | null;
  store_name: string | null;
  purchase_date: DateString | null;
  status: ReceiptStatus;
  linked_expense_ids: Uuid[];
  notes: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type ReceiptInsert = Partial<ReceiptRow> &
  Pick<ReceiptRow, "storage_path">;
export type ReceiptUpdate = Partial<ReceiptRow>;

export interface NotificationRow {
  id: Uuid;
  recipient_user_id: Uuid;
  type: NotificationType;
  title: string;
  body: string | null;
  metadata: Json;
  read_at: Timestamptz | null;
  created_at: Timestamptz;
}
export type NotificationInsert = Partial<NotificationRow> &
  Pick<NotificationRow, "recipient_user_id" | "type" | "title">;
export type NotificationUpdate = Partial<NotificationRow>;

export interface PushSubscriptionRow {
  id: Uuid;
  user_id: Uuid;
  endpoint: string;
  keys: Json;
  user_agent: string | null;
  created_at: Timestamptz;
  last_seen: Timestamptz;
}
export type PushSubscriptionInsert = Partial<PushSubscriptionRow> &
  Pick<PushSubscriptionRow, "user_id" | "endpoint" | "keys">;
export type PushSubscriptionUpdate = Partial<PushSubscriptionRow>;

export interface ReviewRow {
  id: Uuid;
  order_id: Uuid | null;
  customer_id: Uuid | null;
  rating: number | null;
  comment: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}
export type ReviewInsert = Partial<ReviewRow>;
export type ReviewUpdate = Partial<ReviewRow>;

export type CateringStatus =
  | "new"
  | "contacted"
  | "quoted"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface CateringRequestRow {
  id: Uuid;
  full_name: string;
  email: string;
  phone: string;
  event_date: DateString;
  event_time_slot: "12:00" | "16:00" | null;
  guest_count: number;
  estimated_lbs: number;
  event_type: string | null;
  event_location: string | null;
  cuts_preference: string | null;
  includes_sides: boolean;
  delivery_needed: boolean;
  delivery_miles: number | null;
  notes: string | null;
  status: CateringStatus;
  quoted_price: number | null;
  customer_id: Uuid | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  updated_by_admin_at: Timestamptz | null;
}
export type CateringRequestInsert = Partial<CateringRequestRow> &
  Pick<
    CateringRequestRow,
    "full_name" | "email" | "phone" | "event_date" | "guest_count" | "estimated_lbs"
  >;
export type CateringRequestUpdate = Partial<CateringRequestRow>;

// ============================================================================
// Database interface (shape matches @supabase generated types)
// ============================================================================
export interface Database {
  public: {
    Tables: {
      customer_profiles: {
        Row: CustomerProfileRow;
        Insert: CustomerProfileInsert;
        Update: CustomerProfileUpdate;
      };
      app_roles: {
        Row: AppRoleRow;
        Insert: AppRoleInsert;
        Update: AppRoleUpdate;
      };
      menu_items: {
        Row: MenuItemRow;
        Insert: MenuItemInsert;
        Update: MenuItemUpdate;
      };
      menu_item_variants: {
        Row: MenuItemVariantRow;
        Insert: MenuItemVariantInsert;
        Update: MenuItemVariantUpdate;
      };
      pickup_dates: {
        Row: PickupDateRow;
        Insert: PickupDateInsert;
        Update: PickupDateUpdate;
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
      order_items: {
        Row: OrderItemRow;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
      };
      manual_revenue: {
        Row: ManualRevenueRow;
        Insert: ManualRevenueInsert;
        Update: ManualRevenueUpdate;
      };
      shopping_list: {
        Row: ShoppingListRow;
        Insert: ShoppingListInsert;
        Update: ShoppingListUpdate;
      };
      investments: {
        Row: InvestmentRow;
        Insert: InvestmentInsert;
        Update: InvestmentUpdate;
      };
      receipts: {
        Row: ReceiptRow;
        Insert: ReceiptInsert;
        Update: ReceiptUpdate;
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: PushSubscriptionInsert;
        Update: PushSubscriptionUpdate;
      };
      reviews: {
        Row: ReviewRow;
        Insert: ReviewInsert;
        Update: ReviewUpdate;
      };
      catering_requests: {
        Row: CateringRequestRow;
        Insert: CateringRequestInsert;
        Update: CateringRequestUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { uid?: string };
        Returns: boolean;
      };
      is_superadmin: {
        Args: { uid?: string };
        Returns: boolean;
      };
      generate_order_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_referral_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      menu_category: MenuCategory;
      menu_unit: MenuUnit;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      expense_category: ExpenseCategory;
      notification_type: NotificationType;
      receipt_status: ReceiptStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
