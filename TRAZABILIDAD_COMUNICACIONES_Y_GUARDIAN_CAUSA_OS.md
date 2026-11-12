# Trazabilidad Oficial: Canal Único `no-reply@crearpsl.net` y Guardián Autónomo 3H — Causa OS

**Última actualización:** 12 de noviembre de 2026  
**Plataforma:** Causa OS (`https://centro-operativo-cpsl.web.app`) · Cartas & Contratos (`https://cartas.crearpsl.net`)  
**Proyecto Firebase:** `centro-operativo-cpsl` · **Caja Negra Maestra:** `CAJA_NEGRA_OPERATIVA.md` (Sección 19)

---

## 1. Canal Oficial Único de Comunicaciones (`no-reply@crearpsl.net`)

A partir de esta actualización, **todas** las comunicaciones transaccionales, operativas y de acreditación emitidas por **Causa OS** utilizan como canal oficial único:

- **Dirección oficial (`From` y `Reply-To`)**: `no-reply@crearpsl.net`
- **Nombre institucional visible**: `"CREAR PODER SIN LÍMITES — Causa OS" <no-reply@crearpsl.net>`
- **Fuente canónica en código**: `src/config/officialMailConfig.js` (`OFFICIAL_CAUSA_MAIL_ADDRESS`, `OFFICIAL_CAUSA_MAIL_FROM`, `resolveOfficialMailFrom`)

### Módulos y demonios unificados bajo `no-reply@crearpsl.net`
1. **Cola central y alertas operativas (`scripts/mailerDaemon.js`)**: Tareas asignadas, recordatorios, alertas de inactividad, invitaciones `.ics` y conciliación de contratos Lima.
2. **Cloud Function en tiempo real de contratos y accesos (`functions-mailer/index.mjs` → `deliverContractMail`)**: Despacho inmediato (~2 s) de Contratos Firmados en PDF A4 + Pases de Validación de Maestría del Juego y Caminata sobre Fuego.
3. **Cloud Function aislada Misión IMO (`functions-imo/index.mjs` → `imoDeliverCode`)**: Envío de códigos OTP de verificación sobre TLS 465 IPv4.
4. **Agente de Comunicaciones Institucionales (`scripts/nodusMarketingAgencyAgent.mjs`)**: Reemplazado cualquier remitente legado `@gmail.com` por `no-reply@crearpsl.net`.

---

## 2. Arquitectura de Seguridad y Custodia de Credenciales (Cero Texto Plano)

Para proteger íntegramente a la organización, **ninguna contraseña de aplicación ni llave privada se escribe jamás en archivos rastreados por Git ni en documentos de auditoría**:

| Capa | Almacenamiento Seguro | Permisos / Cifrado |
|---|---|---|
| **Máquina Local** | `.env` (ignorado en `.gitignore` y bloqueado en `dump_code.py`) | Permisos POSIX estrictos `0600` (solo propietario) |
| **GitHub Actions** | Secrets `GMAIL_USER`, `GMAIL_PASS`, `CAUSA_OFFICIAL_FROM_EMAIL` | Cifrado `libsodium` SealedBox (`X25519-XSalsa20-Poly1305`) |
| **Google Cloud / Firebase Functions** | Secret Manager `IMO_MAIL_USER`, `IMO_MAIL_PASS`, `IMO_VERIFICATION_SECRET` | Sincronizados automáticamente en memoria vía `scripts/provisionImoSecrets.mjs` |

---

## 3. Integridad de Guardados, Avances por Rol/Usuario y Anti-Duplicados

1. **Avances por Usuario y Rol (`ChecklistBoard.jsx`, `TaskDetailModal.jsx`, `TaskAssignmentModal.jsx`, `GoalsBoard.jsx`, `PortfolioBoard.jsx`)**:
   - Cada avance (`participant_states`, `evidences`, `notes`, `status`) se persiste atómicamente respetando las reglas de seguridad de `firestore.rules` (evitando mutaciones innecesarias de mapas ajenos y liberando bloqueos de UI en bloques `finally`).
   - Al editar una tarea compartida en `TaskAssignmentModal.jsx`, se preserva íntegramente el progreso previo (`completed`, `completedAt`, `progress`) de cada colaborador asignado sin reiniciar su avance a `0%`.
   - En `ChecklistContext.jsx` (`syncTasksToGoogle`), cerrojo `googleSyncInFlightRef` en memoria que impide duplicación de tareas en Google Tasks por doble clic.
   - En `firestore.rules` (`match /goals/{goalId}`), las coordinadoras asignadas pueden reportar su avance (`assignedCoordinators`, `currentValue`, `progress`, `updatedAt`) y ejecutar roll-up sin exponer campos estructurales de la meta.
   - Coherencia verificada continuamente por `scripts/auditTaskRoleCoherenceAgent.mjs` y `src/utils/taskRoleCoherence.js`.
