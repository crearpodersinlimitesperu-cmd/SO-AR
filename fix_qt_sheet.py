import urllib.request
import re
import json

url = 'https://docs.google.com/spreadsheets/d/10sz7KNvZ31GOgGDhzH0P3gbISGLW8HPBsSAZwOw5L8U/export?format=csv'
response = urllib.request.urlopen(url)
content = response.read().decode('utf-8')

# Manual CSV parser that handles quoted fields with commas inside
def parse_csv_line(line):
    fields = []
    current = ''
    in_quotes = False
    for ch in line:
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == ',' and not in_quotes:
            fields.append(current.strip().strip('"'))
            current = ''
        else:
            current += ch
    fields.append(current.strip().strip('"'))
    return fields

lines = content.split('\n')
headers = parse_csv_line(lines[0])
print('Columnas:', headers)
print('Total filas de datos:', len(lines) - 1)
print()

email_regex = re.compile(r'^[\w\.\-]+@[\w\.\-]+\.\w+$')
no_email_rows = []
all_users = []

for i, line in enumerate(lines[1:], start=2):
    if not line.strip():
        continue
    
    row_vals = parse_csv_line(line)
    row = dict(zip(headers, row_vals))
    
    # Find email anywhere in row
    found_email = ''
    for key, val in row.items():
        v = val.strip().lower()
        if '@' in v and '.' in v and ' ' not in v and email_regex.match(v):
            found_email = v
            break
    
    name = row.get('Nombres y Apellidos', '').strip()
    sede = row.get('Sede Base', '').strip()
    
    if not found_email:
        no_email_rows.append({
            'sheet_row': i,
            'name': name,
            'sede': sede,
            'all_values': row
        })
    else:
        all_users.append({
            'name': name,
            'email': found_email,
            'sede': sede
        })

print(f'Usuarios válidos: {len(all_users)}')
print(f'Filas sin email: {len(no_email_rows)}')
print()
for r in no_email_rows:
    print(f"FILA {r['sheet_row']}: {r['name']} | Sede: {r['sede']}")
    print(f"  Valores: {r['all_values']}")
    print()

# Save valid users for use later
with open('c:/Users/josem/Downloads/cpsl-base-template/qt_valid_users.json', 'w', encoding='utf-8') as f:
    json.dump(all_users, f, ensure_ascii=False, indent=2)
print(f'Guardados {len(all_users)} usuarios válidos en qt_valid_users.json')
