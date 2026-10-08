-- ==========================================
-- SCRIPT COMPLETO DE CREACIÓN Y DEMO DE LA BASE DE DATOS
-- ==========================================
-- Este script crea todas las tablas desde cero, borra la data existente
-- e inserta los datos de prueba listos para la demostración.

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ELIMINACIÓN DE TABLAS (Para poder crear desde cero sin errores de dependencias)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.asistencia CASCADE;
DROP TABLE IF EXISTS public.reserva CASCADE;
DROP TABLE IF EXISTS public.clase CASCADE;
DROP TABLE IF EXISTS public.plantillas_clase CASCADE;
DROP TABLE IF EXISTS public.user_pagos CASCADE;
DROP TABLE IF EXISTS public.user_suscripciones CASCADE;
DROP TABLE IF EXISTS public.planes CASCADE;
DROP TABLE IF EXISTS public.tipos_clase CASCADE;
DROP TABLE IF EXISTS public.salas CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.roles_whitelist CASCADE;

-- Limpiar los usuarios demo de la tabla auth.users
DELETE FROM auth.users WHERE email IN ('admin@demo.com', 'profesor@demo.com', 'profe2@demo.com', 'profe3@demo.com', 'alumno@demo.com');

-- ==========================================
-- 3. CREACIÓN DE TABLAS DEL SISTEMA
-- ==========================================

