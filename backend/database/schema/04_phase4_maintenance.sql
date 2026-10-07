CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
    reported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    maintenance_type text NOT NULL CHECK (
        maintenance_type IN ('PREVENTIVE', 'REPAIR', 'INSPECTION', 'CLEANING', 'OTHER')
    ),
    title text NOT NULL,
    description text,
    scheduled_date date,
    started_at timestamptz,
    completed_at timestamptz,
    cost numeric(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    status text NOT NULL CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_equipment_id
    ON public.maintenance_records (equipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_status
    ON public.maintenance_records (status, scheduled_date);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view maintenance records for their equipment"
    ON public.maintenance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = maintenance_records.equipment_id
              AND e.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    );

CREATE POLICY "Owners can insert maintenance records for their equipment"
    ON public.maintenance_records FOR INSERT
    WITH CHECK (
        reported_by = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = equipment_id
              AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update maintenance records for their equipment"
    ON public.maintenance_records FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = maintenance_records.equipment_id
              AND e.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.equipment e
            WHERE e.id = equipment_id
              AND e.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'ADMIN'
        )
    );

CREATE TRIGGER maintenance_records_set_updated_at
    BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
