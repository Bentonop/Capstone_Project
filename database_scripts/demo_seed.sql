-- ==========================================
-- SCRIPT DE RESETEO Y DEMO (BORRÓN Y CUENTA NUEVA)
-- ==========================================
-- ADVERTENCIA: ESTE SCRIPT BORRARÁ TODA LA INFORMACIÓN DE TU BASE DE DATOS.
-- Ejecútalo solo si estás seguro de que quieres empezar desde cero con datos de prueba.

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

-- Desactivar el trigger temporalmente para poder borrar usuarios sin problemas
ALTER TABLE auth.users DISABLE TRIGGER ALL;
DELETE FROM public.profiles;
DELETE FROM auth.users;
ALTER TABLE auth.users ENABLE TRIGGER ALL;

DELETE FROM public.roles_whitelist;

-- ==========================================
-- 2. CREACIÓN DE USUARIOS DEMO
-- ==========================================
-- Primero agregamos a la whitelist para que el trigger los deje pasar
INSERT INTO public.roles_whitelist (correo, rol_asignado) VALUES 
('admin@demo.com', 'administrador'),
('profesor@demo.com', 'profesor'),
('alumno@demo.com', 'alumno');

-- Insertamos en auth.users (la contraseña para todos será: 123456)
-- El trigger on_auth_user_created se encargará de crear sus registros en "profiles" automáticamente.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
('p0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profesor@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
('u0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alumno@demo.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

-- Actualizamos los perfiles (que fueron creados por el trigger) con nombres reales
UPDATE public.profiles SET name = 'Coordinación', last_name = 'Admin' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET name = 'Sebastián', last_name = 'Docente', rut = '11111111-1', phone = '+56911112222', especialidad = 'Zumba y Pilates' WHERE id = 'p0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET name = 'María', last_name = 'Estudiante', rut = '22222222-2', phone = '+56988887777', condicion_medica = 'Alergia a penicilina' WHERE id = 'u0000000-0000-0000-0000-000000000003';

-- ==========================================
-- 3. CREACIÓN DE SALAS Y DISCIPLINAS
-- ==========================================
INSERT INTO public.salas (id, nombre) VALUES 
('s1000000-0000-0000-0000-000000000001', 'Sala A (Principal)'),
('s2000000-0000-0000-0000-000000000002', 'Sala B (Espejos)');

INSERT INTO public.tipos_clase (id, nombre, icono) VALUES 
('t1000000-0000-0000-0000-000000000001', 'Zumba', 'directions_run'),
('t2000000-0000-0000-0000-000000000002', 'Pilates', 'self_improvement');

-- ==========================================
-- 4. CREACIÓN DE PLANES
-- ==========================================
INSERT INTO public.planes (id_plan, nombre_plan, descripcion, precio, creditos_clases, duracion_dias, disciplinas_incluidas, ventas) VALUES
('pl100000-0000-0000-0000-000000000001', 'Plan Básico', '4 Clases al mes', 25000, 4, 30, 'Zumba, Pilates', 1),
('pl200000-0000-0000-0000-000000000002', 'Plan Ilimitado', 'Clases ilimitadas mensuales', 45000, 999, 30, 'Todas', 0);

-- Asignar suscripción al alumno de prueba
INSERT INTO public.user_suscripciones (id, user_id, plan_id, creditos_restantes, fecha_inicio, fecha_fin, estado) VALUES
('sus00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'pl100000-0000-0000-0000-000000000001', 4, now(), now() + interval '30 days', 'activa');

-- Generar un pago aprobado para esa suscripción
INSERT INTO public.user_pagos (suscripcion_id, user_id, monto, metodo_pago, estado) VALUES
('sus00000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 25000, 'transferencia', 'aprobado');

-- ==========================================
-- 5. CREACIÓN DE CLASES (PLANTILLAS Y HORARIOS)
-- ==========================================
-- Insertar plantilla (todos los lunes a las 10:00 AM)
INSERT INTO public.plantillas_clase (id_plantilla, dia_semana, hora_inicio, hora_fin, nombre_clase, id_profesor, sala, cupo_maximo) VALUES
('ptl00000-0000-0000-0000-000000000001', 1, '10:00:00', '11:00:00', 'Zumba Energy', 'p0000000-0000-0000-0000-000000000002', 'Sala A (Principal)', 8);

-- Insertar una clase real para mañana
INSERT INTO public.clase (id_clase, id_profesor, nombre_clase, cupo_maximo, cupos_inscritos, fecha_hora_inicio, fecha_hora_fin, estado_clase, sala, descripcion) VALUES
(1, 'p0000000-0000-0000-0000-000000000002', 'Zumba Energy', 8, 1, CURRENT_DATE + interval '1 day' + interval '10 hours', CURRENT_DATE + interval '1 day' + interval '11 hours', 'programada', 'Sala A (Principal)', 'Clase de alta intensidad para quemar calorías.');

-- Reservar al alumno en la clase de mañana
INSERT INTO public.reserva (id_usuario, id_clase, fecha_operacion, estado_reserva) VALUES
('u0000000-0000-0000-0000-000000000003', 1, now(), 'confirmada');

-- Descontar 1 crédito por la reserva
UPDATE public.user_suscripciones SET creditos_restantes = 3 WHERE id = 'sus00000-0000-0000-0000-000000000001';

-- Fin del script! Todo listo para la demo.
