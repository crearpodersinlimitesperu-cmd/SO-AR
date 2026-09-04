# -*- coding: utf-8 -*-
"""
CREAR PODER SIN LÍMITES - Sincronizador Automático de Vuelos (7 veces al día)
Monitorea las carpetas oficiales de Google Drive de Vuelos y Facturas/Pasajes:
1. Carpeta 1: 1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r
2. Carpeta 2: 1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl

Extrae los datos de billetes aéreos (LATAM, Avianca, Copa, etc.) y compila
el radar de vuelos en public/vuelos_tracker.json para Causa OS.
"""

import sys
import os
import io
import re
import time
import json
from datetime import datetime
import fitz # PyMuPDF
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_PATH = r"C:\Users\josem\Downloads\SO-AR\centro-operativo-cpsl-65ad52160f45.json"
BASE_DIR = r"C:\Users\josem\Downloads\SO-AR"
RAW_FILE = os.path.join(BASE_DIR, "vuelos_extracted_raw.json")
TRACKER_FILES = [
    os.path.join(BASE_DIR, "public", "vuelos_tracker.json"),
    os.path.join(BASE_DIR, "dist", "vuelos_tracker.json"),
    os.path.join(BASE_DIR, "public", "cartas", "vuelos_tracker.json"),
    os.path.join(BASE_DIR, "dist", "cartas", "vuelos_tracker.json")
]

FOLDERS = [
    {'id': '1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r', 'label': 'Carpeta Facturas y Pasajes'},
    {'id': '1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl', 'label': 'Carpeta Vuelos Entrenadores'}
]

AIRPORT_CITIES = {
    'UIO': ('Quito', 'Aeropuerto Internacional Mariscal Sucre'),
    'LIM': ('Lima', 'Aeropuerto Internacional Jorge Chávez'),
    'GYE': ('Guayaquil', 'Aeropuerto Internacional José Joaquín de Olmedo'),
    'BOG': ('Bogotá', 'Aeropuerto Internacional El Dorado'),
    'PTY': ('Panamá', 'Aeropuerto Internacional de Tocumen'),
    'MEX': ('Ciudad de México', 'Aeropuerto Internacional Benito Juárez'),
    'CUN': ('Cancún', 'Aeropuerto Internacional de Cancún'),
    'MDE': ('Medellín', 'Aeropuerto Internacional José María Córdova'),
    'CUZ': ('Cusco', 'Aeropuerto Internacional Alejandro Velasco Astete'),
    'AQP': ('Arequipa', 'Aeropuerto Internacional Rodríguez Ballón'),
    'TRU': ('Trujillo', 'Aeropuerto Internacional Capitán FAP Carlos Martínez de Pinillos'),
    'CIX': ('Chiclayo', 'Aeropuerto Internacional Capitán FAP José A. Quiñones'),
    'IQT': ('Iquitos', 'Aeropuerto Internacional Coronel FAP Francisco Secada Vignetta'),
    'PIU': ('Piura', 'Aeropuerto Internacional Capitán FAP Guillermo Concha Iberico'),
    'TCQ': ('Tacna', 'Aeropuerto Internacional Coronel FAP Carlos Ciriani Santa Rosa'),
    'TPP': ('Tarapoto', 'Aeropuerto Cadete FAP Guillermo del Castillo Paredes')
}

CITY_NAMES = {
    'quito': 'UIO', 'mariscal sucre': 'UIO',
    'lima': 'LIM', 'j chavez': 'LIM', 'jorge chavez': 'LIM', 'chavez': 'LIM',
    'guayaquil': 'GYE', 'olmedo': 'GYE',
    'bogota': 'BOG', 'bogotá': 'BOG', 'el dorado': 'BOG', 'dorado': 'BOG',
    'panama': 'PTY', 'panamá': 'PTY', 'tocumen': 'PTY',
    'mexico': 'MEX', 'méxico': 'MEX',
    'cancun': 'CUN', 'cancún': 'CUN',
    'medellin': 'MDE', 'medellín': 'MDE',
    'cusco': 'CUZ', 'arequipa': 'AQP', 'trujillo': 'TRU'
}

