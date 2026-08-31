#!/usr/bin/env python3
"""
Reporta la salida real de un deploy fallido de GitHub Actions a un Issue.

CONTEXTO (29/08/2026): los logs crudos de los workflows de este repo no son
legibles desde el entorno de Claude que lo mantiene (bloqueados por política de
red al descargarlos vía la API de GitHub). Este script corre DENTRO del runner
de GitHub Actions (que sí tiene la salida real en disco) y publica esa salida
en un Issue, para que se pueda diagnosticar el fallo sin depender de que un
humano copie/pegue el log manualmente. Mismo patrón que scripts/platform_audit.mjs
usa para reportar sus propios errores.

Uso: python3 scripts/report_deploy_failure.py /tmp/deploy_output.log
Requiere las variables de entorno que GitHub Actions provee automáticamente:
GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_RUN_ID.
"""
import json
import os
import sys
import urllib.request


def main():
    if len(sys.argv) < 2:
        print("Uso: report_deploy_failure.py <ruta al log>")
        sys.exit(1)

    log_path = sys.argv[1]
    try:
        with open(log_path, "r", errors="replace") as f:
            log_tail = f.read()[-50000:]
    except FileNotFoundError:
        log_tail = "(no se encontró el archivo de log en el runner)"

    repo = os.environ.get("GITHUB_REPOSITORY", "")
    sha = os.environ.get("GITHUB_SHA", "?")
    run_id = os.environ.get("GITHUB_RUN_ID", "?")
    token = os.environ.get("GITHUB_TOKEN", "")

    if not token or not repo:
        print("Faltan GITHUB_TOKEN o GITHUB_REPOSITORY — no se puede reportar el Issue.")
        sys.exit(0)

    body = (
        f"Deploy a Firebase Hosting falló en el commit `{sha}`, "
        f"run `{run_id}` "
        f"(https://github.com/{repo}/actions/runs/{run_id}).\n\n"
        f"### Salida real (últimos 50000 caracteres)\n```\n{log_tail}\n```"
    )

    payload = json.dumps({
        "title": f"🚨 Deploy a Firebase Hosting falló ({sha[:9]})",
        "body": body,
        "labels": ["deploy-diagnostics"]
    }).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print("Issue de diagnóstico creado:", resp.status)
    except Exception as e:
        print("No se pudo crear el Issue de diagnóstico:", e)


if __name__ == "__main__":
    main()