2. **Persistencia de KPIs y Auditoría Gerencial (`MisKPIs.jsx`, `AuditoriaKPIs.jsx`)**:
   - Separación explícita entre el ID real del documento en Firestore (`id: d.id`) y el identificador local (`clientReportId`), garantizando que la revisión gerencial (`status: 'reviewed'`) persista en Firestore y no duplique tarjetas locales.
3. **Paridad de Roles, Perfiles Inactivos y Acceso Participante (`moduleRegistry.js`, `routeAccess.js`, `AuthContext.jsx`, `Login.jsx`)**:
   - Paridad total entre tarjetas visibles en `MODULE_REGISTRY` (incluyendo multi-rol `consolidado` y SuperAdmin activo) y `RoleRoute` en `App.jsx`, bloqueando perfiles dados de baja (`isUserInactive`) y restringiendo `cpsl_mock_user` exclusivamente a entorno `DEV`.
   - En `Login.jsx`, preservación explícita de `{ participant: isParticipantLogin }` al redirigir desde `/onboarding-legal`.
4. **Contratos Legales y Pases Lima (`ContratoMaestriaLima.jsx`, `ContratoCaminataFuego.jsx`, `MonitorMaestriaLima.jsx`, `MonitorAcreditacionFuegoLima.jsx`, `legalSignatureService.js`)**:
   - Bloqueo anti-duplicados por documento de identidad antes de escribir en Firestore y fallback resiliente de geolocalización para no interrumpir firmas legales.
   - Separación estricta entre el **Contrato Legal Íntegro Firmado en PDF A4 multipágina** (`src/utils/contractPdfGenerator.js`) y el **Pase de Validación** gráfico (`src/utils/maestriaPass.js`).
5. **Cola de Correos sin Reenvíos Duplicados (`scripts/mailQueue.js`, `scripts/mailerDaemon.js`, `functions-mailer/index.mjs`)**:
   - Reclamación transaccional (`claimPendingMail`), presupuestos diarios por tarea/usuario (`mail_delivery_budgets`), supresión automática si la tarea o ciclo ya cerró (`skipTaskMailIfClosed`) y reintento resiliente de confirmación `SUCCESS` sobre IPv4 TLS 465.

---

## 4. Guardián Autónomo Cada 3 Horas (Cero Intervención Humana)

- **Workflow**: `.github/workflows/causa-os-3h-integrity-guardian.yml` (`cron: '23 */3 * * *'`)
- **Agente ejecutor**: `scripts/causaOsIntegrityGuardian.mjs`
- **Aislamiento**: Grupo `concurrency: causa-os-3h-integrity-guardian` independiente; no cancela, modifica ni interfiere con ningún otro workflow.
- **Verificaciones automáticas en cada ciclo de 3 horas**:
  1. Integridad estática de todas las páginas (`src/pages/*.jsx`), rutas (`src/App.jsx`), permisos por rol (`src/config/permissions.js`) y 4 suites críticas de pruebas.
  2. Salud HTTP 200 en vivo de `https://centro-operativo-cpsl.web.app` y del 100% de sus bundles JS/CSS en `/assets/*`.
  3. Unificación del remitente `no-reply@crearpsl.net` y verificación activa `SMTP TLS 465 IPv4` (`transporter.verify()`).
  4. Higiene de trazabilidad y cero exposición de secretos en documentos `.md`.
  5. Estado en vivo en Firestore de `tasks`, `participant_states`, `evidences`, `mail`, `contratos_maestria_lima`, `contratos_caminata_fuego` y `audit_logs`.
  6. Salud de los bots y sincronizadores autónomos de GitHub Actions (`Nodus 30-Min Sync`, `Mail Dispatch`, `Managers Sync`, `QT Sync`, `Flight Monitor`, `Calendar Guardian`), además del repositorio financiero diario `crearpodersinlimitesperu-cmd/auditor-financiero-cpsl` (`EGRESOS CREAR 2026` + Drive + IMAP).
  7. Registro automático del certificado de salud en `nodus_reports/causa_os_3h_guardian_latest` y `platform_diagnostic_reports` para visualización en el Centro de Mando, junto con sincronización de perfiles `users/{uid}` (`scripts/syncUsersUidProfiles.mjs`) y resiliencia dual SDK/REST en `https://cartas.crearpsl.net/contrato_caminata_fuego.html`.