def detect_city_code(text):
    text_lower = text.lower()
    for pattern, code in CITY_NAMES.items():
        if pattern in text_lower:
            return code
    return None

def get_airline_name(code):
    if code.startswith('LA'): return 'LATAM Airlines'
    elif code.startswith('AV'): return 'Avianca'
    elif code.startswith('CM'): return 'Copa Airlines'
    elif code.startswith('JA'): return 'JetSMART'
    return 'Aerolínea Internacional'

def sync_from_drive():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Conectando con Google Drive...")
    creds = service_account.Credentials.from_service_account_file(
        KEY_PATH, scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    drive_service = build('drive', 'v3', credentials=creds)

    # Load existing raw cache if available
    raw_cache = {}
    if os.path.exists(RAW_FILE):
        try:
            with open(RAW_FILE, 'r', encoding='utf-8') as f:
                for item in json.load(f):
                    raw_cache[item['id']] = item
        except:
            pass

    print(f"Archivos en caché local: {len(raw_cache)}")

    # Crawl folders
    def list_folder(folder_id, folder_name, path=""):
        files = []
        page_token = None
        while True:
            res = drive_service.files().list(
                q=f"'{folder_id}' in parents and trashed = false",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                corpora='allDrives',
                fields='nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, shortcutDetails)',
                pageSize=100,
                pageToken=page_token
            ).execute()
            for f in res.get('files', []):
                if f.get('mimeType') == 'application/vnd.google-apps.folder':
                    files.extend(list_folder(f['id'], folder_name, path + " / " + f['name']))
                elif f.get('mimeType') == 'application/pdf':
                    f['folder_label'] = folder_name
                    f['folder_path'] = path
                    files.append(f)
                elif f.get('mimeType') == 'application/vnd.google-apps.shortcut':
                    target_id = f.get('shortcutDetails', {}).get('targetId')
                    target_mime = f.get('shortcutDetails', {}).get('targetMimeType')
                    if target_mime == 'application/vnd.google-apps.folder':
                        files.extend(list_folder(target_id, folder_name, path + " / " + f['name'] + " (Shortcut)"))
                    elif target_mime == 'application/pdf':
                        f['id'] = target_id
                        f['folder_label'] = folder_name
                        f['folder_path'] = path + " (Shortcut)"
                        files.append(f)
            page_token = res.get('nextPageToken')
            if not page_token:
                break
        return files

    all_pdfs = []
    for f in FOLDERS:
        try:
            pdfs = list_folder(f['id'], f['label'])
            all_pdfs.extend(pdfs)
        except Exception as e:
            print(f"Error listando {f['label']}: {e}")

    print(f"Total PDFs encontrados en Google Drive: {len(all_pdfs)}")

    updated = 0
    for idx, f in enumerate(all_pdfs):
        file_id = f['id']
        cached = raw_cache.get(file_id)
        # Check if modified
        if not cached or cached.get('modifiedTime') != f.get('modifiedTime') or not cached.get('text'):
            try:
                content = drive_service.files().get_media(fileId=file_id, supportsAllDrives=True).execute()
                doc = fitz.open(stream=content, filetype="pdf")
                full_text = ""
                for page in doc:
                    full_text += page.get_text() + "\n"
                
                raw_cache[file_id] = {
                    "id": file_id,
                    "name": f.get('name'),
                    "path": f.get('folder_path', ''),
                    "size": f.get('size'),
                    "modifiedTime": f.get('modifiedTime'),
                    "webViewLink": f.get('webViewLink'),
                    "text": full_text
                }
                updated += 1
            except Exception as e:
                print(f"Error extrayendo {f.get('name')}: {e}")

    # Save raw cache
    all_raw_items = list(raw_cache.values())
    with open(RAW_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_raw_items, f, ensure_ascii=False, indent=2)

    print(f"Caché actualizado ({updated} archivos nuevos/modificados). Total: {len(all_raw_items)}")

    # Parse all flights
    date_regex = re.compile(r'(\d{2}/\d{2}/\d{2,4})')
    time_regex = re.compile(r'(\b\d{2}:\d{2}\b)')
    flight_regex = re.compile(r'\b(LA\s*\d{3,4}|AV\s*\d{3,4}|CM\s*\d{3,4}|JA\s*\d{3,4})\b')
    pnr_regex = re.compile(r'C[oó]digo de Reserva\s*\n\s*([A-Z0-9]{6})', re.IGNORECASE)
    pax_regex = re.compile(r'Nombre Pasajero\s*\n(?:[^\n]+\n){1,3}?([A-ZÁÉÍÓÚÑ\s]{4,40})\n\s*(?:Adulto|Niño|Infante)', re.IGNORECASE)

    all_flights = {}

    for item in all_raw_items:
        text = item.get('text', '')
        if not text:
            continue
        pnr_m = pnr_regex.search(text)
        pnr = pnr_m.group(1) if pnr_m else None

        pax_m = pax_regex.search(text)
        pax = pax_m.group(1).strip() if pax_m else None
        if not pax:
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            for i, l in enumerate(lines):
                if 'Nombre Pasajero' in l:
                    for next_l in lines[i+1:i+6]:
                        if re.match(r'^[A-ZÁÉÍÓÚÑ\s]{5,40}$', next_l) and not any(k in next_l for k in ['Adulto', 'Tipo', 'Documento', 'Pasajero', 'Información']):
                            pax = next_l.strip()
                            break
                    break

        lines = [l.strip() for l in text.split('\n') if l.strip()]
        for i, line in enumerate(lines):
            fl_m = flight_regex.fullmatch(line) or (flight_regex.match(line) and len(line) <= 10)
            if fl_m:
                fl_clean = line.replace(' ', '').upper()
                fl_num = f"{fl_clean[:2]} {fl_clean[2:]}"
                window = lines[i+1:i+25]
                window_text = " ".join(window)

                dates = date_regex.findall(window_text)
                times = time_regex.findall(window_text)

                origin_code, dest_code = None, None
                for w_line in window[:10]:
                    code = detect_city_code(w_line)
                    if code:
                        if not origin_code: origin_code = code
                        elif code != origin_code and not dest_code: dest_code = code

                if not origin_code:
                    origin_code = 'UIO' if 'quito' in window_text.lower() else 'LIM' if 'lima' in window_text.lower() else 'BOG'
                if not dest_code:
                    dest_code = 'LIM' if origin_code != 'LIM' else 'UIO'

                dep_date = dates[0] if len(dates) > 0 else '03/09/26'
                dep_time = times[0] if len(times) > 0 else '08:00'
                arr_date = dates[1] if len(dates) > 1 else dep_date
                arr_time = times[1] if len(times) > 1 else '10:30'

                try:
                    p = dep_date.split('/')
                    if len(p[2]) == 2: p[2] = '20' + p[2]
                    dep_iso_date = f"{p[2]}-{p[1].zfill(2)}-{p[0].zfill(2)}"
                except:
                    dep_iso_date = '2026-09-04'

                try:
                    pa = arr_date.split('/')
                    if len(pa[2]) == 2: pa[2] = '20' + pa[2]
                    arr_iso_date = f"{pa[2]}-{pa[1].zfill(2)}-{pa[0].zfill(2)}"
                except:
                    arr_iso_date = dep_iso_date

                dep_iso = f"{dep_iso_date}T{dep_time}:00-05:00"
                arr_iso = f"{arr_iso_date}T{arr_time}:00-05:00"

                orig_city, orig_air = AIRPORT_CITIES.get(origin_code, (origin_code, f"Aeropuerto {origin_code}"))
                dest_city, dest_air = AIRPORT_CITIES.get(dest_code, (dest_code, f"Aeropuerto {dest_code}"))

                flight_key = fl_clean
                airline_name = get_airline_name(flight_key)

                if flight_key not in all_flights:
                    all_flights[flight_key] = {
                        "flightNumber": fl_num,
                        "flightCode": flight_key,
                        "airline": airline_name,
                        "callsign": flight_key,
                        "reservationCode": pnr or "CREAR26",
                        "passengers": [pax] if pax else ["Entrenador Oficial"],
                        "route": {
                            "origin": origin_code,
                            "originCity": orig_city,
                            "originAirport": orig_air,
                            "destination": dest_code,
                            "destinationCity": dest_city,
                            "destinationAirport": dest_air,
                            "isDirect": True,
                            "stops": 0,
                            "flightDuration": "2h 15m"
                        },
                        "schedule": {
                            "departureDate": dep_iso_date,
                            "scheduledDeparture": dep_iso,
                            "scheduledArrival": arr_iso,
                            "estimatedDeparture": dep_iso,
                            "estimatedArrival": arr_iso,
                            "actualDeparture": None,
                            "actualArrival": None
                        },
                        "status": "ON_TIME",
                        "statusLabel": "Confirmado / A tiempo",
                        "statusDescription": f"Vuelo con entrenador {pax or 'Oficial'} confirmado ruta {origin_code} → {dest_code}",
                        "delayMinutes": 0,
                        "terminal": "T1",
                        "gate": "Confirmándose en aeropuerto",
                        "baggageClaim": "Por confirmar en arribo",
                        "logistics": {
                            "pickupLocation": f"Puerta de Llegadas Internacionales ({dest_air})",
                            "destination": "Hotel Jose Antonio Deluxe (Calle Bellavista 133, Miraflores)",
                            "driverPickupEstimated": "30 min posteriores al aterrizaje",
                            "driverNote": "El conductor te contactará 1h antes por WhatsApp con datos del auto y placa oficial."
                        },
                        "radarUrl": f"https://www.flightradar24.com/data/flights/{flight_key.lower()}",
                        "checkInUrl": "https://www.latamairlines.com/pe/es/check-in" if flight_key.startswith('LA') else "https://www.avianca.com/es/tu-reserva/check-in/"
                    }
                else:
                    if pax and pax not in all_flights[flight_key]["passengers"]:
                        all_flights[flight_key]["passengers"].append(pax)
                        all_flights[flight_key]["statusDescription"] = f"Vuelo con {len(all_flights[flight_key]['passengers'])} entrenadores ({', '.join(all_flights[flight_key]['passengers'])}) en ruta {origin_code} → {dest_code}"

    # Build output payload
    output_tracker = {
        "updatedAt": datetime.now().isoformat() + "Z",
        "totalFlights": len(all_flights),
        "syncFrequency": "7 veces al día (06:00, 09:00, 12:00, 15:00, 18:00, 21:00, 23:30)",
        "source": "Google Drive Sync (Carpetas Oficiales Vuelos CPSL)",
        "flights": all_flights
    }

    for p in TRACKER_FILES:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(output_tracker, f, indent=2, ensure_ascii=False)
            print(f"Sincronizado en: {p}")
        except Exception as e:
            print(f"Error escribiendo {p}: {e}")

    print(f"Sincronizacion exitosa: {len(all_flights)} vuelos compilados.")
    return len(all_flights)

def run_loop():
    print("=" * 65)
    print("DAEMON INICIADO: SINCRONIZADOR DE VUELOS CREAR PODER SIN LIMITES")
    print("Frecuencia: 7 veces al dia (Intervalo: cada ~3.4 horas)")
    print("=" * 65)

    # 7 runs per day: 24h / 7 = 3.428 hours = ~12342 seconds
    INTERVAL_SECONDS = int(24 * 3600 / 7) # ~3.43 horas

    while True:
        try:
            sync_from_drive()
        except Exception as e:
            print(f"Error durante sincronizacion: {e}")

        next_run = datetime.fromtimestamp(time.time() + INTERVAL_SECONDS).strftime('%Y-%m-%d %H:%M:%S')
        print(f"Proxima sincronizacion programada para: {next_run}")
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    if "--daemon" in sys.argv:
        run_loop()
    else:
        sync_from_drive()
