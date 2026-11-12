import os
import shutil

def dump_codebase():
    source_dir = "."
    output_file_1 = "DOCUMENTO_REPLICA_PLATAFORMA.md"
    output_file_2 = "CODIGO_COMPLETO_AUDITORIA.md"
    
    # Extensions to include
    valid_extensions = ['.jsx', '.js', '.css', '.json', '.html']
    # Directories to exclude
    exclude_dirs = ['node_modules', '.git', 'dist', 'build', '.firebase', 'backup', 'backups', 'docs', 'data', 'scratch']
    
    print(f"Generando {output_file_1}...")
    
    with open(output_file_1, 'w', encoding='utf-8') as outfile:
        outfile.write("# Código Completo y Detalles de la Plataforma SO-AR (Causa OS)\n\n")
        outfile.write("Este documento contiene el código fuente completo para duplicar, auditar y mantener la trazabilidad integral de Causa OS.\n\n")
        outfile.write("## Política Oficial de Comunicación y Seguridad de Credenciales\n\n")
        outfile.write("- **Canal Oficial Único de Comunicaciones Causa OS**: `no-reply@crearpsl.net` (`\"CREAR PODER SIN LÍMITES — Causa OS\" <no-reply@crearpsl.net>`).\n")
        outfile.write("- **Protección Cero-Texto-Plano**: Ninguna clave de aplicación, llave privada ni token se vuelca jamás en este documento ni en el repositorio; residen cifrados exclusivamente en GitHub Actions Secrets (`GMAIL_USER`, `GMAIL_PASS`, `CAUSA_OFFICIAL_FROM_EMAIL`), Google Cloud Secret Manager (`IMO_MAIL_USER`, `IMO_MAIL_PASS`) y `.env` local con permisos `0600`.\n")
        outfile.write("- **Guardián Autónomo 3H**: Supervisión continua cada 3 horas mediante `.github/workflows/causa-os-3h-integrity-guardian.yml` y `scripts/causaOsIntegrityGuardian.mjs`.\n\n")
        
        for root, dirs, files in os.walk(source_dir):
            # Modificamos dirs en el lugar para saltar directorios excluidos
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1]
                lower_file = file.lower()
                
                # Omitir estrictamente cualquier archivo de entorno, llaves o secretos
                file_full = os.path.join(root, file)
                if (file.startswith(".env") or
                    "credential" in lower_file or
                    "serviceaccount" in lower_file or
                    "service-account" in lower_file or
                    lower_file.endswith((".pem", ".key", ".p12")) or
                    file == "package-lock.json" or 
                    (file.endswith(".json") and (root == "." or "backup" in file or "raw" in file or "vuelos" in file or "centro-operativo" in file or os.path.getsize(file_full) > 200000))):
                    continue

                if ext in valid_extensions:
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, source_dir)
                    
                    outfile.write(f"## Archivo: {rel_path}\n\n")
                    # Detectar el lenguaje para el bloque de código
                    lang = ext.replace('.', '')
                    if lang == 'jsx':
                        lang = 'javascript'
                        
                    outfile.write(f"```{lang}\n")
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"// Error leyendo archivo: {str(e)}\n")
                        
                    outfile.write(f"\n```\n\n---\n\n")
    
    print(f"Generando copia idéntica de auditoría en {output_file_2}...")
    shutil.copy2(output_file_1, output_file_2)

if __name__ == "__main__":
    dump_codebase()
    print("Documentos generados con éxito para trazabilidad absoluta.")
