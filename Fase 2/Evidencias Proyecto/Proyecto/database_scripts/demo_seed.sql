-- ==========================================
-- ELIMINAR FANTASMAS VIEJOS
-- ==========================================
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ==========================================
-- SCRIPT DE RESETEO Y DEMO (BORRÓN Y CUENTA NUEVA)
-- ==========================================

-- 1. LIMPIEZA TOTAL (En orden inverso a las dependencias)
DELETE FROM public.asistencia;
DELETE FROM public.reserva;
DELETE FROM public.clase;
DELETE FROM public.plantillas_clase;
DELETE FROM public.user_pagos;
DELETE FROM public.user_suscripciones;
DELETE FROM public.planes;
DELETE FROM public.tipos_clase;
DELETE FROM public.salas;

-- Borramos los perfiles y luego los usuarios de autenticación
DELETE FROM public.profiles;
DELETE FROM auth.users;

DELETE FROM public.roles_whitelist;

-- ==========================================
-- 2. CREACIÓN DE USUARIOS DEMO
-- ==========================================
-- Primero agregamos a la whitelist para que el trigger los deje pasar
INSERT INTO public.roles_whitelist (correo, rol_asignado, codigo_invitacion) VALUES 
('admin@demo.com', 'administrador', '111111'),
('profesor@demo.com', 'profesor', '222222'),
('profe2@demo.com', 'profesor', '222223'),
('profe3@demo.com', 'profesor', '222224'),
('alumno@demo.com', 'alumno', '333333');

-- Insertamos en auth.users (la contraseña para todos será: 123456)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"111111"}', now(), now()),
('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profesor@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"222222"}', now(), now()),
('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe2@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"222223"}', now(), now()),
('b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profe3@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"222224"}', now(), now()),
('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alumno@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"invite_code":"333333"}', now(), now());

-- Si el trigger no creó los perfiles (o lo borramos), los creamos a mano con UPSERT
INSERT INTO public.profiles (id, name, last_name, correo, role, rut, phone, especialidad, condicion_medica, contacto_emergencia) VALUES 
('a0000000-0000-0000-0000-000000000001', 'Coordinación', 'Admin', 'admin@demo.com', 'administrador', NULL, NULL, NULL, NULL, NULL),
('b0000000-0000-0000-0000-000000000002', 'Fernanda', 'Pánico', 'profesor@demo.com', 'profesor', '11111111-1', '+56911112222', 'Pole Dance y Exotic', NULL, NULL),
('b0000000-0000-0000-0000-000000000003', 'Valentina', 'Flex', 'profe2@demo.com', 'profesor', '33333333-3', '+56933334444', 'Flexibilidad', NULL, NULL),
('b0000000-0000-0000-0000-000000000004', 'Camila', 'Pole', 'profe3@demo.com', 'profesor', '44444444-4', '+56944445555', 'Pole Dance Básico', NULL, NULL),
('c0000000-0000-0000-0000-000000000003', 'María', 'Estudiante', 'alumno@demo.com', 'alumno', '22222222-2', '+56988887777', NULL, 'Alergia a penicilina', 'Mamá: +569 9999 8888')
ON CONFLICT (id) DO UPDATE SET 
name = EXCLUDED.name, 
last_name = EXCLUDED.last_name, 
rut = EXCLUDED.rut, 
phone = EXCLUDED.phone, 
especialidad = EXCLUDED.especialidad, 
condicion_medica = EXCLUDED.condicion_medica,
contacto_emergencia = EXCLUDED.contacto_emergencia;

-- ==========================================
-- 3. CREACIÓN DE SALAS Y DISCIPLINAS
-- ==========================================
INSERT INTO public.salas (id, nombre) VALUES 
('11111111-0000-0000-0000-000000000001', 'Sala A (Principal)'),
('11111111-0000-0000-0000-000000000002', 'Sala B (Espejos)');

INSERT INTO public.tipos_clase (id, nombre, icono) VALUES 
('22222222-0000-0000-0000-000000000001', 'Pole Dance', 'accessibility_new'),
('22222222-0000-0000-0000-000000000002', 'Pole Exotic', 'star'),
('22222222-0000-0000-0000-000000000003', 'Flex', 'self_improvement');

