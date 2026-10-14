CREATE FUNCTION enforce_active_equipment_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  equipment_status text;
BEGIN
  SELECT status
  INTO equipment_status
  FROM equipment
  WHERE id = NEW.equipment_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.status IN ('PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED'))
     AND equipment_status <> 'ACTIVE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'bookings_equipment_must_be_active',
      MESSAGE = 'Bookings can only be created for active equipment.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_require_active_equipment
  BEFORE INSERT OR UPDATE OF equipment_id, status ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_active_equipment_booking();
