-- =======================================================
-- SISTEMA DE INVITACIONES: WHITELIST TRIGGER (APP PRIVADA)
-- =======================================================
-- Este script crea una función y un trigger en Supabase que se 
-- ejecuta automáticamente cada vez que alguien intenta crear una cuenta.
-- 
-- LÓGICA:
-- 1. Verifica si el correo de quien se registra está en `roles_whitelist`.
-- 2. Si no está, cancela el registro y lanza un error.
-- 3. Si está, permite el registro, le crea su perfil en `profiles` con el
--    rol que se le pre-asignó (alumno, profesor o admin).
-- 4. Borra el correo de la lista blanca para que no se re-use.

CREATE OR REPLACE FUNCTION public.check_whitelist_and_assign_role()
RETURNS trigger AS $$
DECLARE
  v_role text;
BEGIN
  -- 1. Verificar si el correo está en la lista blanca
  SELECT rol_asignado INTO v_role
  FROM public.roles_whitelist
  WHERE correo = NEW.email;

  IF NOT FOUND THEN
    -- 2. Bloquear el registro si no está invitado
    RAISE EXCEPTION 'Acceso denegado: El correo % no ha sido invitado a Ritmo Studio.', NEW.email;
  END IF;

  -- 3. Crear el perfil con los datos enviados desde el formulario de registro
  INSERT INTO public.profiles (id, name, last_name, correo, role, rut, phone)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nombres'), ''),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'apellidos'), ''), ''),
    NEW.email,
    v_role,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'rut'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), '')
  );

  -- 4. Eliminar la invitación consumida para que no vuelva a aparecer como pendiente
  -- ni se pueda reutilizar el código.
  DELETE FROM public.roles_whitelist
  WHERE correo = NEW.email
    AND rol_asignado = v_role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el Trigger sobre la tabla auth.users (propia de Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_whitelist_and_assign_role();
