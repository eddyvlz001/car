export type RouteStatus = 'pending' | 'preparing' | 'done';

export interface Route {
  id: number;
  day_of_week: string;
  priority_number: number;
  status: RouteStatus;
  driver_name: string | null;
  preparer_name: string | null;
  updated_at: string;
}

export interface CarpetRequest {
  id: number;
  route_id: number;
  details: string;
  driver_name: string | null;
  status: 'pending' | 'resolved';
  created_at: string;
  priority_number?: number;
  day_of_week?: string;
}

export interface StockIssue {
  id: number;
  item_name: string;
  issue_type: 'out_of_stock' | 'discontinued';
  reported_at: string;
}

export const DAY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  MONDAY: { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-500' },
  TUESDAY: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
  WEDNESDAY: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  THURSDAY: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  FRIDAY: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500' },
  SATURDAY: { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-500' },
  SUNDAY: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-500' },
};
