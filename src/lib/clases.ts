import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Elimina una o más clases de la base de datos de manera segura y en cascada,
 * eliminando previamente sus asistencias, reservas y notificaciones asociadas,
 * y reembolsando los créditos a los alumnos si tenían reservas activas.
 */
export async function deleteClassesCascade(
  supabase: SupabaseClient,
  claseIdsInput: number | number[]
): Promise<void> {
  const claseIds = (Array.isArray(claseIdsInput) ? claseIdsInput : [claseIdsInput]).filter(Boolean);
  if (claseIds.length === 0) return;

  try {
    // 1. Obtener todas las reservas de estas clases
    const { data: reservas, error: errFetchRes } = await supabase
      .from('reserva')
      .select('id_reserva, id_usuario')
      .in('id_clase', claseIds);

    if (errFetchRes) {
      console.warn("Error al consultar reservas previas:", errFetchRes);
    }

    if (reservas && reservas.length > 0) {
      const reservaIds = reservas.map((r: any) => r.id_reserva);

      // 1.1 Eliminar asistencias vinculadas a estas reservas
      const { error: errAsistencia } = await supabase
        .from('asistencia')
        .delete()
        .in('id_reserva', reservaIds);

      if (errAsistencia) {
        console.warn("Advertencia al eliminar asistencias:", errAsistencia);
      }

      // 1.2 Reembolsar crédito a cada alumno afectado
      for (const res of reservas) {
        if (res.id_usuario) {
          try {
            const { data: sub } = await supabase
              .from('user_suscripciones')
              .select('id, creditos_restantes')
              .eq('user_id', res.id_usuario)
              .eq('estado', 'activa')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (sub) {
              await supabase
                .from('user_suscripciones')
                .update({ creditos_restantes: (sub.creditos_restantes || 0) + 1 })
                .eq('id', sub.id);
            }
          } catch (refundErr) {
            console.warn("Error al reembolsar crédito a usuario:", res.id_usuario, refundErr);
          }
        }
      }

      // 1.3 Eliminar las reservas
      const { error: errRes } = await supabase
        .from('reserva')
        .delete()
        .in('id_clase', claseIds);

      if (errRes) {
        console.error("Error al eliminar reservas:", errRes);
        throw errRes;
      }
    }

    // 2. Eliminar notificaciones vinculadas a estas clases
    const { error: errNotif } = await supabase
      .from('notificaciones')
      .delete()
      .in('clase_id', claseIds);

    if (errNotif) {
      console.warn("Advertencia al eliminar notificaciones:", errNotif);
    }

    // 3. Eliminar los registros de la tabla clase
    const { error: errClase } = await supabase
      .from('clase')
      .delete()
      .in('id_clase', claseIds);

    if (errClase) {
      console.error("Error al eliminar clase(s):", errClase);
      throw errClase;
    }
  } catch (err) {
    console.error("Error en deleteClassesCascade:", err);
    throw err;
  }
}
