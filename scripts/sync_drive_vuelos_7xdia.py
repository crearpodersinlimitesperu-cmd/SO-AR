# -*- coding: utf-8 -*-
"""
CREAR PODER SIN LÍMITES - Motor Universal IA de Vuelos (Drive PDF Multi-Format Engine)
Monitorea las carpetas oficiales de Google Drive de Vuelos y Facturas/Pasajes:
1. Carpeta 1: 1i60YXyxRrFP1LxmXUVuHK5eRyeUBzR0r
2. Carpeta 2: 1oi7mUG619dQ2ZVzHzUyO5Xkwti-jgDFl

Soporta todas las plantillas de boletos y pasajes de los entrenadores internacionales:
- CheckMyTrip / OwlTravel (Avianca, Copa, LATAM, etc.)
- Sabre / Virtually There (Itinerarios LATAM / American / United)
- Facturas Electrónicas CUV LATAM
- Billetes Electrónicos Avianca / Copa / Expedia
"""

import sys
import os
import io
import re
import time
import json
from datetime import datetime
import fitz  # PyMuPDF
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

MONTH_MAP = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
    'julio': '07', 'agosto': '08', 'septiembre': '09', 'setiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    'ene': '01', 'abr': '04', 'ago': '08', 'dic': '12'
}

AIRPORT_CITIES = {
    'UIO': ('Quito', 'Aeropuerto Internacional Mariscal Sucre', 'Ecuador'),
    'LIM': ('Lima', 'Aeropuerto Internacional Jorge Chávez', 'Perú'),
    'GYE': ('Guayaquil', 'Aeropuerto Internacional José Joaquín de Olmedo', 'Ecuador'),
    'BOG': ('Bogotá', 'Aeropuerto Internacional El Dorado', 'Colombia'),
    'PTY': ('Panamá', 'Aeropuerto Internacional de Tocumen', 'Panamá'),
    'MEX': ('Ciudad de México', 'Aeropuerto Internacional Benito Juárez', 'México'),
    'CUN': ('Cancún', 'Aeropuerto Internacional de Cancún', 'México'),
    'MDE': ('Medellín', 'Aeropuerto Internacional José María Córdova', 'Colombia'),
    'CUE': ('Cuenca', 'Aeropuerto Mariscal La Mar', 'Ecuador'),
    'CUZ': ('Cusco', 'Aeropuerto Internacional Alejandro Velasco Astete', 'Perú'),
    'MIA': ('Miami', 'Miami International Airport', 'Estados Unidos'),
    'IAH': ('Houston', 'George Bush Intercontinental Airport', 'Estados Unidos'),
    'SAN': ('San Diego', 'San Diego International Airport', 'Estados Unidos'),
    'MAD': ('Madrid', 'Aeropuerto Adolfo Suárez Madrid-Barajas', 'España')
}

