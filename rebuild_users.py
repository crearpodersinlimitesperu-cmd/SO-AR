import json
import re

# Load valid QT users extracted from fresh sheet
with open('c:/Users/josem/Downloads/cpsl-base-template/qt_valid_users.json', 'r', encoding='utf-8') as f:
    qt_users = json.load(f)

# Load corporate users
with open('c:/Users/josem/.gemini/antigravity-ide/brain/3d9533f2-891e-4e10-a656-921a1d472e9d/scratch/users_to_import.json', 'r', encoding='utf-8') as f:
    corporate_users = json.load(f)

# Build corporate email set to avoid duplicates
corp_emails = set()
for u in corporate_users:
    for e in u.get('emails', []):
        corp_emails.add(e.lower())

# Build clean QT list, deduped by email
seen_emails = set()
formatted_qts = []
skipped = []

for u in qt_users:
    email = u['email'].lower().strip()
    name = u['name'].strip()
    
    if not name or name == 'nan':
        skipped.append({'reason': 'sin nombre', 'email': email})
        continue
    if email in seen_emails:
        skipped.append({'reason': 'duplicado', 'name': name, 'email': email})
        continue
    if email in corp_emails:
        skipped.append({'reason': 'ya es corporativo', 'name': name, 'email': email})
        continue
    
    seen_emails.add(email)
    clean_name = re.sub(r'[^a-z0-9]', '', name.lower())
    formatted_qts.append({
        'id': 'qt_' + clean_name,
        'name': name,
        'role': 'qt',
        'sede': u['sede'],
        'emails': [email]
    })

all_users = corporate_users + formatted_qts

# Write clean usersToImport.js
js_content = 'export const USERS_TO_IMPORT = [\n'
js_content += ',\n'.join(json.dumps(u, indent=2, ensure_ascii=False) for u in all_users)
js_content += '\n];\n'

with open('c:/Users/josem/Downloads/cpsl-base-template/src/data/usersToImport.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Total corporativos: {len(corporate_users)}")
print(f"Total QT validos unicos: {len(formatted_qts)}")
print(f"Total general: {len(all_users)}")
print(f"Omitidos: {len(skipped)}")
print()
print("QTs guardados:")
for u in formatted_qts:
    print(f"  {u['name']} [{u['sede']}] -> {u['emails'][0]}")
print()
if skipped:
    print("Omitidos:")
    for s in skipped:
        print(f"  {s}")
