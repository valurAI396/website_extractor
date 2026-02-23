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
  clientEmail?: string
}

export async function createClientDocument(data: DocumentData): Promise<{ docUrl: string; docId: string }> {
  // Rather than parsing a huge JSON string (which routinely breaks on Vercel),
  // we rely on two explicit environment variables
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL_FALLBACK
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY_FALLBACK

  if (!clientEmail || !privateKeyRaw) {
    throw new Error('As variáveis de ambiente do Google (GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY) não estão configuradas corretamente no Vercel.')
  }

  // Vercel sometimes double-escapes them, so we catch both \n and \\n
  let formattedPrivateKey = privateKeyRaw.replace(/\\n/g, '\n')

  // Node's crypto library strict checks the PEM headers.
  // If the user copied the key without the BEGIN/END tags, we must wrap it.
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`
  }

  const credentials = {
    client_email: clientEmail,
    private_key: formattedPrivateKey,
  }

  // Create auth client
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive',
    ],
  })

  const docs = google.docs({ version: 'v1', auth })
  const drive = google.drive({ version: 'v3', auth })

  // Create the document
  const createResponse = await docs.documents.create({
    requestBody: {
      title: `${data.projectName} — Informações para o Website`,
    },
  })

  const documentId = createResponse.data.documentId!

  // Build the document content
  const requests: any[] = []
  let currentIndex = 1

  // Helper to add text
  const addText = (text: string, bold = false, fontSize = 11) => {
    const endIndex = currentIndex + text.length
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: text,
      },
    })
    if (bold || fontSize !== 11) {
      requests.push({
        updateTextStyle: {
          range: { startIndex: currentIndex, endIndex },
          textStyle: {
            bold: bold,
            fontSize: { magnitude: fontSize, unit: 'PT' },
          },
          fields: bold ? 'bold,fontSize' : 'fontSize',
        },
      })
    }
    currentIndex = endIndex
  }

  // Title
  addText(`${data.projectName}\n`, true, 24)
  addText('Informações para o Website\n\n', false, 14)

  // Instructions
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)
  addText('INSTRUÇÕES\n', true, 14)
  addText('Este documento contém todos os textos do seu website. Por favor:\n', false, 11)
  addText('1. Reveja cada secção e edite o texto conforme necessário\n', false, 11)
  addText('2. Substitua os textos de exemplo pelos seus textos reais\n', false, 11)
  addText('3. Preencha as secções de imagens e domínio no final\n\n', false, 11)
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)

  // Sections from extraction
  addText('📝 TEXTOS DO WEBSITE\n\n', true, 16)

  for (const section of data.sections) {
    addText(`${section.section}\n`, true, 13)
    addText(`📍 Localização: ${section.location}\n`, false, 10)
    addText(`📄 Página: ${section.page}\n\n`, false, 10)
    addText(`${section.text}\n\n`, false, 11)
    addText('---\n\n', false, 11)
  }

  // Images section
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)
  addText('🖼️ IMAGENS NECESSÁRIAS\n\n', true, 16)
  addText('Por favor envie as seguintes imagens:\n\n', false, 11)
  addText('☐ Logo da empresa (PNG com fundo transparente, alta qualidade)\n\n', false, 11)
  addText('☐ Foto do proprietário/equipa\n\n', false, 11)
  addText('☐ Fotos do espaço/estabelecimento (mínimo 3)\n\n', false, 11)
  addText('☐ Fotos dos produtos/serviços\n\n', false, 11)
  addText('☐ Outras imagens relevantes: _______________\n\n', false, 11)
  addText('\n📧 Envie as imagens para: [email a definir]\n\n', false, 11)

  // Domain section
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)
  addText('🌐 DOMÍNIO\n\n', true, 16)
  addText('Já tem um domínio registado?\n', false, 11)
  addText('☐ Sim → Qual? _______________\n', false, 11)
  addText('☐ Não → Que domínio pretende? (ex: suaempresa.pt) _______________\n\n', false, 11)
  addText('Nota: Podemos ajudar no registo e configuração do domínio.\n\n', false, 11)

  // Contact info section
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)
  addText('📞 INFORMAÇÕES DE CONTACTO\n\n', true, 16)
  addText('(Confirme se estão corretas ou preencha)\n\n', false, 11)
  addText('Email: _______________\n\n', false, 11)
  addText('Telefone: _______________\n\n', false, 11)
  addText('WhatsApp: _______________\n\n', false, 11)
  addText('Morada: _______________\n\n', false, 11)
  addText('Horário de funcionamento: _______________\n\n', false, 11)

  // Social media
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)
  addText('📱 REDES SOCIAIS\n\n', true, 16)
  addText('Instagram: _______________\n\n', false, 11)
  addText('Facebook: _______________\n\n', false, 11)
  addText('LinkedIn: _______________\n\n', false, 11)
  addText('TikTok: _______________\n\n', false, 11)
  addText('Outras: _______________\n\n', false, 11)

  // Next steps
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', false, 11)
  addText('✅ PRÓXIMOS PASSOS\n\n', true, 16)
  addText('1. Preencha/reveja todos os textos acima\n', false, 11)
  addText('2. Envie as imagens solicitadas\n', false, 11)
  addText('3. Confirme o domínio\n', false, 11)
  addText('4. Nós tratamos do resto!\n\n', false, 11)
  addText('Prazo de entrega: 24 horas após receção de todos os materiais.\n\n', false, 11)

  // Footer
  addText('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', false, 11)
  addText('Documento gerado automaticamente por Whenevr\n', false, 9)
  addText(`Data: ${new Date().toLocaleDateString('pt-PT')}\n`, false, 9)

  // Apply all updates
  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests },
  })

  // Make the document accessible (anyone with link can edit)
  await drive.permissions.create({
    fileId: documentId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
    },
  })

  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`

  return { docUrl, docId: documentId }
}
