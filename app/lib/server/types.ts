export type FieldDataItem = {
  name: string;
  values?: string[];
};

export type MetaLeadPayload = {
  id: string;
  created_time?: string;
  field_data?: FieldDataItem[];
  [key: string]: unknown;
};

export type WebsiteLeadData = {
  lead_id: string;
  parent_name: string;
  phone: string;
  child_age: string;
  region_code: string;
  region_name: string;
  preferred_branch: string;
  submitted_at: string;
  source_url?: string;
  user_agent?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export type LeadRecord = {
  id: string;
  website_data: WebsiteLeadData[];
  fb_data: MetaLeadPayload[];
  created_at: string;
  updated_at: string;
  sync: {
    status: "idle" | "pending" | "success" | "failed";
    attempts: number;
    last_error: string | null;
    last_synced_at: string | null;
    last_checksum: string | null;
    bitrix_lead_id: string | null;
    next_retry_at: string | null;
  };
};

export type BitrixSyncResult = {
  ok: boolean;
  leadId?: string;
  error?: string;
};
