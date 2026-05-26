import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Ganado } from '@/api/ganado'

function filas(animales: Ganado[]) {
  return animales.map((a) => [
    a.arete,
    a.nombre ?? '—',
    a.raza,
    a.finca?.nombre ?? '—',
    a.estado_comercial?.nombre ?? '—',
    a.estado_salud?.nombre ?? '—',
  ])
}

const CABECERAS = ['Arete', 'Nombre', 'Raza', 'Finca', 'Estado', 'Salud']

export function exportarPDF(animales: Ganado[], titulo = 'Reporte de Ganado') {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(titulo, 14, 16)
  doc.setFontSize(10)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CR')}`, 14, 23)

  autoTable(doc, {
    head: [CABECERAS],
    body: filas(animales),
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 139, 87] },
  })

  doc.save(`${titulo.replace(/\s+/g, '_')}.pdf`)
}

export function exportarExcel(animales: Ganado[], titulo = 'Reporte de Ganado') {
  const datos = [
    CABECERAS,
    ...filas(animales),
  ]

  const hoja = XLSX.utils.aoa_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Ganado')
  XLSX.writeFile(libro, `${titulo.replace(/\s+/g, '_')}.xlsx`)
}
