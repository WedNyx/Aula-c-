// Gerador de .xlsx DE VERDADE, sem biblioteca externa.
// Um .xlsx é só um arquivo zip com XMLs dentro — aqui montamos o zip (sem compressão)
// e os XMLs mínimos (workbook, planilha, estilos). Isso resolve o aviso de
// "arquivo pode estar corrompido" que o truque antigo (HTML fingindo ser .xls)
// disparava no celular: agora o arquivo É um Excel legítimo.

// ── zip (método "stored", sem compressão — planilha é pequena, não precisa) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function makeZip(entries) {
  // entries: [{ name, data: Uint8Array }]
  const enc = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1 // data fixa qualquer — não importa pro Excel
  for (const { name, data } of entries) {
    const nameBytes = enc.encode(name)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)          // versão mínima
    local.setUint16(6, 0, true)           // flags
    local.setUint16(8, 0, true)           // método 0 = stored
    local.setUint16(10, 0, true)          // hora
    local.setUint16(12, dosDate, true)    // data
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    local.setUint16(28, 0, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)

    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, 0, true)
    cd.setUint16(14, dosDate, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, data.length, true)
    cd.setUint32(24, data.length, true)
    cd.setUint16(28, nameBytes.length, true)
    cd.setUint32(42, offset, true)
    central.push(new Uint8Array(cd.buffer), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const cdStart = offset
  let cdSize = 0
  central.forEach(p => { cdSize += p.length })
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, cdStart, true)
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ── XMLs do Excel ──
const escXml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const colLetter = (i) => { let s = ''; i++; while (i > 0) { s = String.fromCharCode(65 + ((i - 1) % 26)) + s; i = Math.floor((i - 1) / 26) } return s }

/**
 * Monta um .xlsx estilizado.
 * rows: [{ cells:[{ v, st:{ b,i,sz,color,fill,border,align,wrap } }], ht }]
 *   v: string ou número · color/fill: "RRGGBB" · align: "left"|"center"|"right"
 * merges: ["A1:E1", ...] · colWidths: [34,16,...] · sheetName: nome da aba
 */
export function xlsxBlob({ sheetName = 'Planilha', colWidths = [], rows = [], merges = [] }) {
  // interna fontes/preenchimentos/estilos: cada combinação única vira um id
  const fonts = ['<font><sz val="11"/><name val="Calibri"/></font>']
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border>' + ['left','right','top','bottom'].map(s => `<${s} style="thin"><color rgb="FFD9DCEA"/></${s}>`).join('') + '<diagonal/></border>']
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  const fontIds = { '': 0 }, fillIds = { '': 0 }, xfIds = { '': 0 }

  const styleId = (st) => {
    if (!st) return 0
    const fKey = `${st.b?1:0}|${st.i?1:0}|${st.sz||11}|${st.color||''}`
    if (!(fKey in fontIds)) {
      fontIds[fKey] = fonts.length
      fonts.push(`<font>${st.b?'<b/>':''}${st.i?'<i/>':''}<sz val="${st.sz||11}"/>${st.color?`<color rgb="FF${st.color}"/>`:''}<name val="Calibri"/></font>`)
    }
    const lKey = st.fill || ''
    if (!(lKey in fillIds)) {
      fillIds[lKey] = fills.length
      fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${st.fill}"/></patternFill></fill>`)
    }
    const xKey = `${fontIds[fKey]}|${fillIds[lKey]}|${st.border?1:0}|${st.align||''}|${st.wrap?1:0}`
    if (!(xKey in xfIds)) {
      xfIds[xKey] = xfs.length
      const alignXml = (st.align || st.wrap) ? `<alignment ${st.align?`horizontal="${st.align}"`:''} vertical="center" ${st.wrap?'wrapText="1"':''}/>` : ''
      xfs.push(`<xf numFmtId="0" fontId="${fontIds[fKey]}" fillId="${fillIds[lKey]}" borderId="${st.border?1:0}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${alignXml?' applyAlignment="1"':''}>${alignXml}</xf>`)
    }
    return xfIds[xKey]
  }

  const rowsXml = rows.map((row, ri) => {
    const cells = (row.cells || []).map((c, ci) => {
      const s = styleId(c.st)
      const ref = `${colLetter(ci)}${ri + 1}`
      if (typeof c.v === 'number') return `<c r="${ref}" s="${s}"><v>${c.v}</v></c>`
      if (c.v == null || c.v === '') return `<c r="${ref}" s="${s}"/>`
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escXml(c.v)}</t></is></c>`
    }).join('')
    return `<row r="${ri + 1}"${row.ht ? ` ht="${row.ht}" customHeight="1"` : ''}>${cells}</row>`
  }).join('')

  const colsXml = colWidths.length
    ? `<cols>${colWidths.map((w, i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''
  const mergesXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''

  const xml = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colsXml}<sheetData>${rowsXml}</sheetData>${mergesXml}</worksheet>`,
  }

  const enc = new TextEncoder()
  return makeZip(Object.entries(xml).map(([name, text]) => ({ name, data: enc.encode(text) })))
}
