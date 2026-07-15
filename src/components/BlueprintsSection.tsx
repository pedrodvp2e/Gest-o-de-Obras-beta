import React, { useState, useRef } from 'react';
import { Blueprint, User } from '../types';
import { FileUp, Eye, Trash2, BookOpen, Clock, Tag, X, ChevronRight, FileText, Download } from 'lucide-react';

interface BlueprintsSectionProps {
  siteId: string;
  blueprints: Blueprint[];
  currentUser: User;
  onUploadBlueprint: (blueprintData: { title: string; description: string; fileData: string }) => Promise<void>;
  onDeleteBlueprint: (id: string) => Promise<void>;
}

export default function BlueprintsSection({ siteId, blueprints, currentUser, onUploadBlueprint, onDeleteBlueprint }: BlueprintsSectionProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Active blueprint for visual review (Analise de Projeto)
  const [activeBlueprint, setActiveBlueprint] = useState<Blueprint | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Read file and convert to Base64
  const handleFileChange = (file: File) => {
    if (!file) return;

    // Check size limit (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('O tamanho do desenho/projeto excede o limite seguro de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setFileName(file.name);
      if (!title) {
        // Auto-fill title with filename without extension
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      setError('');
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileBase64) {
      setError('Por favor informe o título e selecione uma planta baixa/desenho.');
      return;
    }

    setLoading(true);
    try {
      await onUploadBlueprint({ title, description, fileData: fileBase64 });
      setTitle('');
      setDescription('');
      setFileBase64('');
      setFileName('');
      setShowUploadModal(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o desenho técnico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="blueprints-container" className="space-y-6">
      {/* Top Header */}
      <div id="blueprints-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Projetos & Desenhos Técnicos</h2>
          <p className="text-xs text-slate-500 font-medium">Guarde plantas baixas, detalhes de engenharia e arquivos técnicos para análise de toda a equipe.</p>
        </div>

        {(currentUser.role === 'engineer' || currentUser.role === 'master_builder') && (
          <button
            id="open-upload-blueprint-modal"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            <FileUp className="h-4 w-4" />
            Anexar Desenho / Projeto
          </button>
        )}
      </div>

      {/* Grid List of Blueprints */}
      {blueprints.length === 0 ? (
        <div id="no-blueprints-view" className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-slate-700 text-sm">Nenhum projeto armazenado</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Adicione desenhos de projetos e plantas baixas desta obra para que fiquem visíveis aos encarregados e operários de campo.
          </p>
        </div>
      ) : (
        <div id="blueprints-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blueprints.map((blueprint) => {
            const isImage = blueprint.fileData.startsWith('data:image/');

            return (
              <div
                key={blueprint.id}
                id={`blueprint-card-${blueprint.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Image Thumbnail Preview */}
                <div className="h-44 bg-slate-100 flex items-center justify-center border-b border-slate-150 relative group overflow-hidden">
                  {isImage ? (
                    <img
                      src={blueprint.fileData}
                      alt={blueprint.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 p-4">
                      <FileText className="h-12 w-12 text-amber-500" />
                      <span className="text-xs font-semibold">Documento PDF/Técnico</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      id={`analyze-blueprint-btn-${blueprint.id}`}
                      onClick={() => setActiveBlueprint(blueprint)}
                      className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-md"
                    >
                      <Eye className="h-3.5 w-3.5" /> Analisar Planta
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 line-clamp-1">{blueprint.title}</h4>
                    {blueprint.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{blueprint.description}</p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex flex-col">
                      <span>Carregado por: <strong>{blueprint.uploadedBy}</strong></span>
                      <span>Em: {new Date(blueprint.uploadedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        id={`open-analyze-${blueprint.id}`}
                        onClick={() => setActiveBlueprint(blueprint)}
                        className="p-1.5 text-amber-600 hover:text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer"
                        title="Ver Planta Completa"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {(currentUser.role === 'engineer' || currentUser.role === 'master_builder') && (
                        <button
                          id={`delete-blueprint-${blueprint.id}`}
                          onClick={() => {
                            if (confirm(`Deseja excluir permanentemente o projeto "${blueprint.title}"?`)) {
                              onDeleteBlueprint(blueprint.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent rounded-lg cursor-pointer transition-colors"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL-SIZE BLUEPRINT ANALYZER / VIEWER MODAL */}
      {activeBlueprint && (
        <div id="blueprint-analyzer-modal" className="fixed inset-0 bg-slate-950/90 flex flex-col z-50 animate-in fade-in duration-200">
          {/* Header Controls */}
          <div className="bg-slate-900 text-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div>
              <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                {activeBlueprint.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Enviado por: {activeBlueprint.uploadedBy} | {new Date(activeBlueprint.uploadedAt).toLocaleString('pt-BR')}</p>
            </div>

            <div className="flex items-center gap-3">
              <a
                id="download-blueprint-link"
                href={activeBlueprint.fileData}
                download={activeBlueprint.title}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Download className="h-4 w-4" /> Baixar Planta
              </a>
              <button
                id="close-blueprint-analyzer"
                onClick={() => setActiveBlueprint(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Viewer Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-950 pattern-grid">
            {activeBlueprint.fileData.startsWith('data:image/') ? (
              <img
                src={activeBlueprint.fileData}
                alt={activeBlueprint.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg border border-slate-800 bg-white shadow-2xl transition-all"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-white max-w-sm">
                <FileText className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h4 className="font-bold text-lg">Documento Planta Não Imagem</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Este arquivo técnico (ex: PDF ou documento) foi armazenado em banco de dados e pode ser baixado em seu dispositivo para leitura completa.
                </p>
                <a
                  href={activeBlueprint.fileData}
                  download={activeBlueprint.title}
                  className="mt-6 inline-flex bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-lg cursor-pointer"
                >
                  Baixar Arquivo Agora
                </a>
              </div>
            )}
          </div>

          {/* Description Footer */}
          {activeBlueprint.description && (
            <div className="bg-slate-900 text-slate-300 p-6 border-t border-slate-800 text-xs leading-relaxed max-h-[150px] overflow-y-auto">
              <strong className="text-amber-500 uppercase tracking-wider block mb-1">Observações Técnicas / Memorial Descritivo:</strong>
              {activeBlueprint.description}
            </div>
          )}
        </div>
      )}

      {/* UPLOAD BLUEPRINT MODAL */}
      {showUploadModal && (
        <div id="upload-blueprint-modal" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Anexar Desenho de Projeto</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
                  isDragOver ? 'border-amber-500 bg-amber-50/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileChange(files[0]);
                    }
                  }}
                  accept="image/*,.pdf"
                  className="hidden"
                />

                <FileUp className={`h-8 w-8 ${isDragOver ? 'text-amber-500' : 'text-slate-400'}`} />
                {fileName ? (
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block line-clamp-1">{fileName}</span>
                    <span className="text-[10px] text-emerald-600 font-medium block mt-1">Carregado e pronto para envio</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Arraste a Planta Baixa ou clique aqui</span>
                    <span className="text-[10px] text-slate-400 block mt-1">Suporta Imagens (PNG, JPG) ou PDFs até 5MB</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Título do Projeto / Desenho *</label>
                <input
                  id="blueprint-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Planta Baixa Alvenaria Pavimento 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Memorial Descritivo / Observações Técnicas</label>
                <textarea
                  id="blueprint-desc-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruções sobre traços de massa, detalhamento de armaduras ou cuidados especiais na execução..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  id="cancel-blueprint-upload"
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setFileBase64('');
                    setFileName('');
                    setTitle('');
                    setDescription('');
                    setError('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="submit-blueprint-upload"
                  type="submit"
                  disabled={loading || !fileBase64}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {loading ? 'Enviando...' : 'Carregar Desenho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