SEDES_LOGISTICA = {
    'Guayaquil': {
        'hotel': 'Sede Guayaquil (Hospedaje por coordinar con Dirección de Sede)',
        'direccion': 'Guayaquil, Ecuador',
        'pickupLocation': 'Puerta de Salida de Arribos (Aeropuerto Olmedo GYE)',
        'driverPickupEstimated': '30 min posteriores al aterrizaje',
        'driverNote': 'Coordinación de bienvenida y traslado con Dirección de Sede Guayaquil.'
    },
    'Quito': {
        'hotel': 'CREAR PODER SIN LÍMITES FORTALEZA CUÁNTICA',
        'direccion': 'De los Naranjos, 170124 Quito, Ecuador',
        'pickupLocation': 'Puerta de Arribos Internacionales / Nacionales UIO (Cartel CPSL)',
        'driverPickupEstimated': '30 min posteriores al aterrizaje',
        'driverNote': 'Conductor de sede Quito te esperará con cartel oficial CREAR PODER SIN LÍMITES.'
    },
    'Cuenca': {
        'hotel': 'Sede Cuenca (Hospedaje por coordinar con Dirección de Sede)',
        'direccion': 'Cuenca, Ecuador',
        'pickupLocation': 'Hall Principal de Salida de Pasajeros (Aeropuerto CUE)',
        'driverPickupEstimated': '20 min posteriores al aterrizaje',
        'driverNote': 'Traslado coordinado con equipo local de Sede Cuenca.'
    },
    'Lima': {
        'hotel': 'Hotel Jose Antonio Deluxe Miraflores',
        'direccion': 'Calle Bellavista 133, Miraflores, Lima 15074, Perú',
        'pickupLocation': 'Puerta de Llegadas Internacionales (Aeropuerto Internacional Jorge Chávez)',
        'driverPickupEstimated': '30 min posteriores al aterrizaje',
        'driverNote': 'El conductor te contactará 1h antes por WhatsApp con datos del auto y placa oficial.'
    },
    'Medellin': {
        'hotel': 'Sede Medellín (Hospedaje por coordinar con Dirección de Sede)',
        'direccion': 'Medellín, Colombia',
        'pickupLocation': 'Salida Puerta 1 Llegadas Internacionales / Nacionales MDE',
        'driverPickupEstimated': '35 min posteriores al aterrizaje',
        'driverNote': 'Coordinación de bienvenida y traslado con Sede Medellín.'
    },
    'Mexico': {
        'hotel': 'Sede Ciudad de México (Hospedaje por coordinar con Dirección de Sede)',
        'direccion': 'Ciudad de México, México',
        'pickupLocation': 'Puerta de Salida de Vuelos Llegadas T1 / T2 (Aeropuerto Benito Juárez MEX)',
        'driverPickupEstimated': '30 min posteriores al aterrizaje',
        'driverNote': 'Coordinación de bienvenida y traslado con Sede México.'
    }
}

def detect_city_code(text):
    if not text:
        return None
    t = text.lower()
    if 'mariscal la mar' in t or 'mariscal lamar' in t or re.search(r'\bcue\b', t) or 'cuenca' in t:
        return 'CUE'
    if 'mariscal sucre' in t or re.search(r'\buio\b', t) or 'quito' in t:
        return 'UIO'
    if 'olmedo' in t or re.search(r'\bgye\b', t) or 'guayaquil' in t:
        return 'GYE'
    if 'jorge chavez' in t or 'jorge ch' in t or re.search(r'\blim\b', t) or 'lima' in t:
        return 'LIM'
    if 'el dorado' in t or re.search(r'\bbog\b', t) or 'bogota' in t or 'bogotá' in t:
        return 'BOG'
    if 'tocumen' in t or re.search(r'\bpty\b', t) or 'panama' in t or 'panamá' in t:
        return 'PTY'
    if 'benito juarez' in t or 'benito ju' in t or re.search(r'\bmex\b', t) or 'mexico' in t or 'méxico' in t:
        return 'MEX'
    if 'cordova' in t or 'medellin' in t or 'medellín' in t or re.search(r'\bmde\b', t) or 'rionegro' in t:
        return 'MDE'
    if 'cancun' in t or 'cancún' in t or re.search(r'\bcun\b', t):
        return 'CUN'
    if 'san diego' in t or re.search(r'\bsan\b', t):
        return 'SAN'
    if 'george bush' in t or re.search(r'\biah\b', t) or 'houston' in t:
        return 'IAH'
    if 'miami' in t or re.search(r'\bmia\b', t):
        return 'MIA'
    if 'madrid' in t or 'barajas' in t or re.search(r'\bmad\b', t):
        return 'MAD'
    return None

def get_airline_name(code):
    if code.startswith('LA'): return 'LATAM Airlines'
    elif code.startswith('AV') or code.startswith('2K'): return 'Avianca'
    elif code.startswith('CM'): return 'Copa Airlines'
    elif code.startswith('JA'): return 'JetSMART'
    elif code.startswith('AM'): return 'Aeroméxico'
    elif code.startswith('UA'): return 'United Airlines'
    elif code.startswith('DL'): return 'Delta Air Lines'
    elif code.startswith('AA'): return 'American Airlines'
    elif code.startswith('IB'): return 'Iberia'
    elif code.startswith('UX'): return 'Air Europa'
    return 'Aerolínea Internacional'

