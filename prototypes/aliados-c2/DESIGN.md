---
name: Guía de Aliados C2
description: Sistema visual observado en el prototipo local de consulta para Aliados C2.
colors:
  blue: "#122c48"
  gold: "#ffc107"
  gold-hover: "#ffda55"
  muted: "#506174"
  line: "#cdd6df"
  canvas: "#f1f4f7"
  white: "#ffffff"
  pale-surface: "#e2eaf0"
  pale-text: "#d7e4ef"
  selected-surface: "#e4ebf1"
  focus: "#006fba"
  success: "#145538"
  dark-divider: "#627a91"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(35px, 4.2vw, 60px)"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-.035em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "3px"
  md: "4px"
  lg: "5px"
components:
  primary-link:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.blue}"
    rounded: "{rounded.sm}"
    padding: "14px 18px"
  primary-link-hover:
    backgroundColor: "{colors.gold-hover}"
---

# Design System: Guía de Aliados C2

## Overview

Este registro describe solo el prototipo local Guía de Aliados C2; no es el sistema global de diseño de Causa OS. La paleta azul y dorada está presente en la implementación y se registra como evidencia del código, no como confirmación visual directa del usuario.

La interfaz organiza la guía en fases, filas de horario, consulta desplegable y preparación local. Usa tipografía de sistema, superficies claras, divisores y una composición que pasa de navegación lateral y contenido en columnas a una sola columna en pantallas estrechas.

**Key Characteristics:**
- Colores y estados extraídos de `prototypes/aliados-c2/style.css`.
- Rejilla de consulta con navegación por fase, agenda y panel de preparación.
- Sin sombras declaradas; los límites se muestran mediante fondos y bordes.

## Colors

El código combina azul oscuro y dorado en identidad, acciones y numeración; grises azulados y blanco estructuran lectura, separadores y estados.

### Primary
- **Azul CREAR** (`blue`): fondo de apertura, texto principal y elementos activos de navegación.
- **Dorado de señal** (`gold`): énfasis del título, acción principal y marcadores de fase.

### Secondary
- **Dorado de hover** (`gold-hover`): realce de la acción principal al pasar el puntero.

### Neutral
- **Tinta secundaria** (`muted`): descripciones, etiquetas y texto auxiliar.
- **Línea** (`line`): separadores de navegación, agenda y consulta.
- **Lienzo claro** (`canvas`): fondo general.
- **Blanco** (`white`): superficies de cabecera, controles y preparación.
- **Superficie azul grisácea** (`pale-surface`): avisos y notas de cuidado.
- **Texto claro** (`pale-text`): texto secundario sobre la apertura oscura.
- **Superficie seleccionada** (`selected-surface`): fase seleccionada y hover de navegación.
- **Azul de foco** (`focus`): foco visible y hover del resumen desplegable.
- **Verde de confirmación** (`success`): preparación guardada o revisada.
- **Divisor sobre fondo oscuro** (`dark-divider`): separadores dentro de la apertura.

## Typography

**Display Font:** Pila del sistema (`-apple-system`, BlinkMacSystemFont, Segoe UI, sans-serif)

**Body Font:** La misma pila de sistema.

**Character:** La implementación mantiene una sola familia tipográfica sans-serif; la jerarquía se expresa con tamaño, peso y espaciado.

### Hierarchy
- **Display** (750, `clamp(35px, 4.2vw, 60px)`, line-height 1.05): título de apertura; en vista estrecha se reduce mediante reglas responsive.
- **Title** (700, 28px, line-height 1.2): encabezados de sección; el tamaño cambia en móvil.
- **Body** (400, 16px, line-height 1.65): texto base de párrafo, con ancho máximo de 72ch.

## Layout

El contenedor principal tiene un máximo de 1600px. En escritorio, el índice ocupa 240px junto al contenido; desde 1150px pasa a 185px. Desde 900px el índice y el contenido se apilan, y el índice de fases se dispone en cuatro columnas. Desde 650px, la agenda y el panel de preparación se apilan y la tira de fases usa dos columnas. A partir de 1400px, el panel lateral de preparación aumenta de 310px a 350px.

El ritmo se apoya en separaciones de sección de 30–40px, bordes entre filas y padding interno específico por componente; no hay una escala de espaciado común declarada.

## Elevation & Depth

No hay sombras en la hoja de estilos. La separación se consigue con fondos blancos o azul-grisáceos, líneas finas, el borde superior dorado del panel de preparación y el contraste de la apertura azul.

## Shapes

Las superficies son mayoritariamente rectangulares, con radios pequeños observados de 3px en acciones y controles, 4px en navegación y 5px en el botón de impresión. Los índices de fase son circulares; los números principales de fase son cuadrados.

## Components

### Primary action
- **Shape:** rectangular, radio pequeño (3px).
- **Color y tamaño:** fondo dorado, texto azul, padding 14px 18px.
- **Hover / Focus:** el hover aclara el dorado; los elementos interactivos usan el contorno global de foco visible.

### Navigation
- **Fases:** enlaces con número, texto y separador inferior; el activo recibe fondo azul grisáceo y marcador dorado.
- **Responsive:** el índice lateral se transforma en una fila de cuatro columnas desde 900px.

### Schedule rows
- **Estructura:** columna de hora de 104px, texto del evento y divisor inferior; en anchos de 1150px o menos, hora y texto se apilan.

### Preparation checklist
- **Panel:** superficie blanca, padding 26px 24px y borde superior dorado de 4px.
- **Items:** controles alineados con el texto, separadores superiores y color de confirmación cuando están marcados.

### Disclosures
- **Estructura:** resumen con altura mínima de 60px y borde inferior.
- **State:** el signo más rota al abrirse; se desactiva la transición cuando se prefiere movimiento reducido.

## Do's and Don'ts

### Do:
- **Do** mantener el alcance documental en el prototipo `prototypes/aliados-c2`.
- **Do** conservar el contraste de foco visible de 3px con offset de 4px observado en la hoja de estilos.
- **Do** mantener las filas de agenda y preparación legibles al apilarse en móvil.

### Don't:
- **Don't** presentar los colores de este prototipo como tokens globales de Causa OS o como una confirmación visual directa del usuario.
- **Don't** añadir sombras como regla del sistema: no aparecen en la implementación observada.
