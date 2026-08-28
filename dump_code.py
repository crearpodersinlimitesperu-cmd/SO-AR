import os
import shutil

def dump_codebase():
    source_dir = "."
    output_file_1 = "DOCUMENTO_REPLICA_PLATAFORMA.md"
    output_file_2 = "CODIGO_COMPLETO_AUDITORIA.md"
    
    # Extensions to include
    valid_extensions = ['.jsx', '.js', '.css', '.json', '.html']
    # Directories to exclude
    exclude_dirs = ['node_modules', '.git', 'dist', 'build', '.firebase', 'backup', 'backups', 'docs']
    
    print(f"Generando {output_file_1}...")
    
    with open(output_file_1, 'w', encoding='utf-8') as outfile:
        outfile.write("# Código Completo y Detalles de la Plataforma SO-AR\n\n")
        outfile.write("Este documento contiene el código fuente completo para duplicar y maximizar la plataforma.\n\n")
        
        for root, dirs, files in os.walk(source_dir):
            # Modificamos dirs en el lugar para saltar directorios excluidos
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1]
                
                # Omitir archivos que puedan contener secretos o que no aporten al código fuente útil
                if file == "package-lock.json" or file.endswith(".json") and "centro-operativo" in file:
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