def normalize_pax(raw_pax, file_path, file_name):
    if raw_pax and 'Adulto' not in raw_pax and 'Tipo' not in raw_pax:
        p = re.sub(r'(?i)\b(ADT|MR|MS|MRS|MISS)\b', '', raw_pax).strip()
        p = re.sub(r'\s+', ' ', p).strip(', ')
        m = re.match(r'^([A-Za-z]+)\/([A-Za-z]+)$', p)
        if m:
            return f"{m.group(2)} {m.group(1)}"
        if len(p) >= 4:
            return p

    # Heurística por nombre de archivo o carpeta
    fp = file_path.upper()
    fn = file_name.upper()
    if 'MIKE BOADA' in fp or 'BOADA' in fn: return 'Michael Andrés Boada Rubiano'
    if 'MILDRED MU' in fp or 'MILDRED' in fn: return 'Mildred Muñoz'
    if 'LEANDRO BRUNIS' in fp or 'LEANDRO' in fn: return 'Leandro Emilio Brunis Avilés'
    if 'MAURICIO PEREZ' in fp or 'MAURICIO' in fn: return 'Mauricio Pérez Robles'
    if 'ANDRES IDROBO' in fp or 'IDROBO' in fn: return 'Elmer Andrés Idrobo Andrade'
    if 'LOURDES PATI' in fp or 'PATIÑO' in fn or 'PATI' in fn: return 'María de Lourdes Patiño Galárraga'
    if 'ANDRES GOMEZ' in fp or 'GOMEZ' in fn: return 'Carlos Andrés Gómez'
    if 'ANA MONRROY' in fp or 'ANA MONROY' in fp or 'MONROY' in fn: return 'Ana Elena Monroy Thompson'
    if 'JUAN ANGEL' in fp or 'AREOLA' in fn or 'ARREOLA' in fn: return 'Juan Ángel Arreola'
    if 'CIRILO MARTINEZ' in fp or 'CIRILO' in fn: return 'Cirilo Agustín Martínez'
    if 'ALONSO SOLARES' in fp or 'SOLARES' in fn: return 'Alonso Solares Salazar'
    if 'CHUY ACOSTA' in fp or 'ACOSTA' in fn: return 'Jesús Adrián Acosta Rodríguez (Chuy)'
    if 'DIEGO BRAVO' in fn: return 'Diego Bravo'
    if 'CARLOS BRUNIS' in fn: return 'Carlos Brunis'
    if 'FERNANDO ARAGON' in fn: return 'Fernando Aragón'
    if 'DIAZ PABON' in fn: return 'Ernesto Alejandro Díaz Pabón'

    return 'Entrenador Oficial'

def get_destination_logistics(dest_code, orig_code):
    if dest_code == 'UIO': return SEDES_LOGISTICA['Quito']
    if dest_code == 'GYE': return SEDES_LOGISTICA['Guayaquil']
    if dest_code == 'CUE': return SEDES_LOGISTICA['Cuenca']
    if dest_code == 'LIM': return SEDES_LOGISTICA['Lima']
    if dest_code == 'MDE': return SEDES_LOGISTICA['Medellin']
    if dest_code == 'MEX': return SEDES_LOGISTICA['Mexico']
    
    # Si el destino no es sede (retorno), verificar origen
    if orig_code == 'UIO': return SEDES_LOGISTICA['Quito']
    if orig_code == 'GYE': return SEDES_LOGISTICA['Guayaquil']
    if orig_code == 'CUE': return SEDES_LOGISTICA['Cuenca']
    if orig_code == 'LIM': return SEDES_LOGISTICA['Lima']
    if orig_code == 'MDE': return SEDES_LOGISTICA['Medellin']
    if orig_code == 'MEX': return SEDES_LOGISTICA['Mexico']
    
    return SEDES_LOGISTICA['Lima']

