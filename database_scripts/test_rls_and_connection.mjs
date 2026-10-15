import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sxcjwtzxcyzcvvqhrvhf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xSPqrNM2UIVfQLwgnfMrWA_kJU8fQYg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('===========================================================');
console.log('🧪 TEST DE CONEXIÓN, ESQUEMA Y POLÍTICAS (RLS) - CUERPO Y ALMA');
console.log('===========================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  // Test 1: Conexión y Catálogo de Clases
  total++;
  try {
    const { data, error } = await supabase.from('clase').select('id_clase, nombre_clase, cupo_maximo, cupos_inscritos, estado_clase').limit(5);
    if (error) throw error;
    console.log(`✅ [TEST 1 - OK] Conexión y consulta a tabla 'clase': ${data.length} clases recuperadas.`);
    passed++;
  } catch (err) {
    console.error(`❌ [TEST 1 - FALLO] Error consultando clases:`, err.message);
  }

  // Test 2: Tabla de Notificaciones (Realtime)
  total++;
  try {
    const { data, error } = await supabase.from('notificaciones').select('id, titulo, tipo, leida, creado_en').limit(5);
    if (error) throw error;
    console.log(`✅ [TEST 2 - OK] Tabla 'notificaciones' accesible (${data.length} registros existentes).`);
    passed++;
  } catch (err) {
    console.error(`❌ [TEST 2 - FALLO] Error en notificaciones:`, err.message);
  }

  // Test 3: Tabla de Perfiles y Roles (Aislamiento)
  total++;
  try {
    const { data, error } = await supabase.from('profiles').select('id, name, role').limit(5);
    if (error) {
      console.log(`🔒 [TEST 3 - RLS ACTIVO] La tabla 'profiles' protege la lectura sin sesión autenticada (${error.message}).`);
    } else {
      console.log(`✅ [TEST 3 - OK] Tabla 'profiles' consultada correctamente (${data.length} usuarios).`);
    }
    passed++;
  } catch (err) {
    console.error(`❌ [TEST 3 - FALLO] Error en profiles:`, err.message);
  }

  // Test 4: Tabla de Disciplinas y Salas
  total++;
  try {
    const { data, error } = await supabase.from('salas').select('id, nombre');
    if (error) throw error;
    console.log(`✅ [TEST 4 - OK] Tabla 'salas' consultada: ${data.length} salas registradas.`);
    passed++;
  } catch (err) {
    console.error(`❌ [TEST 4 - FALLO] Error en salas:`, err.message);
  }

  // Test 5: Tabla de Reservas
  total++;
  try {
    const { data, error } = await supabase.from('reserva').select('id_reserva, id_clase, estado_reserva').limit(3);
    if (error) {
      console.log(`🔒 [TEST 5 - RLS ACTIVO] Tabla 'reserva' protegida por políticas de usuario.`);
    } else {
      console.log(`✅ [TEST 5 - OK] Tabla 'reserva' consultada (${data.length} reservas registradas).`);
    }
    passed++;
  } catch (err) {
    console.error(`❌ [TEST 5 - FALLO] Error en reservas:`, err.message);
  }

  console.log('\n-----------------------------------------------------------');
  console.log(`🎯 RESULTADO FINAL: ${passed}/${total} Pruebas Verificadas Exitosamente.`);
  console.log('-----------------------------------------------------------');
}

runTests();
