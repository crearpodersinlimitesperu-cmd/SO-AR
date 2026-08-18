import re

with open('c:/Users/josem/Downloads/cpsl-base-template/original_checklist.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')

out_lines = []
start = False
for line in lines:
    m = re.match(r'^\d+:\s(.*)', line)
    if m:
        content = m.group(1)
        if 'export const roles = [' in content:
            start = True
        if start:
            out_lines.append(content)

out_lines.append("  { id: 'soar_29', role: 'gerente', cyclePhase: 'POST-MJ', task: 'Auditoría final y Cierre de Oro.', isCritical: true },")
out_lines.append("  { id: 'soar_30', role: 'coord_maestria', cyclePhase: 'POST-MJ', task: 'Consolidar métricas y entregar aprendizajes.', isCritical: true }")
out_lines.append("];")
out_lines.append("")
out_lines.append("export const getTasksByRole = (roleId) => checklistData.filter(t => t.role === roleId);")

with open('c:/Users/josem/Downloads/cpsl-base-template/src/data/checklistData.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out_lines))
