'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, UploadCloud, X, Copy, FileText, CheckCircle2, AlertCircle, Search, Settings, Home, ListTodo, Calendar, Users, FileStack, Zap, BarChart3, Menu, Plus, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

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
  const [url, setUrl] = useState('')
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('image')
  const { toast } = useToast()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    setFiles(prev => [...prev, ...selectedFiles])

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
    if (!projectName) {
      setError('Por favor, defina um nome para o projeto.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setDocUrl(null)

    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`file${index}`, file)
      })
      formData.append('projectName', projectName)
      formData.append('fileCount', files.length.toString())

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Erro na extração')

      const data = await res.json()
      setResult(data)
      toast({ title: "Sucesso!", description: "O texto foi extraído com sucesso." })
    } catch (err) {
      setError('Erro ao processar imagens. Tenta novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExtractUrl = async () => {
    if (!url) return
    if (!projectName) {
      setError('Por favor, defina um nome para o projeto.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setDocUrl(null)

    try {
      const res = await fetch('/api/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, projectName })
      })

      if (!res.ok) throw new Error('Erro na extração de URL')

      const data = await res.json()
      setResult(data)
      toast({ title: "Sucesso!", description: "O texto foi extraído do URL com sucesso." })
    } catch (err) {
      setError('Erro ao processar URL. Tenta novamente.')
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

      toast({ title: "Documento gerado!", description: "O Google Doc foi criado com sucesso." })
      window.open(data.docUrl, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar documento')
    } finally {
      setGeneratingDoc(false)
    }
  }

  const copyToClipboard = () => {
    if (!result) return

    let text = `# ${result.projectName} — Conteúdo do Website\n`
    text += `Extraído em: ${result.extractedAt}\n\n---\n\n`
    result.sections.forEach(section => {
      text += `## ${section.page} — ${section.section}\n📍 Localização: ${section.location}\n\n${section.text}\n\n---\n\n`
    })

    navigator.clipboard.writeText(text)
    toast({ title: "Copiado!", description: "O texto foi copiado para a área de transferência." })
  }

  const copySection = (copiedText: string) => {
    navigator.clipboard.writeText(copiedText)
    toast({ description: "Secção copiada para a área de transferência." })
  }

  const reset = () => {
    setFiles([])
    setPreviews([])
    setResult(null)
    setError('')
    setProjectName('')
    setUrl('')
    setDocUrl(null)
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans overflow-hidden">

      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card/50">
        {/* User profile mock */}
        <div className="p-4 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
              WE
            </div>
            <div>
              <p className="text-sm font-medium leading-none">Website Extractor</p>
              <p className="text-xs text-muted-foreground mt-1">Whenevr tool</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8 md:hidden text-muted-foreground">
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 px-3 py-6 space-y-1.5">
          <p className="px-2 text-xs font-semibold text-muted-foreground mb-4">Ferramentas</p>
          <Button
            variant={activeTab === 'image' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('image')}
            className={`w-full justify-start h-9 font-medium rounded-lg transition-colors ${activeTab === 'image' ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}
          >
            <ImageIcon className="mr-2 h-4 w-4" /> Extrator por Imagens
          </Button>
          <Button
            variant={activeTab === 'url' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('url')}
            className={`w-full justify-start h-9 font-medium rounded-lg transition-colors ${activeTab === 'url' ? 'bg-primary/20 text-primary-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}
          >
            <LinkIcon className="mr-2 h-4 w-4" /> Extrator por URL
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 bg-background">
          <div className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Extractor</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" onClick={onLogout} className="text-muted-foreground hover:text-foreground font-medium">
              Sair
            </Button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {activeTab === 'image' ? 'Extrator de Imagens' : 'Extrator de URL'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {activeTab === 'image' ? 'Faz upload de wireframes ou screenshots para extrair o conteúdo estruturado em texto.' : 'Extrai e estrutura automaticamente todo o conteúdo de texto a partir de qualquer link de website.'}
              </p>
            </div>

            {!result ? (
              <div className="grid grid-cols-1 gap-6 max-w-3xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">


                  <TabsContent value="image">
                    <Card className="border-border shadow-sm p-1 rounded-2xl bg-card">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Extração por Screenshot</CardTitle>
                        <CardDescription>Carrega imagens do wireframe ou design para processamento.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="projectNameImage" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Projeto</Label>
                          <Input
                            id="projectNameImage"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Ex: Website Institucional"
                            className="bg-secondary/30 h-10 border-border/50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carregar Screenshots</Label>
                          <label className="flex flex-col items-center justify-center w-full h-40 border border-dashed border-muted-foreground/30 bg-secondary/10 hover:bg-secondary/30 transition-colors rounded-xl cursor-pointer">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                              <UploadCloud className="w-8 h-8 mb-3 opacity-80" />
                              <p className="mb-1 text-sm font-medium">Clica ou arrasta as imagens</p>
                              <p className="text-xs opacity-70">PNG, JPG, WEBP • Max 10MB</p>
                            </div>
                            <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" disabled={loading} />
                          </label>
                        </div>

                        {previews.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagens ({previews.length})</Label>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                              {previews.map((preview, index) => (
                                <div key={index} className="relative group rounded-lg overflow-hidden border border-border/50 bg-secondary">
                                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                  <button
                                    onClick={(e) => { e.preventDefault(); removeFile(index); }}
                                    disabled={loading}
                                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {error && (
                          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                      <CardFooter className="pt-2 pb-6 border-t border-border/30 mt-4">
                        <Button onClick={handleExtract} disabled={files.length === 0 || !projectName || loading} className="w-full mt-4 h-10 rounded-lg font-medium">
                          {loading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A extrair...</>
                          ) : (
                            `Processar Imagens (${files.length})`
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>

                  <TabsContent value="url">
                    <Card className="border-border shadow-sm p-1 rounded-2xl bg-card">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Extração por URL</CardTitle>
                        <CardDescription>Extrai automaticamente o conteúdo de um website ativo.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="projectNameUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Projeto</Label>
                          <Input
                            id="projectNameUrl"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Ex: Landing Page SaaS"
                            className="bg-secondary/30 h-10 border-border/50"
                            disabled={loading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="websiteUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL da Página</Label>
                          <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="websiteUrl"
                              value={url}
                              onChange={(e) => setUrl(e.target.value)}
                              placeholder="https://exemplo.com"
                              className="bg-secondary/30 h-10 border-border/50 pl-10"
                              disabled={loading}
                              autoComplete="off"
                            />
                          </div>
                        </div>

                        {error && (
                          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                      <CardFooter className="pt-2 pb-6 border-t border-border/30 mt-4">
                        <Button onClick={handleExtractUrl} disabled={!url || !projectName || loading} className="w-full mt-4 h-10 rounded-lg font-medium">
                          {loading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A conectar...</>
                          ) : (
                            <span>Processar URL</span>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
                  <div>
                    <h2 className="text-xl font-semibold">{result.projectName}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.sections.length} secções extraídas • {result.extractedAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Button onClick={handleGenerateDoc} disabled={generatingDoc} className="flex-1 sm:flex-none h-10 rounded-lg">
                      {generatingDoc ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A gerar...</> : <><FileText className="mr-2 h-4 w-4" /> Google Doc</>}
                    </Button>
                    <Button variant="secondary" onClick={copyToClipboard} className="flex-1 sm:flex-none h-10 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border/50">
                      <Copy className="mr-2 h-4 w-4" /> Copiar Texto Completo
                    </Button>
                    <Button variant="ghost" onClick={reset} className="flex-1 sm:flex-none h-10 rounded-lg">
                      Nova Extração
                    </Button>
                  </div>
                </div>

                {docUrl && (
                  <Alert className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 !text-emerald-500" />
                    <AlertTitle>Google Doc criado</AlertTitle>
                    <AlertDescription>
                      <a href={docUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline font-medium break-all">{docUrl}</a>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Results Grid - matches the image's folder/card look */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Secções Extraídas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {result.sections.map((section, index) => (
                      <div key={index} className="flex flex-col rounded-2xl bg-card border border-border/50 p-5 hover:border-border transition-colors group">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-border/50">
                            <FileText className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                          <Badge variant="outline" className="bg-secondary/20 text-xs font-normal border-border/50">
                            {section.page}
                          </Badge>
                        </div>
                        <div className="mb-4">
                          <h4 className="font-semibold text-lg line-clamp-1">{section.section}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">📍 {section.location}</p>
                        </div>

                        <div className="flex-1 bg-secondary/20 rounded-xl p-3 mb-4 border border-border/30 max-h-32 overflow-y-auto">
                          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{section.text}</pre>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copySection(section.text)}
                          className="w-full bg-secondary hover:bg-secondary/80 border border-border/50 h-9 rounded-lg"
                        >
                          <Copy className="h-3.5 w-3.5 mr-2" /> Copiar Secção
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