CREATE TABLE public.roles_whitelist (
    correo TEXT PRIMARY KEY,
    rol_asignado TEXT NOT NULL,
    codigo_invitacion TEXT NOT NULL UNIQUE
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    last_name TEXT,
    correo TEXT,
    role TEXT,
    rut TEXT,
    phone TEXT,
    especialidad TEXT,
    condicion_medica TEXT,
    sala_por_defecto TEXT,
    contacto_emergencia TEXT,
    ficha_medica TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.salas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.tipos_clase (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    icono TEXT
);

CREATE TABLE public.planes (
    id_plan UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_plan TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    creditos_clases INTEGER NOT NULL,
    duracion_dias INTEGER NOT NULL,
    disciplinas_incluidas TEXT,
    ventas INTEGER DEFAULT 0,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_suscripciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.planes(id_plan) ON DELETE RESTRICT,
    creditos_restantes INTEGER NOT NULL DEFAULT 0,
    fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_fin TIMESTAMP WITH TIME ZONE,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    suscripcion_id UUID NOT NULL REFERENCES public.user_suscripciones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL,
    metodo_pago TEXT NOT NULL,
    comprobante_url TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.plantillas_clase (
    id_plantilla UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    nombre_clase VARCHAR(100) NOT NULL,
    id_profesor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sala VARCHAR(100),
    cupo_maximo INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.clase (
    id_clase SERIAL PRIMARY KEY,
    id_profesor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    nombre_clase TEXT NOT NULL,
    cupo_maximo INTEGER DEFAULT 8,
    cupos_inscritos INTEGER DEFAULT 0,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    estado_clase TEXT DEFAULT 'programada',
    sala TEXT,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_usuario UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    id_clase INTEGER NOT NULL REFERENCES public.clase(id_clase) ON DELETE CASCADE,
    fecha_operacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado_reserva TEXT DEFAULT 'confirmada',
    UNIQUE(id_usuario, id_clase)
);

CREATE TABLE public.asistencia (
    id SERIAL PRIMARY KEY,
    id_reserva INTEGER NOT NULL REFERENCES public.reserva(id_reserva) ON DELETE CASCADE,
    asistio BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 4. POBLAMIENTO DE DATOS DE PRUEBA (POLE DANCE DEMO)
-- ==========================================

-- Whitelist
INSERT INTO public.roles_whitelist (correo, rol_asignado, codigo_invitacion) VALUES 
('admin@demo.com', 'administrador', '111111'),
('profesor@demo.com', 'profesor', '222222'),
('profe2@demo.com', 'profesor', '222223'),
('profe3@demo.com', 'profesor', '222224'),
('alumno@demo.com', 'alumno', '333333');

-- Autenticación
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"111111"}', now(), now()),
('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profesor@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"222222"}', now(), now()),
('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe2@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"222223"}', now(), now()),
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe3@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"222224"}', now(), now()),
('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alumno@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"333333"}', now(), now());

-- Perfiles
INSERT INTO public.profiles (id, name, last_name, correo, role, rut, phone, especialidad, condicion_medica) VALUES 
('a0000000-0000-0000-0000-000000000001', 'Coordinación', 'Admin', 'admin@demo.com', 'administrador', NULL, NULL, NULL, NULL),
('b0000000-0000-0000-0000-000000000002', 'Fernanda', 'Pánico', 'profesor@demo.com', 'profesor', '11111111-1', '+56911112222', 'Pole Dance y Exotic', NULL),
('b0000000-0000-0000-0000-000000000003', 'Valentina', 'Flex', 'profe2@demo.com', 'profesor', '33333333-3', '+56933334444', 'Flexibilidad', NULL),
('b0000000-0000-0000-0000-000000000004', 'Camila', 'Pole', 'profe3@demo.com', 'profesor', '44444444-4', '+56944445555', 'Pole Dance Básico', NULL),
('c0000000-0000-0000-0000-000000000003', 'María', 'Estudiante', 'alumno@demo.com', 'alumno', '22222222-2', '+56988887777', NULL, 'Alergia a penicilina');

-- Salas y Disciplinas
INSERT INTO public.salas (id, nombre) VALUES 
('11111111-0000-0000-0000-000000000001', 'Sala A (Principal)'),
('11111111-0000-0000-0000-000000000002', 'Sala B (Espejos)');

INSERT INTO public.tipos_clase (id, nombre, icono) VALUES 
('22222222-0000-0000-0000-000000000001', 'Pole Dance', 'accessibility_new'),
('22222222-0000-0000-0000-000000000002', 'Pole Exotic', 'star'),
('22222222-0000-0000-0000-000000000003', 'Flex', 'self_improvement');

-- Planes
INSERT INTO public.planes (id_plan, nombre_plan, descripcion, precio, creditos_clases, duracion_dias, disciplinas_incluidas, ventas) VALUES
('33333333-0000-0000-0000-000000000001', 'Plan 1 Clase Semanal', '4 Clases al mes', 35000, 4, 30, 'Todas', 1),
('33333333-0000-0000-0000-000000000002', 'Plan 2 Clases Semanales', '8 Clases al mes', 65000, 8, 30, 'Todas', 0),
('33333333-0000-0000-0000-000000000003', 'Plan Libre', 'Clases ilimitadas mensuales', 80000, 999, 30, 'Todas', 0);

-- Suscripciones y pagos
INSERT INTO public.user_suscripciones (id, user_id, plan_id, creditos_restantes, fecha_inicio, fecha_fin, estado) VALUES
('44444444-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 3, now(), now() + interval '30 days', 'activa');

INSERT INTO public.user_pagos (suscripcion_id, user_id, monto, metodo_pago, estado) VALUES
('44444444-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 35000, 'transferencia', 'aprobado');

-- Plantillas de Clases
INSERT INTO public.plantillas_clase (id_plantilla, dia_semana, hora_inicio, hora_fin, nombre_clase, id_profesor, sala, cupo_maximo) VALUES
('55555555-0000-0000-0000-000000000001', 1, '10:00:00', '11:00:00', 'Pole Exotic Coreografía', 'b0000000-0000-0000-0000-000000000002', 'Sala A (Principal)', 8),
('55555555-0000-0000-0000-000000000002', 1, '18:00:00', '19:00:00', 'Flexibilidad Activa', 'b0000000-0000-0000-0000-000000000003', 'Sala B (Espejos)', 10),
('55555555-0000-0000-0000-000000000003', 1, '19:30:00', '20:30:00', 'Pole Dance Básico', 'b0000000-0000-0000-0000-000000000004', 'Sala A (Principal)', 8);

-- Clases Reales
INSERT INTO public.clase (id_clase, id_profesor, nombre_clase, cupo_maximo, cupos_inscritos, fecha_hora_inicio, fecha_hora_fin, estado_clase, sala, descripcion) VALUES
(1, 'b0000000-0000-0000-0000-000000000002', 'Pole Exotic Coreografía', 8, 1, CURRENT_DATE + interval '1 day' + interval '10 hours', CURRENT_DATE + interval '1 day' + interval '11 hours', 'programada', 'Sala A (Principal)', 'Clase de Pole Exotic, recuerda llevar tus rodilleras y tacones. ¡Multinivel!'),
(2, 'b0000000-0000-0000-0000-000000000003', 'Flexibilidad Activa', 10, 0, CURRENT_DATE + interval '1 day' + interval '18 hours', CURRENT_DATE + interval '1 day' + interval '19 hours', 'programada', 'Sala B (Espejos)', 'Aumenta tu rango de movimiento con ejercicios activos.'),
(3, 'b0000000-0000-0000-0000-000000000004', 'Pole Dance Básico', 8, 0, CURRENT_DATE + interval '1 day' + interval '19 hours 30 minutes', CURRENT_DATE + interval '1 day' + interval '20 hours 30 minutes', 'programada', 'Sala A (Principal)', 'Aprende los fundamentos del Pole Dance desde cero.'),
(4, 'b0000000-0000-0000-0000-000000000002', 'Pole Exotic Coreografía', 8, 0, CURRENT_DATE + interval '2 days' + interval '10 hours', CURRENT_DATE + interval '2 days' + interval '11 hours', 'programada', 'Sala A (Principal)', 'Nueva coreografía semanal de Pole Exotic.');

-- Reservas
INSERT INTO public.reserva (id_usuario, id_clase, fecha_operacion, estado_reserva) VALUES
('c0000000-0000-0000-0000-000000000003', 1, now(), 'confirmada');

-- El script se ejecutó con éxito. ¡Listo para la Demo!
