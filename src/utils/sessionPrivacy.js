const LOCAL_KEYS = [
  'CAUSA_FAST_CACHE', 'cpsl_user_connections', 'cpsl_llamados_data_v3',
  'cpsl_kpi_reports_v1', 'cpsl_mock_user',
  'cpsl_qt_members_cache_v3', 'cpsl_qt_members_cache_time_v3',
  'cpsl_qt_members_cache_v4', 'cpsl_qt_members_cache_time_v4'
];
const SESSION_KEYS = [
  'googleAccessToken', 'cpsl_active_role', 'cpsl_participant_flow',
  'cpsl_simulated_target_email', 'cpsl_original_admin_email', 'googleChatToken'
];

export function clearPrivateSession(local, session) {
  LOCAL_KEYS.forEach(key => local.removeItem(key));
  SESSION_KEYS.forEach(key => session.removeItem(key));
}

export function bindPrivateSession(uid, local, session) {
  const owner = session.getItem('cpsl_session_owner');
  const participantFlow = uid && session.getItem('cpsl_participant_flow') === '1';
  if (owner !== uid) clearPrivateSession(local, session);
  // The explicitly requested signing flow is not an operational permission.
  if (participantFlow) session.setItem('cpsl_participant_flow', '1');
  if (uid) session.setItem('cpsl_session_owner', uid);
  else session.removeItem('cpsl_session_owner');
}

export const privateViewKey = user => JSON.stringify([
  user?.uid, user?.email, user?.appRole, user?.sede, user?.isSimulated === true
]);
