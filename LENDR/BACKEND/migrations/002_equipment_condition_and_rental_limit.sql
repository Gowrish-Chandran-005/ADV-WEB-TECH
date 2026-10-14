ALTER TABLE equipment
  ADD COLUMN condition text NOT NULL DEFAULT 'UNKNOWN',
  ADD CONSTRAINT equipment_condition_valid
    CHECK (condition IN ('UNKNOWN', 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'));

ALTER TABLE bookings
  ADD CONSTRAINT bookings_rental_days_maximum CHECK (rental_days <= 365);

CREATE FUNCTION enforce_equipment_rental_day_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  equipment_max_days integer;
BEGIN
  SELECT max_rental_days INTO equipment_max_days
  FROM equipment
  WHERE id = NEW.equipment_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.rental_days > equipment_max_days THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'bookings_equipment_rental_day_limit',
      MESSAGE = 'The requested rental duration exceeds the equipment limit.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_enforce_equipment_rental_day_limit
  BEFORE INSERT OR UPDATE OF equipment_id, rental_days ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_equipment_rental_day_limit();
