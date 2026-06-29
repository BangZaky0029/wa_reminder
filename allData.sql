-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  username character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name character varying NOT NULL,
  email character varying,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  employee_code character varying UNIQUE,
  full_name character varying NOT NULL,
  department_id uuid,
  phone_wa character varying NOT NULL,
  email character varying,
  address text,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.cashbonds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cashbond_code character varying UNIQUE,
  employee_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  total_paid numeric NOT NULL DEFAULT 0 CHECK (total_paid >= 0::numeric),
  remaining_amount numeric NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0::numeric),
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  description text,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'paid'::character varying, 'overdue'::character varying, 'canceled'::character varying]::text[])),
  approval_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (approval_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  approval_note text,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cashbonds_pkey PRIMARY KEY (id),
  CONSTRAINT cashbonds_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT cashbonds_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admin_users(id),
  CONSTRAINT cashbonds_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id)
);
CREATE TABLE public.cashbond_payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cashbond_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method character varying NOT NULL DEFAULT 'cash'::character varying CHECK (payment_method::text = ANY (ARRAY['cash'::character varying, 'transfer'::character varying, 'potong_gaji'::character varying, 'other'::character varying]::text[])),
  note text,
  receipt_path character varying,
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cashbond_payments_pkey PRIMARY KEY (id),
  CONSTRAINT cashbond_payments_cashbond_id_fkey FOREIGN KEY (cashbond_id) REFERENCES public.cashbonds(id),
  CONSTRAINT cashbond_payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.admin_users(id)
);
CREATE TABLE public.cashbond_approvals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cashbond_id uuid NOT NULL,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  note text,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cashbond_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT cashbond_approvals_cashbond_id_fkey FOREIGN KEY (cashbond_id) REFERENCES public.cashbonds(id),
  CONSTRAINT cashbond_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admin_users(id)
);
CREATE TABLE public.wa_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  reminder_type character varying NOT NULL CHECK (reminder_type::text = ANY (ARRAY['h_minus_3'::character varying, 'h_minus_1'::character varying, 'h_day'::character varying, 'overdue'::character varying]::text[])),
  template_body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wa_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reminder_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cashbond_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  reminder_type character varying NOT NULL CHECK (reminder_type::text = ANY (ARRAY['h_minus_3'::character varying, 'h_minus_1'::character varying, 'h_day'::character varying, 'overdue'::character varying]::text[])),
  message_content text NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying]::text[])),
  error_message text,
  phone_number character varying NOT NULL,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reminder_logs_pkey PRIMARY KEY (id),
  CONSTRAINT reminder_logs_cashbond_id_fkey FOREIGN KEY (cashbond_id) REFERENCES public.cashbonds(id),
  CONSTRAINT reminder_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key character varying NOT NULL UNIQUE,
  value text,
  category character varying NOT NULL DEFAULT 'general'::character varying,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_logs (
  id bigint NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass),
  user_id uuid,
  action character varying NOT NULL CHECK (action::text = ANY (ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying, 'APPROVE'::character varying, 'REJECT'::character varying]::text[])),
  table_name character varying,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address character varying,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id)
);
CREATE TABLE public.wa_devices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone_number character varying NOT NULL UNIQUE,
  status character varying NOT NULL DEFAULT 'disconnected'::character varying CHECK (status::text = ANY (ARRAY['disconnected'::character varying, 'qr_ready'::character varying, 'connecting'::character varying, 'connected'::character varying]::text[])),
  qr_code text,
  pairing_code character varying,
  last_connected timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wa_devices_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wa_sessions (
  id character varying NOT NULL,
  data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wa_sessions_pkey PRIMARY KEY (id)
);