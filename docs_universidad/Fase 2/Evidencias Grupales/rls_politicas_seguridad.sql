-- =========================================================================
-- PROYECTO CAPSTONE (PTY4614): SISTEMA WEB INTEGRAL CUERPO Y ALMA
-- EVIDENCIA DE INGENIERÍA: POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- AUTORES: José Rivera (Backend/QA Lead), Benjamín García, Manuel Campos
-- =========================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS DEL SISTEMA
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tipos_clase ENABLE ROW LEVEL SECURITY;

-- 2. LIMPIEZA DE POLÍTICAS PREVIAS (Para evitar duplicidad en re-ejecución)
DROP POLICY IF EXISTS "Profiles: Lectura de propio perfil o admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Actualización de propio perfil o admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Inserción permitida para auth" ON public.profiles;

DROP POLICY IF EXISTS "Clases: Lectura pública para usuarios autenticados" ON public.clase;
DROP POLICY IF EXISTS "Clases: Modificación exclusiva para profesor asignado o admin" ON public.clase;
DROP POLICY IF EXISTS "Clases: Inserción y eliminación solo admin" ON public.clase;

DROP POLICY IF EXISTS "Reservas: Alumno ve solo sus reservas" ON public.reserva;
DROP POLICY IF EXISTS "Reservas: Creación para propio usuario" ON public.reserva;
DROP POLICY IF EXISTS "Reservas: Cancelación propia o admin" ON public.reserva;

DROP POLICY IF EXISTS "Notificaciones: Consulta para autenticados" ON public.notificaciones;
DROP POLICY IF EXISTS "Notificaciones: Inserción para eventos operativos" ON public.notificaciones;
DROP POLICY IF EXISTS "Notificaciones: Actualización de estado leída" ON public.notificaciones;

DROP POLICY IF EXISTS "Planes: Lectura para todos los autenticados" ON public.planes;
DROP POLICY IF EXISTS "Planes: Gestión solo admin" ON public.planes;

DROP POLICY IF EXISTS "Pagos: Usuario ve solo sus pagos" ON public.user_pagos;
DROP POLICY IF EXISTS "Pagos: Gestión solo admin" ON public.user_pagos;

-- =========================================================================
-- 3. POLÍTICAS DE SEGURIDAD PARA TABLA: PROFILES
-- =========================================================================

-- Lectura: Cada usuario autenticado puede leer su propio perfil; el Administrador puede ver todos.
CREATE POLICY "Profiles: Lectura de propio perfil o admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- Actualización: Cada usuario actualiza sus datos; el admin puede editar cualquier perfil.
CREATE POLICY "Profiles: Actualización de propio perfil o admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
)
WITH CHECK (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- Inserción: Registro de nuevos usuarios autenticados
CREATE POLICY "Profiles: Inserción permitida para auth"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- =========================================================================
-- 4. POLÍTICAS DE SEGURIDAD PARA TABLA: CLASE
-- =========================================================================

-- Lectura: Todos los alumnos, profesores y administradores pueden ver la programación de clases.
CREATE POLICY "Clases: Lectura pública para usuarios autenticados"
ON public.clase
FOR SELECT
TO authenticated
USING (true);

-- Modificación: Solo el profesor titular de la clase o un administrador pueden iniciar la clase o editarla.
CREATE POLICY "Clases: Modificación exclusiva para profesor asignado o admin"
ON public.clase
FOR UPDATE
TO authenticated
USING (
    id_profesor = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
)
WITH CHECK (
    id_profesor = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- Creación/Eliminación: Exclusiva de la Coordinación / Administrador
CREATE POLICY "Clases: Inserción y eliminación solo admin"
ON public.clase
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- =========================================================================
-- 5. POLÍTICAS DE SEGURIDAD PARA TABLA: RESERVA
-- =========================================================================

-- Lectura: Alumno ve solo sus reservas; el profesor de la clase ve a sus alumnos inscritos; admin ve todo.
CREATE POLICY "Reservas: Alumno ve solo sus reservas"
ON public.reserva
FOR SELECT
TO authenticated
USING (
    id_usuario = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.clase 
        WHERE clase.id_clase = reserva.id_clase AND clase.id_profesor = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- Inserción: Solo para su propio usuario
CREATE POLICY "Reservas: Creación para propio usuario"
ON public.reserva
FOR INSERT
TO authenticated
WITH CHECK (
    id_usuario = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- Cancelación: El propio usuario o la administración pueden cancelar la reserva.
CREATE POLICY "Reservas: Cancelación propia o admin"
ON public.reserva
FOR DELETE
TO authenticated
USING (
    id_usuario = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'administrador'
    )
);

-- =========================================================================
-- 6. POLÍTICAS DE SEGURIDAD PARA TABLA: NOTIFICACIONES (TIEMPO REAL)
-- =========================================================================

CREATE POLICY "Notificaciones: Consulta para autenticados"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Notificaciones: Inserción para eventos operativos"
ON public.notificaciones
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Notificaciones: Actualización de estado leída"
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- =========================================================================
-- 7. TRIGGER DISCIPLINAR: CONTROL DE AFORO ATÓMICO (MÁXIMO 8 CUPOS)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_actualizar_cupos_clase()
RETURNS TRIGGER AS $$
DECLARE
    v_total_inscritos INTEGER;
    v_cupo_max INTEGER;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Verificar capacidad máxima
        SELECT cupo_maximo, cupos_inscritos INTO v_cupo_max, v_total_inscritos
        FROM public.clase
        WHERE id_clase = NEW.id_clase
        FOR UPDATE;

        IF (v_total_inscritos >= v_cupo_max) THEN
            RAISE EXCEPTION 'Capacidad máxima de sala alcanzada (máximo % cupos)', v_cupo_max;
        END IF;

        UPDATE public.clase
        SET cupos_inscritos = cupos_inscritos + 1
        WHERE id_clase = NEW.id_clase;
        
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.clase
        SET cupos_inscritos = GREATEST(cupos_inscritos - 1, 0)
        WHERE id_clase = OLD.id_clase;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_actualizar_cupos_clase ON public.reserva;

CREATE TRIGGER tr_actualizar_cupos_clase
AFTER INSERT OR DELETE ON public.reserva
FOR EACH ROW
EXECUTE FUNCTION public.fn_actualizar_cupos_clase();

-- =========================================================================
-- 8. PUBLICACIÓN EN SUPABASE REALTIME
-- =========================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notificaciones'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'clase'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clase;
    END IF;
END $$;
