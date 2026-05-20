/// Hash de senha usando bcrypt (executado em thread separada para não bloquear a UI)
#[tauri::command]
pub async fn hash_password(password: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        bcrypt::hash(&password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Verificação de senha contra hash bcrypt
#[tauri::command]
pub async fn verify_password(password: String, hash: String) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || {
        bcrypt::verify(&password, &hash).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
