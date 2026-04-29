import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';
import { Upload } from 'lucide-react';

export const StepProduct: React.FC = () => {
    const { productName, quantity, width, height, projectMode, selectedPopItemId, selectedClientId, companyLogo, quoteNumber, reference, description, updateField } = useWizardStore();
    const { clients, popItems } = useDBStore();

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateField('companyLogo', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="animate-fade-in">
            <h2>Paso 1: Especificaciones del Producto</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Define la información general del trabajo a cotizar.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="input-group">
                    <label className="input-label">Cliente Asociado (Opcional)</label>
                    <select
                        className="input-field"
                        value={selectedClientId || ''}
                        onChange={(e) => updateField('selectedClientId', e.target.value)}
                    >
                        <option value="">-- Sin Cliente Asociado --</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label className="input-label">Logo para Exportación PDF</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 1rem', cursor: 'pointer', flex: 1, justifyContent: 'center' }}
                        >
                            <Upload size={18} /> {companyLogo ? 'Cambiar Logo' : 'Subir Imagen'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                        </label>
                        {companyLogo && (
                            <img src={companyLogo} alt="Logo" style={{ height: '38px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        )}
                    </div>
                </div>
            </div>

            {/* Selección de Modo de Proyecto */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <label className={`btn ${projectMode === 'Papel' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                    <input 
                        type="radio" 
                        name="projectMode" 
                        value="Papel" 
                        checked={projectMode === 'Papel'} 
                        onChange={() => updateField('projectMode', 'Papel')}
                        style={{ display: 'none' }}
                    />
                    Impresión en Papel
                </label>
                <label className={`btn ${projectMode === 'POP' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                    <input 
                        type="radio" 
                        name="projectMode" 
                        value="POP" 
                        checked={projectMode === 'POP'} 
                        onChange={() => updateField('projectMode', 'POP')}
                        style={{ display: 'none' }}
                    />
                    Material POP / Merchandising
                </label>
            </div>

            {projectMode === 'POP' ? (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Seleccionar Producto POP</h3>
                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="input-label">Catálogo POP</label>
                        <select
                            className="input-field"
                            value={selectedPopItemId || ''}
                            onChange={(e) => {
                                updateField('selectedPopItemId', e.target.value);
                                const popItem = popItems.find(p => p.id === e.target.value);
                                if (popItem) {
                                    updateField('productName', popItem.name);
                                    updateField('description', popItem.description);
                                }
                            }}
                        >
                            <option value="">-- Seleccione un artículo --</option>
                            {popItems.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (${p.unitCost.toLocaleString('es-CO')}/u)</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : null}

            {/* Nuevos Campos Fase 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="input-group">
                    <label className="input-label">N° Cotización (Opcional)</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. COT-2023-001"
                        value={quoteNumber}
                        onChange={(e) => updateField('quoteNumber', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Referencia / Título del Proyecto</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. Publicidad Final de Año"
                        value={reference}
                        onChange={(e) => updateField('reference', e.target.value)}
                    />
                </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">Nombre del Producto Base / Ref Pcpal</label>
                <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Catálogo Corporativo"
                    value={productName}
                    onChange={(e) => updateField('productName', e.target.value)}
                />
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">Descripción Extendida para el Cliente</label>
                <textarea
                    className="input-field"
                    placeholder="Detalles del proyecto que se verán en la cotización..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={description}
                    onChange={(e) => updateField('description', e.target.value)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                    <label className="input-label">Cantidad Esperada</label>
                    <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={quantity}
                        onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label className="input-label">Ancho (cm) {projectMode === 'POP' && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>(Opcional)</span>}</label>
                        <input
                            type="number"
                            min="0"
                            className="input-field"
                            value={width}
                            onChange={(e) => updateField('width', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Alto (cm) {projectMode === 'POP' && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>(Opcional)</span>}</label>
                        <input
                            type="number"
                            min="0"
                            className="input-field"
                            value={height}
                            onChange={(e) => updateField('height', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
