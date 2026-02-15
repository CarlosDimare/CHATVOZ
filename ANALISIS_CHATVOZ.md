# Diagnóstico de inestabilidad y plan para chat de texto tipo GPT

## Hallazgos principales (por qué a veces falla, no responde o tarda)

1. **Inconsistencia en el uso de API key**
   - En `connect()` se valida `process.env.GEMINI_API_KEY`, pero al crear el cliente se usa `process.env.API_KEY`.
   - Aunque en `vite.config.ts` hoy ambas variables se mapean al mismo valor, esta dualidad es frágil y puede romperse al desplegar o refactorizar.

2. **Posible saturación por envío continuo de audio sin control de flujo**
   - En cada `onaudioprocess` se envía audio al backend en tiempo real sin throttling ni backpressure.
   - Si la red sube latencia o el navegador tiene carga alta, la cola puede crecer y provocar respuestas tardías o aparentemente congeladas.

3. **Uso de `ScriptProcessorNode` (deprecado) en hilo principal**
   - `createScriptProcessor` puede introducir jitter/latencia variable, especialmente en equipos con CPU limitada.
   - Esto explica sesiones donde la app responde rápido y otras donde se siente lenta.

4. **No hay timeout/retry en la conexión live**
   - Si el handshake queda colgado, la UI puede permanecer en `connecting` y el usuario percibe que “no responde”.

5. **Persistencia local no protegida**
   - `JSON.parse(localStorage.getItem('chat_history'))` no tiene protección ante JSON corrupto. Un valor inválido rompe la inicialización del hook.

6. **La UI principal no expone claramente el historial textual**
   - El hook sí arma transcripciones (`inputTranscription` / `outputTranscription`) pero en `App.tsx` no se renderiza `Transcript`.
   - Desde UX parece que “no respondió”, aunque sí llegó texto internamente.

## Plan de estabilización (priorizado)

### Fase 1: confiabilidad mínima (rápido)
- Unificar a **una sola variable** de API key (`GEMINI_API_KEY`) en todo el proyecto.
- Agregar **timeout de conexión** (ej. 10–15s) y botón de reintento.
- Añadir guardas con `try/catch` para lectura de `localStorage`.
- Mostrar en UI estado detallado: “capturando audio”, “esperando modelo”, “reproduciendo respuesta”.

### Fase 2: rendimiento de audio
- Migrar de `ScriptProcessorNode` a `AudioWorklet`.
- Implementar **throttling/backpressure** para `sendRealtimeInput`.
- Definir chunk fijo (20–40 ms) y descartar audio viejo en congestión.

### Fase 3: observabilidad
- Registrar métricas cliente: tiempo a primer token/primer audio, RTT promedio, errores de sesión y reconexión.
- Mostrar un panel de debug opcional para soporte.

## Plan para agregar chat de texto estilo GPT

### Objetivo de UX
Interfaz con:
- Columna de conversaciones (historial)
- Panel central de mensajes
- Caja de texto con Enter para enviar / Shift+Enter salto de línea
- Streaming de respuesta token a token
- Reintentar, editar y reenviar último mensaje

### Arquitectura propuesta

1. **Nuevo estado de conversaciones**
   - `conversations: Conversation[]`
   - `activeConversationId`
   - Persistencia local versionada (`chat_history_v2`).

2. **Separar canal voz y canal texto**
   - Mantener hook live para voz.
   - Crear `useTextChatApi` (request/response o streaming) para texto puro.
   - Unificar ambos en un `useChatSession` para compartir historial/contexto.

3. **Modelo de mensajes robusto**
   - `status` por mensaje: `sending | streaming | complete | error`
   - `metadata`: latencia, fuentes, modelo usado.

4. **Streaming de texto**
   - Render incremental de tokens.
   - Cancelación de generación en curso.

5. **Context window management**
   - Resumen automático al superar N mensajes.
   - Estrategia “last K + summary”.

6. **Controles tipo GPT**
   - Regenerate response
   - Editar prompt y reenviar
   - Copiar respuesta
   - Exportar conversación

7. **Testing y calidad**
   - Unit tests para reducer de conversaciones.
   - Pruebas de integración para envío, streaming, error y retry.
   - Smoke test E2E: crear chat, enviar mensaje, recibir respuesta.

## Entregables sugeridos por sprint

- **Sprint 1:** estabilidad base + transcript visible + estados de conexión.
- **Sprint 2:** chat de texto funcional (sin streaming avanzado).
- **Sprint 3:** streaming completo + edición/retry + sidebar de conversaciones.
- **Sprint 4:** optimización, métricas y pulido UX.
