/// Stub de sincronização — será implementado na Fase 3 quando o backend estiver disponível
#[tauri::command]
pub async fn trigger_sync() -> Result<(), String> {
    // TODO Fase 3: processar sync_queue e enviar ao backend via HTTPS
    Ok(())
}
