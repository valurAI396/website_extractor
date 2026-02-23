'use client'

import { useState, useCallback } from 'react'

interface ExtractorProps {
  onLogout: () => void
}

interface ExtractedSection {
  page: string
  section: string
  location: string
  text: string
}

interface ExtractionResult {
  projectName: string
  extractedAt: string
  sections: ExtractedSection[]
}

export default function Extractor({ onLogout }: ExtractorProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingDoc, setGeneratingDoc] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState('')
  const [projectName, setProjectName] = useState('')
  const [docUrl, setDocUrl] = useState<string | null>(null)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setFiles(prev => [...prev, ...selectedFiles])
    
    // Generate previews
    selectedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleExtract = async () => {
    if (files.length === 0) return
    
    setLoading(true)
    setError('')
    setResult(null)
    setDocUrl(null)

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })
      formData.append('projectName', projectName || 'Website')
      formData.append('fileCount', files.length.toString())

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Erro na extração')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError('Erro ao processar imagens. Tenta novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDoc = async () => {
    if (!result) return

    setGeneratingDoc(true)
    setError('')

    try {
      const res = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: result.projectName,
          sections: result.sections,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao gerar documento')
      }

      const data = await res.json()
      setDocUrl(data.docUrl)
      
      // Open in new tab
      window.open(data.docUrl, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar documento')
      console.error(err)
    } finally {
      setGeneratingDoc(false)
    }
  }

  const copyToClipboard = () => {
    if (!result) return
    
    let text = `# ${result.projectName} — Conteúdo do Website\n`
    text += `Extraído em: ${result.extractedAt}\n\n`
    text += `---\n\n`
    
    result.sections.forEach(section => {
      text += `## ${section.page} — ${section.section}\n`
      text += `📍 Localização: ${section.location}\n\n`
      text += `${section.text}\n\n`
      text += `---\n\n`
    })

    navigator.clipboard.writeText(text)
    alert('Copiado para a área de transferência!')
  }

  const reset = () => {
    setFiles([])
    setPreviews([])
    setResult(null)
    setError('')
    setProjectName('')
    setDocUrl(null)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Website Extractor</h1>
          <p className="text-gray-400 text-sm">Extrai texto de screenshots para onboarding</p>
        </div>
        <button
          onClick={onLogout}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Sair
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        {!result ? (
          <>
            {/* Project Name */}
            <div className="mb-6">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nome do projeto (ex: Clínica Dental Porto)"
                className="w-full max-w-md px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Upload Area */}
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl p-8 text-center cursor-pointer transition-colors">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-300 font-medium">Clica ou arrasta screenshots</p>
                  <p className="text-gray-500 text-sm mt-1">PNG, JPG até 10MB cada</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Previews */}
            {previews.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  {previews.length} screenshot{previews.length > 1 ? 's' : ''} selecionado{previews.length > 1 ? 's' : ''}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-800"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <span className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-1 rounded text-gray-300">
                        Página {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Extract Button */}
            <button
              onClick={handleExtract}
              disabled={files.length === 0 || loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  A extrair texto...
                </span>
              ) : (
                `Extrair Texto (${files.length} imagem${files.length > 1 ? 'ns' : ''})`
              )}
            </button>
          </>
        ) : (
          <>
            {/* Results Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{result.projectName}</h2>
                <p className="text-gray-400 text-sm">{result.sections.length} secções extraídas</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateDoc}
                  disabled={generatingDoc}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  {generatingDoc ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      A gerar...
                    </>
                  ) : (
                    <>📄 Gerar Google Doc</>
                  )}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  📋 Copiar Texto
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Nova Extração
                </button>
              </div>
            </div>

            {/* Doc URL */}
            {docUrl && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 font-medium mb-2">✅ Documento criado com sucesso!</p>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline break-all"
                >
                  {docUrl}
                </a>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Sections */}
            <div className="space-y-4">
              {result.sections.map((section, index) => (
                <div key={index} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{section.section}</h3>
                      <p className="text-gray-500 text-sm">
                        📄 {section.page} · 📍 {section.location}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(section.text)
                        alert('Secção copiada!')
                      }}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Copiar
                    </button>
                  </div>
                  <div className="bg-gray-950 rounded-lg p-4">
                    <pre className="text-gray-300 whitespace-pre-wrap text-sm font-mono">
                      {section.text}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
