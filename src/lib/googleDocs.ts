import { google } from 'googleapis'

interface Section {
  page: string
  section: string
  location: string
  text: string
}

interface DocumentData {
  projectName: string
  sections: Section[]
}

export async function createClientDocument(data: DocumentData): Promise<{ docUrl: string; docId: string }> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL_FALLBACK
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY_FALLBACK

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('As variáveis de ambiente do Google (GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY) não estão configuradas corretamente.')
  }

  let formattedPrivateKey = privateKeyRaw.replace(/\\n/g, '\n')
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: formattedPrivateKey },
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ],
  })

  const docs = google.docs({ version: 'v1', auth })
  const drive = google.drive({ version: 'v3', auth })

  const fileMetadata: any = {
    name: `${data.projectName} — Conteúdo do Website`,
    mimeType: 'application/vnd.google-apps.document',
  }
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID]
  }

  const createResponse = await drive.files.create({ requestBody: fileMetadata })
  const documentId = createResponse.data.id!

  const requests: any[] = []
  let idx = 1

  const insert = (text: string) => {
    requests.push({ insertText: { location: { index: idx }, text } })
    idx += text.length
  }

  const style = (start: number, end: number, opts: {
    bold?: boolean
    fontSize?: number
    italic?: boolean
    rgb?: { red: number; green: number; blue: number }
  }) => {
    const textStyle: any = {}
    const fields: string[] = []
    if (opts.bold !== undefined) { textStyle.bold = opts.bold; fields.push('bold') }
    if (opts.fontSize !== undefined) { textStyle.fontSize = { magnitude: opts.fontSize, unit: 'PT' }; fields.push('fontSize') }
    if (opts.italic !== undefined) { textStyle.italic = opts.italic; fields.push('italic') }
    if (opts.rgb) { textStyle.foregroundColor = { color: { rgbColor: opts.rgb } }; fields.push('foregroundColor') }
    requests.push({
      updateTextStyle: {
        range: { startIndex: start, endIndex: end },
        textStyle,
        fields: fields.join(','),
      },
    })
  }

  const heading = (start: number, end: number, level: 1 | 2 | 3 | 4) => {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: start, endIndex: end },
        paragraphStyle: { namedStyleType: `HEADING_${level}` },
        fields: 'namedStyleType',
      },
    })
  }

  // ── Document Title ──────────────────────────────────────────────────────────
  let s = idx
  insert(`${data.projectName}\n`)
  heading(s, idx, 1)

  s = idx
  insert(`Conteúdo do Website  ·  Extraído em ${new Date().toLocaleDateString('pt-PT')}\n\n`)
  style(s, idx, { fontSize: 11, italic: true, rgb: { red: 0.4, green: 0.4, blue: 0.4 } })

  // ── Instructions ────────────────────────────────────────────────────────────
  s = idx
  insert('Instruções\n')
  heading(s, idx, 2)

  s = idx
  insert('Este documento contém todo o texto extraído do website, organizado por página e secção. Por favor:\n\n')
  style(s, idx, { fontSize: 11 })

  for (const line of [
    '1. Reveja cada secção e edite o texto conforme necessário',
    '2. Substitua os textos de exemplo pelos textos reais e corretos',
    '3. Preencha as secções de imagens, domínio e contactos no final',
  ]) {
    s = idx
    insert(`${line}\n`)
    style(s, idx, { fontSize: 11 })
  }
  insert('\n')

  // ── Website Content (grouped by page) ───────────────────────────────────────
  s = idx
  insert('Conteúdo por Página\n')
  heading(s, idx, 2)
  insert('\n')

  const pageGroups = new Map<string, Section[]>()
  for (const section of data.sections) {
    const page = section.page || 'Geral'
    if (!pageGroups.has(page)) pageGroups.set(page, [])
    pageGroups.get(page)!.push(section)
  }

  for (const [pageName, pageSections] of Array.from(pageGroups.entries())) {
    // Page name — H3
    s = idx
    insert(`${pageName}\n`)
    heading(s, idx, 3)
    insert('\n')

    for (const section of pageSections) {
      // Section name — H4
      s = idx
      insert(`${section.section}\n`)
      heading(s, idx, 4)

      // Location (small, muted)
      s = idx
      insert(`📍 ${section.location}\n\n`)
      style(s, idx, { fontSize: 10, italic: true, rgb: { red: 0.5, green: 0.5, blue: 0.5 } })

      // Section text
      s = idx
      insert(`${section.text}\n\n`)
      style(s, idx, { fontSize: 11 })

      // Divider
      s = idx
      insert('─────────────────────────────────────────────────\n\n')
      style(s, idx, { fontSize: 9, rgb: { red: 0.8, green: 0.8, blue: 0.8 } })
    }
  }

  // ── Required Images ──────────────────────────────────────────────────────────
  s = idx
  insert('Imagens Necessárias\n')
  heading(s, idx, 2)

  s = idx
  insert('Por favor envie as seguintes imagens:\n\n')
  style(s, idx, { fontSize: 11 })

  for (const item of [
    '☐ Logo da empresa (PNG com fundo transparente, alta qualidade)',
    '☐ Foto do proprietário/equipa',
    '☐ Fotos do espaço/estabelecimento (mínimo 3)',
    '☐ Fotos dos produtos/serviços',
    '☐ Outras imagens relevantes: _______________',
  ]) {
    s = idx
    insert(`${item}\n`)
    style(s, idx, { fontSize: 11 })
  }

  s = idx
  insert('\n📧 Envie as imagens para: [email a definir]\n\n')
  style(s, idx, { fontSize: 11 })

  // ── Domain ──────────────────────────────────────────────────────────────────
  s = idx
  insert('Domínio\n')
  heading(s, idx, 2)

  for (const line of [
    'Já tem um domínio registado?\n',
    '☐ Sim → Qual? _______________\n',
    '☐ Não → Que domínio pretende? (ex: suaempresa.pt) _______________\n\n',
  ]) {
    s = idx
    insert(line)
    style(s, idx, { fontSize: 11 })
  }

  // ── Contact Info ─────────────────────────────────────────────────────────────
  s = idx
  insert('Informações de Contacto\n')
  heading(s, idx, 2)

  s = idx
  insert('(Confirme ou corrija os seus dados de contacto)\n\n')
  style(s, idx, { fontSize: 11, italic: true })

  for (const field of ['Email', 'Telefone', 'WhatsApp', 'Morada', 'Horário de funcionamento']) {
    s = idx
    insert(`${field}: _______________\n\n`)
    style(s, idx, { fontSize: 11 })
  }

  // ── Social Media ─────────────────────────────────────────────────────────────
  s = idx
  insert('Redes Sociais\n')
  heading(s, idx, 2)

  for (const field of ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Outras']) {
    s = idx
    insert(`${field}: _______________\n\n`)
    style(s, idx, { fontSize: 11 })
  }

  // ── Next Steps ───────────────────────────────────────────────────────────────
  s = idx
  insert('Próximos Passos\n')
  heading(s, idx, 2)

  for (const step of [
    '1. Preencha/reveja todos os textos acima',
    '2. Envie as imagens solicitadas',
    '3. Confirme o domínio pretendido',
    '4. Nós tratamos do resto!',
  ]) {
    s = idx
    insert(`${step}\n`)
    style(s, idx, { fontSize: 11 })
  }

  insert('\n')
  s = idx
  insert('Prazo de entrega: 24 horas após receção de todos os materiais.\n\n')
  style(s, idx, { fontSize: 11, bold: true })

  // ── Footer ───────────────────────────────────────────────────────────────────
  s = idx
  insert('Documento gerado automaticamente por Whenevr\n')
  style(s, idx, { fontSize: 9, italic: true, rgb: { red: 0.6, green: 0.6, blue: 0.6 } })

  await docs.documents.batchUpdate({ documentId, requestBody: { requests } })

  await drive.permissions.create({
    fileId: documentId,
    requestBody: { role: 'writer', type: 'anyone' },
  })

  return { docUrl: `https://docs.google.com/document/d/${documentId}/edit`, docId: documentId }
}
