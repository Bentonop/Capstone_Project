# Modelo Arquitectónico 4+1 de Kruchten · Sistema "Cuerpo y Alma"
**Asignatura:** Proyecto Capstone (PTY4614) · Duoc UC  
**Equipo:** José Rivera, Benjamín García, Manuel Campos  
**Docente Guía:** Reginaldo Salinas  

Este documento reúne las 5 vistas completas del **Modelo 4+1 de Kruchten** para la plataforma web de la academia de Pole Dance **"Cuerpo y Alma"**. Cada vista incluye su definición conceptual, el diagrama formal en código Mermaid (listo para copiar y pegar en [Mermaid Live Editor](https://mermaid.live/), [Notion](https://notion.so) o [GitHub](https://github.com)) y su justificación técnica en el proyecto.

---

## Índice de Vistas

1. [Vista Lógica (Logical View)](#1-vista-lógica-logical-view)
2. [Vista de Desarrollo o Implementación (Development View)](#2-vista-de-desarrollo-o-implementación-development-view)
3. [Vista de Procesos (Process View)](#3-vista-de-procesos-process-view)
4. [Vista Física o de Despliegue (Physical View)](#4-vista-física-o-de-despliegue-physical-view)
5. [Escenarios / Casos de Uso (El "+1")](#5-escenarios-casos-de-uso-el-1)

---

## 1. Vista Lógica (Logical View)

### Propósito
Representa la estructura estática interna, las entidades del dominio, sus atributos, métodos y cardinalidades. Modela cómo el sistema da soporte a las reglas del negocio: perfiles de usuario (RBAC), control estricto de 8 cupos por clase, desacoplamiento financiero de suscripciones y transacciones de pago, y registro de asistencias presenciales.

### Código Mermaid (`classDiagram`)
```mermaid
classDiagram
    class Profile {
        +UUID id
        +String name
        +String last_name
        +String rut
        +String correo
        +String phone
        +String role
        +String condicion_medica
        +String contacto_emergencia
        +actualizarPerfil()
        +consultarRol() String
    }

    class Clase {
        +int id_clase
        +UUID id_profesor
        +String nombre_clase
        +int cupo_maximo
        +int cupos_inscritos
        +DateTime fecha_hora_inicio
        +DateTime fecha_hora_fin
        +String estado_clase
        +String sala
        +verificarCupoDisponible() bool
        +incrementarInscritos()
        +cancelarSesion()
    }

    class Reserva {
        +int id_reserva
        +UUID id_usuario
        +int id_clase
        +DateTime fecha_operacion
        +String estado_reserva
        +confirmarReserva()
        +anularReserva()
    }

    class Asistencia {
        +int id_asistencia
        +int id_reserva
        +String metodo_ingreso
        +String token_qr_usado
        +DateTime fecha_hora_ingreso
        +validarToken() bool
        +registrarIngresoManual()
    }

    class Plan {
        +UUID id_plan
        +String nombre_plan
        +numeric precio
        +int creditos_clases
        +int duracion_dias
        +bool estado
        +activarPlan()
    }

    class UserSuscripcion {
        +UUID id
        +UUID user_id
        +UUID plan_id
        +int creditos_restantes
        +DateTime fecha_inicio
        +DateTime fecha_fin
        +String estado
        +descontarCredito() bool
        +restituirCredito()
    }

    class UserPago {
        +UUID id
        +UUID suscripcion_id
        +UUID user_id
        +numeric monto
        +String metodo_pago
        +String comprobante_url
        +String estado
        +aprobarPago()
        +rechazarPago()
    }

    Profile "1" <-- "0..*" Clase : profesor_asignado
    Profile "1" <-- "0..*" Reserva : alumna_reserva
    Clase "1" <-- "0..*" Reserva : sesiones_agendadas
    Reserva "1" <-- "0..1" Asistencia : valida_ingreso
    Profile "1" <-- "0..*" UserSuscripcion : contrata
    Plan "1" <-- "0..*" UserSuscripcion : especifica
    UserSuscripcion "1" <-- "0..*" UserPago : audita_comprobante
```

---

## 2. Vista de Desarrollo o Implementación (Development View)

### Propósito
Muestra la organización del código fuente en módulos, paquetes y capas dentro del entorno de desarrollo de Next.js y Supabase. Ilustra la separación en capas de presentación (Client Components Stitch), servicios de negocio desacoplados (`lib/`), acceso a datos y políticas de seguridad RLS en PostgreSQL.

### Código Mermaid (`flowchart TD`)
```mermaid
flowchart TD
    subgraph CapaPresentacion ["Capa de Presentacion (Next.js & React App Router)"]
        UI_Alumna["Modulo Alumna (Catalogo, Reservas, Pase QR)"]
        UI_Docente["Modulo Docente (Nomina, Escaner QR, Pase Manual)"]
        UI_Admin["Modulo Admin (Gestion Clases, Conciliacion Pagos)"]
        UI_Shared["Componentes UI Compartidos (Stitch UI, BottomSheet, Toasts)"]
    end

    subgraph CapaServicios ["Capa de Negocio y Logica de Dominio (src/lib/)"]
        S_Auth["Servicio Auth (auth.ts, SessionProvider)"]
        S_Reservas["Servicio Reservas (reservas.ts - Regla 8 cupos)"]
        S_Asistencia["Servicio Asistencia (asistencia.ts - Token 300s)"]
        S_Pagos["Servicio Pagos (pagos.ts - Comprobantes)"]
        S_Admin["Servicio Clases (clases_admin.ts - deleteCascade)"]
    end

    subgraph CapaAccesoDatos ["Capa de Acceso a Datos y Middleware"]
        SupabaseClient["Supabase Client (SSR / Client-Side Queries)"]
        Middleware["Next.js Middleware (Rutas Protegidas & RBAC)"]
    end

    subgraph CapaPersistencia ["Capa de Persistencia (Supabase Cloud BaaS)"]
        DB_Core["PostgreSQL Core (profiles, clase, reserva, asistencia)"]
        DB_Finance["PostgreSQL Finanzas (planes, user_suscripciones, user_pagos)"]
        Auth_Service["Supabase Auth (JWT, OAuth, Whitelist Trigger)"]
        Storage_Bucket["Supabase Storage (Comprobantes Bancarios)"]
    end

    UI_Alumna --> S_Reservas
    UI_Alumna --> S_Asistencia
    UI_Docente --> S_Asistencia
    UI_Admin --> S_Pagos
    UI_Admin --> S_Admin
    UI_Shared --> S_Auth

    S_Auth --> Middleware
    S_Reservas --> SupabaseClient
    S_Asistencia --> SupabaseClient
    S_Pagos --> SupabaseClient
    S_Admin --> SupabaseClient

    Middleware --> Auth_Service
    SupabaseClient --> DB_Core
    SupabaseClient --> DB_Finance
    SupabaseClient --> Storage_Bucket
```

---

## 3. Vista de Procesos (Process View)

### Propósito
Describe la dinámica de ejecución concurrente, la sincronización entre actores y componentes, y la consistencia transaccional. Modela el agendamiento con bloqueo atómico para garantizar que nunca se supere el aforo de 8 barras, la generación del Pase QR seguro y la verificación presencial (con su respectiva contingencia manual).

### Código Mermaid (`sequenceDiagram`)
```mermaid
sequenceDiagram
    autonumber
    actor Alumna as Alumna (App Movil)
    participant Front as Frontend (Next.js)
    participant API as Backend (Supabase API)
    participant DB as PostgreSQL (Transaccion)
    actor Docente as Docente (Panel)

    Note over Alumna, DB: Proceso Concurrente de Agendamiento (Tope 8 Cupos)
    Alumna->>Front: Selecciona clase presencial (viernes 18:00) y pulsa Reservar
    Front->>API: POST /reservas {userId, claseId}
    API->>DB: BEGIN TRANSACTION (Bloqueo atomico de fila)
    DB->>DB: SELECT cupos_inscritos, cupo_maximo FROM clase WHERE id = 12
    alt Cupos < 8 y sin reserva previa
        DB->>DB: INSERT INTO reserva (id_usuario, id_clase, estado)
        DB->>DB: UPDATE clase SET cupos_inscritos = cupos_inscritos + 1
        DB->>API: COMMIT TRANSACTION (Operacion exitosa)
        API-->>Front: HTTP 201 Creado {id_reserva: 104, cupos: 4/8}
        Front-->>Alumna: Toast Reserva Confirmada y actualiza aforo a 4/8
    else Aforo Completo (8/8) o Reserva Duplicada
        DB->>API: ROLLBACK (Excepcion regla RN-01)
        API-->>Front: HTTP 409 Conflicto {error: Cupos agotados}
        Front-->>Alumna: Alerta Cupos Agotados (8/8)
    end

    Note over Alumna, Docente: Validacion Presencial con QR Dinamico o Contingencia
    Alumna->>Front: Solicita Pase Digital en recepción
    Front->>Front: Genera token dinamico con hash y exp. 300s
    Alumna->>Docente: Presenta codigo QR en recepcion
    alt Camara fisica operativa en sala
        Docente->>Front: Escanea QR con lector web (MediaDevices)
        Front->>API: POST /asistencia/validar {token, metodo: qr_dinamico}
        API->>DB: INSERT INTO asistencia (id_reserva, fecha, metodo)
        API-->>Docente: Check verde Asistencia confirmada
    else Falla de hardware o baja luz
        Docente->>Front: Abre modal contingencia e ingresa PIN de 4 digitos
        Front->>API: POST /asistencia/validar {id_reserva, pin, metodo: manual}
        API->>DB: INSERT INTO asistencia (metodo: manual_profesor)
        API-->>Docente: Check verde Asistencia manual validada
    end
```

---

## 4. Vista Física o de Despliegue (Physical View)

### Propósito
Mapea los componentes de software en los nodos de hardware e infraestructura cloud real. Detalla la topología de red distribuida, protocolos de comunicación seguros (HTTPS/TLS 1.3), la red de distribución en el borde (Vercel Edge Network) y los servicios de base de datos dedicados en Supabase Cloud (AWS).

### Código Mermaid (`flowchart LR`)
```mermaid
flowchart LR
    subgraph ClientesDispositivos ["Nivel de Clientes (Dispositivos Fisicos)"]
        MobileAlumna["Smartphone Alumna (Android / iOS)<br/>Navegador Web Mobile (PWA)"]
        TabletDocente["Tablet / Smartphone Docente<br/>Camara Web Integrada"]
        PCAdmin["Laptop / PC Administrador<br/>Navegador Web Desktop"]
    end

    subgraph RedCDN ["Nivel de Red y Borde (Edge Infrastructure)"]
        DNS_SSL["Cloudflare / DNS<br/>Certificado TLS 1.3 / HTTPS"]
        VercelEdge["Vercel Edge Network<br/>Distribucion CDN Global"]
    end

    subgraph ServidorAplicacion ["Nivel de Servidores de Aplicacion"]
        NextServer["Next.js Application Server<br/>Node.js Runtime / Serverless Functions"]
    end

    subgraph PlataformaCloud ["Nivel de Datos y BaaS (Supabase Cloud)"]
        PostgresInstance["Instancia PostgreSQL 15<br/>Dedicated Cloud Server (AWS us-east-1)<br/>Tables, RLS, Triggers, Views"]
        AuthMicroservice["GoTrue Auth Service<br/>Manejo JWT / Sesiones HttpOnly"]
        StorageCluster["Supabase Storage Engine<br/>Cluster S3 (Comprobantes bancarios)"]
    end

    MobileAlumna -->|HTTPS / Port 443| DNS_SSL
    TabletDocente -->|HTTPS / Port 443| DNS_SSL
    PCAdmin -->|HTTPS / Port 443| DNS_SSL

    DNS_SSL --> VercelEdge
    VercelEdge --> NextServer

    NextServer -->|pg connection pooling / Port 5432 / 6543| PostgresInstance
    NextServer -->|REST / HTTPS Port 443| AuthMicroservice
    NextServer -->|REST / HTTPS Port 443| StorageCluster
```

---

## 5. Escenarios / Casos de Uso (El "+1")

### Propósito
Constituye el núcleo del modelo 4+1, validando y unificando las cuatro vistas anteriores a través de los casos de uso más representativos del negocio. Conecta a los tres actores clave (Alumna, Docente, Administrador) con los flujos críticos de la academia "Cuerpo y Alma".

### Código Mermaid (`flowchart LR`)
```mermaid
flowchart LR
    %% Actores
    Alumna((Alumna))
    Profesor((Profesor))
    Admin((Administrador))

    subgraph Sistema ["Sistema Web Integral Cuerpo y Alma"]
        CU01["CU-01: Autenticarse e iniciar sesion"]
        CU02["CU-02: Consultar agenda y reservar clase (Tope 8 cupos)"]
        CU03["CU-03: Cancelar reserva (Regla 4 horas)"]
        CU04["CU-04: Generar Pase QR dinamico (300s)"]
        CU05["CU-05: Consultar nomina de participantes por clase"]
        CU06["CU-06: Validar asistencia presencial por escaner QR"]
        CU07["CU-07: Validar asistencia manual con PIN docente"]
        CU08["CU-08: Cargar comprobante de pago por transferencia"]
        CU09["CU-09: Conciliar y aprobar pagos de membresias"]
        CU10["CU-10: Crear y eliminar clases en cascada (deleteCascade)"]
    end

    Alumna --> CU01
    Alumna --> CU02
    Alumna --> CU03
    Alumna --> CU04
    Alumna --> CU08

    Profesor --> CU01
    Profesor --> CU05
    Profesor --> CU06
    Profesor --> CU07

    Admin --> CU01
    Admin --> CU09
    Admin --> CU10

    CU02 -.->|include| CU01
    CU06 -.->|extend| CU07
    CU09 -.->|actualiza creditos| CU02
```

---

## Instrucciones para Renderizar en una Página Externa

1. **En [Mermaid Live Editor](https://mermaid.live/):**
   * Abre la página en tu navegador.
   * Selecciona el código de cualquiera de las 5 vistas anteriores y pégalo en el panel izquierdo.
   * Podrás ver el diagrama renderizado en tiempo real y exportarlo en formato **PNG**, **SVG** o enlace directo.

2. **En [PlantText / PlantUML](https://www.planttext.com/) o [Draw.io](https://app.diagrams.net/):**
   * En draw.io: Ve a `Organizar` > `Insertar` > `Avanzado` > `Mermaid`, pega el código y presiona `Insertar`.