-- ==========================================
-- 4. CREACIÓN DE PLANES
-- ==========================================
INSERT INTO public.planes (id_plan, nombre_plan, descripcion, precio, creditos_clases, duracion_dias, disciplinas_incluidas, ventas) VALUES
('33333333-0000-0000-0000-000000000001', 'Plan 1 Clase Semanal', '4 Clases al mes', 35000, 4, 30, 'Todas', 1),
('33333333-0000-0000-0000-000000000002', 'Plan 2 Clases Semanales', '8 Clases al mes', 65000, 8, 30, 'Todas', 0),
('33333333-0000-0000-0000-000000000003', 'Plan Libre', 'Clases ilimitadas mensuales', 80000, 999, 30, 'Todas', 0);

-- Asignar suscripción al alumno de prueba
INSERT INTO public.user_suscripciones (id, user_id, plan_id, creditos_restantes, fecha_inicio, fecha_fin, estado) VALUES
('44444444-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 4, now(), now() + interval '30 days', 'activa');

-- Generar un pago aprobado para esa suscripción
INSERT INTO public.user_pagos (suscripcion_id, user_id, monto, metodo_pago, estado) VALUES
('44444444-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 35000, 'transferencia', 'aprobado');

-- ==========================================
-- 5. CREACIÓN DE CLASES (PLANTILLAS Y HORARIOS)
-- ==========================================
-- Insertar plantillas (todos los lunes)
INSERT INTO public.plantillas_clase (id_plantilla, dia_semana, hora_inicio, hora_fin, nombre_clase, id_profesor, sala, cupo_maximo) VALUES
('55555555-0000-0000-0000-000000000001', 1, '10:00:00', '11:00:00', 'Pole Exotic Coreografía', 'b0000000-0000-0000-0000-000000000002', 'Sala A (Principal)', 8),
('55555555-0000-0000-0000-000000000002', 1, '18:00:00', '19:00:00', 'Flexibilidad Activa', 'b0000000-0000-0000-0000-000000000003', 'Sala B (Espejos)', 10),
('55555555-0000-0000-0000-000000000003', 1, '19:30:00', '20:30:00', 'Pole Dance Básico', 'b0000000-0000-0000-0000-000000000004', 'Sala A (Principal)', 8);

-- Insertar clases reales para mañana y pasado mañana
INSERT INTO public.clase (id_clase, id_profesor, nombre_clase, cupo_maximo, cupos_inscritos, fecha_hora_inicio, fecha_hora_fin, estado_clase, sala, descripcion) VALUES
(1, 'b0000000-0000-0000-0000-000000000002', 'Pole Exotic Coreografía', 8, 1, CURRENT_DATE + interval '1 day' + interval '10 hours', CURRENT_DATE + interval '1 day' + interval '11 hours', 'programada', 'Sala A (Principal)', 'Clase de Pole Exotic, recuerda llevar tus rodilleras y tacones. ¡Multinivel!'),
(2, 'b0000000-0000-0000-0000-000000000003', 'Flexibilidad Activa', 10, 0, CURRENT_DATE + interval '1 day' + interval '18 hours', CURRENT_DATE + interval '1 day' + interval '19 hours', 'programada', 'Sala B (Espejos)', 'Aumenta tu rango de movimiento con ejercicios activos.'),
(3, 'b0000000-0000-0000-0000-000000000004', 'Pole Dance Básico', 8, 0, CURRENT_DATE + interval '1 day' + interval '19 hours 30 minutes', CURRENT_DATE + interval '1 day' + interval '20 hours 30 minutes', 'programada', 'Sala A (Principal)', 'Aprende los fundamentos del Pole Dance desde cero.'),
(4, 'b0000000-0000-0000-0000-000000000002', 'Pole Exotic Coreografía', 8, 0, CURRENT_DATE + interval '2 days' + interval '10 hours', CURRENT_DATE + interval '2 days' + interval '11 hours', 'programada', 'Sala A (Principal)', 'Nueva coreografía semanal de Pole Exotic.');

-- Reservar al alumno en la clase de mañana (Exotic Coreografía de las 10:00)
INSERT INTO public.reserva (id_usuario, id_clase, fecha_operacion, estado_reserva) VALUES
('c0000000-0000-0000-0000-000000000003', 1, now(), 'confirmada');

-- Descontar 1 crédito por la reserva
UPDATE public.user_suscripciones SET creditos_restantes = 3 WHERE id = '44444444-0000-0000-0000-000000000001';