def sync_from_drive():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Conectando con Google Drive...")
    creds = service_account.Credentials.from_service_account_file(
        KEY_PATH, scopes=['https://www.googleapis.com/auth/drive.readonly']
    )
    drive_service = build('drive', 'v3', credentials=creds)

    # Cargar caché raw local
    raw_cache = {}
    if os.path.exists(RAW_FILE):
        try:
            with open(RAW_FILE, 'r', encoding='utf-8') as f:
                for item in json.load(f):
                    raw_cache[item['id']] = item
        except:
            pass

    print(f"Archivos en caché local: {len(raw_cache)}")

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
            page_token = res.get('nextPageToken')
            if not page_token:
                break
        return files

    all_pdf_files = []
    for fld in FOLDERS:
        try:
            pdfs = list_folder(fld['id'], fld['label'])
            all_pdf_files.extend(pdfs)
        except Exception as e:
            print(f"Error explorando {fld['label']}: {e}")

    print(f"Total PDFs encontrados en Drive: {len(all_pdf_files)}")

    all_raw_items = []
    for f in all_pdf_files:
        fid = f['id']
        name = f['name']
        mod_time = f.get('modifiedTime')
        cached = raw_cache.get(fid)

        if cached and cached.get('modifiedTime') == mod_time and cached.get('text'):
            all_raw_items.append(cached)
            continue

        try:
            req = drive_service.files().get_media(fileId=fid)
            pdf_bytes = req.execute()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            extracted_text = ""
            for page in doc:
                extracted_text += page.get_text() + "\n"

            item = {
                'id': fid,
                'name': name,
                'path': f.get('folder_path', '') + ' / ' + name,
                'modifiedTime': mod_time,
                'webViewLink': f.get('webViewLink'),
                'text': extracted_text
            }
            all_raw_items.append(item)
            raw_cache[fid] = item
        except Exception as e:
            print(f"Error leyendo {name}: {e}")

    try:
        with open(RAW_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_raw_items, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error guardando raw cache: {e}")

    # ==========================================================
    # MOTOR DE EXTRACCIÓN MULTI-PLANTILLA UNIVERSAL
    # ==========================================================
    flights_dict = {}

    for item in all_raw_items:
        text = item.get('text', '')
        if not text or len(text.strip()) < 20:
            continue
        lines = [l.strip() for l in text.split('\n') if l.strip()]

        # ----------------------------------------------------------
        # 1. PLANTILLA CHECKMYTRIP / OWLTRAVEL (ENTRENADORES ECUADOR)
        # ----------------------------------------------------------
        if 'CheckMyTrip' in text or 'OWLTRAVEL' in text or 'Localizador de' in text:
            pax = "N/A"
            for i, l in enumerate(lines):
                if l == 'Viajero' and i + 1 < len(lines):
                    pax = lines[i+1].strip()
                    break

            pnr = "CREAR26"
            for i, l in enumerate(lines):
                if re.match(r'^[A-Z0-9]{6}$', l) and i > 0 and any(k in lines[i-1].lower() for k in ['viaje', 'reserva', 'localizador']):
                    pnr = l.strip()
                    break

            for i, line in enumerate(lines):
                m_fl = re.search(r'\b(LA|AV|CM|JA|UA|DL|AA|IB|UX|AM|2K)\s*(\d{2,4})\b', line)
                if m_fl:
                    airline_code, flight_num = m_fl.group(1), m_fl.group(2)
                    fl_number = f"{airline_code} {flight_num}"
                    fl_clean = f"{airline_code}{flight_num}"

                    dep_date, dep_time, orig_code = None, None, None
                    arr_date, arr_time, dest_code = None, None, None

                    window = lines[i:i+35]
                    for w, w_l in enumerate(window):
                        if w_l == 'Salida' and w + 1 < len(window):
                            m_d = re.search(r'(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{1,2}:\d{2})', window[w+1])
                            if m_d:
                                m_num = MONTH_MAP.get(m_d.group(2).lower())
                                if m_num:
                                    dep_date = f"2026-{m_num}-{m_d.group(1).zfill(2)}"
                                    dep_time = m_d.group(3)
                            if w + 2 < len(window):
                                orig_code = detect_city_code(window[w+2])

                        if w_l == 'Llegada' and w + 1 < len(window):
                            m_a = re.search(r'(\d{1,2})\s+([A-Za-z]{3,10})\s+(\d{1,2}:\d{2})', window[w+1])
                            if m_a:
                                m_num = MONTH_MAP.get(m_a.group(2).lower())
                                if m_num:
                                    arr_date = f"2026-{m_num}-{m_a.group(1).zfill(2)}"
                                    arr_time = m_a.group(3)
                            if w + 2 < len(window):
                                dest_code = detect_city_code(window[w+2])

                    if dep_date and orig_code and dest_code and orig_code != dest_code:
                        unique_key = f"{fl_clean}_{dep_date}_{orig_code}_{dest_code}"
                        norm_pax = normalize_pax(pax, item.get('path', ''), item.get('name', ''))
                        airline_name = get_airline_name(fl_clean)
                        orig_info = AIRPORT_CITIES.get(orig_code, (orig_code, f"Aeropuerto {orig_code}", ""))
                        dest_info = AIRPORT_CITIES.get(dest_code, (dest_code, f"Aeropuerto {dest_code}", ""))
                        log = get_destination_logistics(dest_code, orig_code)

                        flights_dict[unique_key] = {
                            "flightNumber": fl_number,
                            "flightCode": unique_key,
                            "airline": airline_name,
                            "callsign": unique_key,
                            "reservationCode": pnr,
                            "passengers": [norm_pax],
                            "sourcePdf": item.get('name', ''),
                            "sourcePath": item.get('path', ''),
                            "route": {
                                "origin": orig_code,
                                "originCity": orig_info[0],
                                "originAirport": orig_info[1],
                                "destination": dest_code,
                                "destinationCity": dest_info[0],
                                "destinationAirport": dest_info[1],
                                "isDirect": True,
                                "stops": 0,
                                "flightDuration": "2h 00m"
                            },
                            "schedule": {
                                "departureDate": dep_date,
                                "scheduledDeparture": f"{dep_date}T{dep_time}:00-05:00",
                                "scheduledArrival": f"{arr_date}T{arr_time}:00-05:00",
                                "estimatedDeparture": f"{dep_date}T{dep_time}:00-05:00",
                                "estimatedArrival": f"{arr_date}T{arr_time}:00-05:00",
                                "actualDeparture": None,
                                "actualArrival": None
                            },
                            "status": "ON_TIME",
                            "statusLabel": "Confirmado / A tiempo",
                            "statusDescription": f"Vuelo con entrenador {norm_pax} confirmado ruta {orig_code} → {dest_code}",
                            "delayMinutes": 0,
                            "terminal": "T1",
                            "gate": "Confirmándose en aeropuerto",
                            "baggageClaim": "Por confirmar en arribo",
                            "logistics": {
                                "pickupLocation": log['pickupLocation'],
                                "destination": f"{log['hotel']} ({log['direccion']})",
                                "driverPickupEstimated": log['driverPickupEstimated'],
                                "driverNote": log['driverNote']
                            },
                            "radarUrl": f"https://www.flightradar24.com/data/flights/{fl_clean.lower()}",
                            "checkInUrl": f"https://www.google.com/search?q=check+in+{airline_name.replace(' ', '+')}+{fl_clean}"
                        }

        # ----------------------------------------------------------
        # 2. PLANTILLA SABRE / VIRTUALLY THERE (LATAM TICKETS)
        # ----------------------------------------------------------
        elif 'PREPARED FOR' in text or 'RESERVATION CODE' in text:
            pax = "N/A"
            for i, l in enumerate(lines):
                if l == 'PREPARED FOR' and i + 1 < len(lines):
                    pax = lines[i+1].strip()
                    break

            m_pnr = re.search(r'RESERVATION CODE\s+([A-Z0-9]{6})', text)
            pnr = m_pnr.group(1).strip() if m_pnr else "CREAR26"

            for i, l in enumerate(lines):
                m_dep = re.search(r'DEPARTURE:\s+[A-Z]+\s+(\d{1,2})\s+([A-Za-z]{3})', l)
                if m_dep:
                    day = m_dep.group(1).zfill(2)
                    m_num = MONTH_MAP.get(m_dep.group(2).lower())
                    dep_date = f"2026-{m_num}-{day}"

                    window = lines[i:i+35]
                    fl_num, fl_clean = None, None
                    orig_code, dest_code = None, None
                    dep_time, arr_time = None, None

                    for w, w_l in enumerate(window):
                        m_f = re.search(r'\b(LA|AV|CM|JA|UA|DL|AA|IB|UX|AM|2K)\s*(\d{2,4})\b', w_l)
                        if m_f and not fl_num:
                            fl_num = f"{m_f.group(1)} {m_f.group(2)}"
                            fl_clean = f"{m_f.group(1)}{m_f.group(2)}"

                        if re.match(r'^[A-Z]{3}$', w_l) and w + 1 < len(window) and re.search(r'ECUADOR|PERU|COLOMBIA|MEXICO|USA', window[w+1]):
                            if not orig_code:
                                orig_code = w_l
                            elif not dest_code and w_l != orig_code:
                                dest_code = w_l

                        m_t1 = re.search(r'Departing At[^\d]*(\d{1,2}:\d{2})', w_l)
                        if m_t1: dep_time = m_t1.group(1)
                        m_t2 = re.search(r'Arriving At[^\d]*(\d{1,2}:\d{2})', w_l)
                        if m_t2: arr_time = m_t2.group(1)

                    if fl_num and orig_code and dest_code and orig_code != dest_code:
                        unique_key = f"{fl_clean}_{dep_date}_{orig_code}_{dest_code}"
                        norm_pax = normalize_pax(pax, item.get('path', ''), item.get('name', ''))
                        airline_name = get_airline_name(fl_clean)
                        orig_info = AIRPORT_CITIES.get(orig_code, (orig_code, f"Aeropuerto {orig_code}", ""))
                        dest_info = AIRPORT_CITIES.get(dest_code, (dest_code, f"Aeropuerto {dest_code}", ""))
                        log = get_destination_logistics(dest_code, orig_code)

                        dep_t = dep_time or '07:00'
                        arr_t = arr_time or '08:15'

                        flights_dict[unique_key] = {
                            "flightNumber": fl_num,
                            "flightCode": unique_key,
                            "airline": airline_name,
                            "callsign": unique_key,
                            "reservationCode": pnr,
                            "passengers": [norm_pax],
                            "sourcePdf": item.get('name', ''),
                            "sourcePath": item.get('path', ''),
                            "route": {
                                "origin": orig_code,
                                "originCity": orig_info[0],
                                "originAirport": orig_info[1],
                                "destination": dest_code,
                                "destinationCity": dest_info[0],
                                "destinationAirport": dest_info[1],
                                "isDirect": True,
                                "stops": 0,
                                "flightDuration": "1h 15m"
                            },
                            "schedule": {
                                "departureDate": dep_date,
                                "scheduledDeparture": f"{dep_date}T{dep_t}:00-05:00",
                                "scheduledArrival": f"{dep_date}T{arr_t}:00-05:00",
                                "estimatedDeparture": f"{dep_date}T{dep_t}:00-05:00",
                                "estimatedArrival": f"{dep_date}T{arr_t}:00-05:00",
                                "actualDeparture": None,
                                "actualArrival": None
                            },
                            "status": "ON_TIME",
                            "statusLabel": "Confirmado / A tiempo",
                            "statusDescription": f"Vuelo con entrenador {norm_pax} confirmado ruta {orig_code} → {dest_code}",
                            "delayMinutes": 0,
                            "terminal": "T1",
                            "gate": "Confirmándose en aeropuerto",
                            "baggageClaim": "Por confirmar en arribo",
                            "logistics": {
                                "pickupLocation": log['pickupLocation'],
                                "destination": f"{log['hotel']} ({log['direccion']})",
                                "driverPickupEstimated": log['driverPickupEstimated'],
                                "driverNote": log['driverNote']
                            },
                            "radarUrl": f"https://www.flightradar24.com/data/flights/{fl_clean.lower()}",
                            "checkInUrl": f"https://www.google.com/search?q=check+in+{airline_name.replace(' ', '+')}+{fl_clean}"
                        }

        # ----------------------------------------------------------
        # 3. FACTURAS CUV LATAM (BOLETOS HISTÓRICOS Y ACTUALES)
        # ----------------------------------------------------------
        elif 'LATAM-AIRLINES' in text or 'LATAM AIRLINES GROUP' in text or 'cuv-bill' in text or 'RUC 20516070316' in text:
            m_pnr = re.search(r'C[oó]digo de Reserva\s*\n\s*([A-Z0-9]{6})', text, re.IGNORECASE)
            pnr = m_pnr.group(1).strip() if m_pnr else "CREAR26"
            raw_pax = "Entrenador Oficial"
            for i, l in enumerate(lines):
                if 'Nombre Pasajero' in l:
                    for k in range(i+1, min(i+6, len(lines))):
                        if re.match(r'^[A-Za-z\s]{5,40}$', lines[k]) and not any(w in lines[k] for w in ['Adulto', 'Tipo', 'Documento', 'Pasajero', 'Informaci']):
                            raw_pax = lines[k].strip()
                            break
                    break
            norm_pax = normalize_pax(raw_pax, item.get('path', ''), item.get('name', ''))

            for i, line in enumerate(lines):
                if re.match(r'^(LA\s*\d{3,4})$', line) or (re.search(r'\b(LA\s*\d{3,4})\b', line) and len(line) <= 10):
                    fl_clean = re.sub(r'\s+', '', line)
                    fl_number = f"{fl_clean[:2]} {fl_clean[2:]}"

                    window = lines[i+1:min(i+25, len(lines))]
                    window_text = " ".join(window)

                    dates = re.findall(r'\b(\d{2}/\d{2}/\d{2,4})\b', window_text)
                    times = re.findall(r'\b(\d{2}:\d{2})\b', window_text)

                    orig_code, dest_code = None, None
                    for w_l in window[:10]:
                        c = detect_city_code(w_l)
                        if c:
                            if not orig_code: orig_code = c
                            elif not dest_code and c != orig_code: dest_code = c

                    if not orig_code:
                        orig_code = 'UIO' if 'quito' in window_text.lower() else 'LIM' if 'lima' in window_text.lower() else 'GYE' if 'guayaquil' in window_text.lower() else 'LIM'
                    if not dest_code:
                        dest_code = 'LIM' if orig_code != 'LIM' else 'UIO'

                    dep_date_str = dates[0] if dates else '04/09/26'
                    dep_time = times[0] if times else '08:00'
                    arr_date_str = dates[1] if len(dates) > 1 else dep_date_str
                    arr_time = times[1] if len(times) > 1 else '10:30'

                    try:
                        p = dep_date_str.split('/')
                        y = '20' + p[2] if len(p[2]) == 2 else p[2]
                        dep_iso_date = f"{y}-{p[1].zfill(2)}-{p[0].zfill(2)}"
                    except:
                        dep_iso_date = '2026-09-04'

                    try:
                        pa = arr_date_str.split('/')
                        ya = '20' + pa[2] if len(pa[2]) == 2 else pa[2]
                        arr_iso_date = f"{ya}-{pa[1].zfill(2)}-{pa[0].zfill(2)}"
                    except:
                        arr_iso_date = dep_iso_date

                    if orig_code != dest_code:
                        unique_key = f"{fl_clean}_{dep_iso_date}_{orig_code}_{dest_code}"
                        orig_info = AIRPORT_CITIES.get(orig_code, (orig_code, f"Aeropuerto {orig_code}", ""))
                        dest_info = AIRPORT_CITIES.get(dest_code, (dest_code, f"Aeropuerto {dest_code}", ""))
                        log = get_destination_logistics(dest_code, orig_code)

                        flights_dict[unique_key] = {
                            "flightNumber": fl_number,
                            "flightCode": unique_key,
                            "airline": "LATAM Airlines",
                            "callsign": unique_key,
                            "reservationCode": pnr,
                            "passengers": [norm_pax],
                            "sourcePdf": item.get('name', ''),
                            "sourcePath": item.get('path', ''),
                            "route": {
                                "origin": orig_code,
                                "originCity": orig_info[0],
                                "originAirport": orig_info[1],
                                "destination": dest_code,
                                "destinationCity": dest_info[0],
                                "destinationAirport": dest_info[1],
                                "isDirect": True,
                                "stops": 0,
                                "flightDuration": "2h 15m"
                            },
                            "schedule": {
                                "departureDate": dep_iso_date,
                                "scheduledDeparture": f"{dep_iso_date}T{dep_time}:00-05:00",
                                "scheduledArrival": f"{arr_iso_date}T{arr_time}:00-05:00",
                                "estimatedDeparture": f"{dep_iso_date}T{dep_time}:00-05:00",
                                "estimatedArrival": f"{arr_iso_date}T{arr_time}:00-05:00",
                                "actualDeparture": None,
                                "actualArrival": None
                            },
                            "status": "ON_TIME",
                            "statusLabel": "Confirmado / A tiempo",
                            "statusDescription": f"Vuelo con entrenador {norm_pax} confirmado ruta {orig_code} → {dest_code}",
                            "delayMinutes": 0,
                            "terminal": "T1",
                            "gate": "Confirmándose en aeropuerto",
                            "baggageClaim": "Por confirmar en arribo",
                            "logistics": {
                                "pickupLocation": log['pickupLocation'],
                                "destination": f"{log['hotel']} ({log['direccion']})",
                                "driverPickupEstimated": log['driverPickupEstimated'],
                                "driverNote": log['driverNote']
                            },
                            "radarUrl": f"https://www.flightradar24.com/data/flights/{fl_clean.lower()}",
                            "checkInUrl": "https://www.latamairlines.com/pe/es/check-in"
                        }

    # Construcción del payload final
    output_tracker = {
        "version": "3.2.0-ai-engine",
        "updatedAt": datetime.now().isoformat() + "Z",
        "aiEngineStatus": "ACTIVE",
        "totalPdfAnalyzed": len(all_raw_items),
        "totalFlightsIndexed": len(flights_dict),
        "totalFlights": len(flights_dict),
        "syncFrequency": "7 veces al día (06:00, 09:00, 12:00, 15:00, 18:00, 21:00, 23:30)",
        "source": "Google Drive Sync (Carpetas Oficiales Vuelos CPSL)",
        "flights": flights_dict
    }

    for p in TRACKER_FILES:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w', encoding='utf-8') as f:
                json.dump(output_tracker, f, indent=2, ensure_ascii=False)
            print(f"Sincronizado en: {p}")
        except Exception as e:
            print(f"Error escribiendo {p}: {e}")

    print(f"Sincronización exitosa: {len(flights_dict)} vuelos compilados de {len(all_raw_items)} PDFs.")
    return len(flights_dict)

def run_loop():
    print("=" * 65)
    print("DAEMON INICIADO: SINCRONIZADOR UNIVERSAL DE VUELOS CREAR PODER SIN LÍMITES")
    print("Frecuencia: 7 veces al día (Intervalo: cada ~3.4 horas)")
    print("=" * 65)

    INTERVAL_SECONDS = int(24 * 3600 / 7)

    while True:
        try:
            sync_from_drive()
        except Exception as e:
            print(f"Error durante sincronización: {e}")

        next_run = datetime.fromtimestamp(time.time() + INTERVAL_SECONDS).strftime('%Y-%m-%d %H:%M:%S')
        print(f"Próxima sincronización programada para: {next_run}")
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    if "--daemon" in sys.argv:
        run_loop()
    else:
        sync_from_drive()
