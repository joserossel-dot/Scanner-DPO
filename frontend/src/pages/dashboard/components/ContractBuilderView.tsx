import { authFetch } from '../../../lib/authFetch';
import React, { useState } from 'react';
import { 
  FileSignature, 
  Copy, 
  Printer, 
  RefreshCw, 
  Check, 
  Info,
  ChevronRight
} from 'lucide-react';

const API_BASE = (() => {
  const url = (import.meta as any).env.VITE_API_URL || '';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('onrender.com')) {
      const parts = hostname.split('.');
      const sub = parts[0];
      if (sub.endsWith('-dashboard')) {
        const baseSub = sub.replace('-dashboard', '-api');
        return `https://${baseSub}.onrender.com`;
      }
    }
  }
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
})();

interface ContractBuilderViewProps {
  token: string | null;
  ropaList?: any[];
}

export default function ContractBuilderView({ token, ropaList }: ContractBuilderViewProps) {
  const externalProviders = (ropaList || [])
    .filter(p => 
      p.status === 'confirmed' && 
      (p.cross_border_transfer === true || 
       ['aws', 'gcp', 'azure', 'digitalocean', 'google', 'hubspot', 'salesforce', 'mailchimp', 'activecampaign', 'sendgrid', 'google_analytics', 'meta_pixel', 'hotjar', 'zoom', 'slack', 'bamboohr', 'workday', 'zendesk', 'intercom'].some(name => 
         p.process_name?.toLowerCase().includes(name) || p.purpose?.toLowerCase().includes(name)
       )
      )
    ).map(p => {
      const cleanName = p.process_name
        .replace(/^Tratamiento de Datos en\s+/i, '')
        .replace(/\(SaaS\)/i, '')
        .replace(/\(CCTV\)/i, '')
        .trim();
      return cleanName;
    }).filter((val, idx, self) => self.indexOf(val) === idx);

  // Form fields
  const [clientName, setClientName] = useState('Mi Empresa Chile SpA');
  const [clientRut, setClientRut] = useState('76.123.456-7');
  const [clientAddress, setClientAddress] = useState('Av. Apoquindo 1234, Las Condes, Santiago');
  const [clientRepresentative, setClientRepresentative] = useState('Juan Pérez');
  
  const [vendorName, setVendorName] = useState('');
  const [vendorCountry, setVendorCountry] = useState('US');
  const [vendorAddress, setVendorAddress] = useState('');
  
  const [contractType, setContractType] = useState<'DPA_LOCAL' | 'SCC_INTERNATIONAL'>('DPA_LOCAL');
  const [dataCategories, setDataCategories] = useState<string[]>([
    'Datos de contacto',
    'Logs de navegación'
  ]);
  const [customCategory, setCustomCategory] = useState('');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [contractHtml, setContractHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleAddCategory = () => {
    if (customCategory.trim() && !dataCategories.includes(customCategory.trim())) {
      setDataCategories([...dataCategories, customCategory.trim()]);
      setCustomCategory('');
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setDataCategories(dataCategories.filter(c => c !== cat));
  };

  const handleGenerateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) return;

    setIsGenerating(true);
    try {
      const response = await authFetch(`${API_BASE}/api/remediation/generate-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientName,
          clientRut,
          clientAddress,
          clientRepresentative,
          vendorName,
          vendorCountry,
          vendorAddress,
          contractType,
          dataCategories
        })
      });

      if (response.ok) {
        const result = await response.json();
        setContractHtml(result.htmlContent);
      } else {
        alert('Error al generar el documento contractual.');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión con el motor de generación.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const logDocumentDownload = async (content: string) => {
    try {
      const hash = await sha256(content);
      const docType = contractType === 'DPA_LOCAL' ? 'dpa' : 'scc';
      await authFetch(`${API_BASE}/api/remediation/log-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document_type: docType,
          content_hash: hash,
          disclaimer_version: 'DISCLAIMER_V1'
        })
      });
    } catch (err) {
      console.error('Error logging contract download:', err);
    }
  };

  const handleCopyText = async () => {
    if (!contractHtml) return;
    
    // Strip HTML tags for clean clipboard copy
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contractHtml;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    await logDocumentDownload(textContent);
  };

  const handlePrint = async () => {
    if (!contractHtml) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${contractType === 'DPA_LOCAL' ? 'Anexo DPA' : 'Cláusulas SCC'} - Ley N° 21.719</title>
          </head>
          <body>
            ${contractHtml}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }

    await logDocumentDownload(contractHtml);
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      
      {/* Columna Izquierda: Formulario */}
      <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 md:p-6 shadow-md flex flex-col justify-between">
        <div className="space-y-5">
          {/* Dynamic tasks from RoPA */}
          {externalProviders.length > 0 ? (
            <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-lg text-left space-y-2 mb-4">
              <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider">Tubería RoPA ➔ Contratos Requeridos</span>
              <h4 className="text-xs font-bold text-white leading-relaxed">
                Atención: Según su inventario, debe firmar Anexos de Encargado (DPA) con:
              </h4>
              <div className="space-y-2 pt-1.5">
                {externalProviders.map((prov, index) => (
                  <label key={index} className="flex items-start gap-2.5 text-xs text-slate-350 cursor-pointer select-none">
                    <input type="checkbox" className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-0 bg-slate-950" />
                    <span>
                      <strong className="text-white">{prov}</strong>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            ropaList && ropaList.length > 0 && (
              <div className="p-4 bg-slate-900/20 border border-slate-800/40 rounded-lg text-left mb-4">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tubería RoPA ➔ Contratos</span>
                <p className="text-xs text-slate-450 italic mt-1">No se detectaron requerimientos de contratos con proveedores extranjeros en su RoPA actual.</p>
              </div>
            )
          )}

          <div className="flex items-center gap-2 pb-3 border-b border-slate-850">
            <FileSignature className="text-indigo-400 w-5 h-5" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Parámetros del Contrato</h3>
          </div>

          <form onSubmit={handleGenerateContract} className="space-y-4">
            
            {/* Responsable (Cliente) */}
            <div className="space-y-3 p-3.5 bg-slate-950/40 rounded-lg border border-slate-850/60">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block mb-1">1. Responsable del Tratamiento</span>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Razón Social Cliente</label>
                  <input 
                    type="text" 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)} 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">RUT Cliente</label>
                    <input 
                      type="text" 
                      value={clientRut} 
                      onChange={e => setClientRut(e.target.value)} 
                      required 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Representante DPO</label>
                    <input 
                      type="text" 
                      value={clientRepresentative} 
                      onChange={e => setClientRepresentative(e.target.value)} 
                      required 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dirección Cliente</label>
                  <input 
                    type="text" 
                    value={clientAddress} 
                    onChange={e => setClientAddress(e.target.value)} 
                    required 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Encargado (Proveedor) */}
            <div className="space-y-3 p-3.5 bg-slate-950/40 rounded-lg border border-slate-850/60">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block mb-1">2. Encargado del Tratamiento</span>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Nombre Proveedor (ej. AWS, HubSpot)</label>
                  <input 
                    type="text" 
                    value={vendorName} 
                    onChange={e => setVendorName(e.target.value)} 
                    required 
                    placeholder="ej. Amazon Web Services Inc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">País del Servidor / Operación</label>
                    <input 
                      type="text" 
                      value={vendorCountry} 
                      onChange={e => setVendorCountry(e.target.value)} 
                      required 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dirección Proveedor</label>
                    <input 
                      type="text" 
                      value={vendorAddress} 
                      onChange={e => setVendorAddress(e.target.value)} 
                      placeholder="Opcional"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Configuración Legal */}
            <div className="space-y-3 p-3.5 bg-slate-950/40 rounded-lg border border-slate-850/60">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 block mb-1">3. Tipo de Documento Legal</span>
              
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <select 
                    value={contractType} 
                    onChange={e => setContractType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="DPA_LOCAL">Modelo A: DPA Local (Art. 15 bis)</option>
                    <option value="SCC_INTERNATIONAL">Modelo B: SCC Internacional (Art. 28)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Categorías de Datos Transferidas</label>
                  
                  {/* Category badg list */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {dataCategories.map(cat => (
                      <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-[10px] text-slate-300">
                        <span>{cat}</span>
                        <button type="button" onClick={() => handleRemoveCategory(cat)} className="text-slate-500 hover:text-white font-bold">&times;</button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      value={customCategory} 
                      onChange={e => setCustomCategory(e.target.value)} 
                      placeholder="Agregar otra categoría..."
                      className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 placeholder:text-slate-750 focus:outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddCategory}
                      className="px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="loader w-3.5 h-3.5" />
                  <span>Redactando Documento...</span>
                </>
              ) : (
                <>
                  <span>Generar Documento Legal</span>
                  <ChevronRight size={14} />
                </>
              )}
            </button>

          </form>
        </div>
      </div>

      {/* Columna Derecha: Visor */}
      <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 md:p-6 shadow-md flex flex-col justify-between" style={{ minHeight: '580px' }}>
        
        {/* Toolbar Viewer */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-850 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Info className="text-indigo-400 w-4 h-4" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Borrador del Anexo Legal</span>
          </div>

          {contractHtml && (
            <div className="flex gap-2">
              <button
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-705 flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-705 flex items-center gap-1.5 transition-all"
              >
                <Printer size={12} />
                <span>Descargar PDF / Imprimir</span>
              </button>
            </div>
          )}
        </div>

        {/* Paper sheet representation */}
        <div className="flex-grow mt-4 overflow-y-auto max-h-[500px] p-1 bg-slate-950/20 rounded-lg">
          {contractHtml ? (
            <div 
              className="bg-white text-slate-900 p-8 rounded-lg shadow-inner border border-slate-300/80 select-text overflow-x-hidden"
              style={{ minHeight: '440px' }}
              dangerouslySetInnerHTML={{ __html: contractHtml }}
            />
          ) : (
            <div className="w-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-lg" style={{ minHeight: '440px' }}>
              <div className="w-12 h-12 bg-slate-900 text-slate-500 rounded-xl border border-slate-850 flex items-center justify-center mb-3">
                <FileSignature size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-300">Generador de Acuerdos DPA & SCC</h4>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                Complete los parámetros legales del Responsable (su empresa) y del Encargado (el proveedor SaaS) a la izquierda y presione generar para redactar el borrador normativo.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
