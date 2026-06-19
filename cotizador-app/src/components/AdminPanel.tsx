import React, { useMemo, useRef, useState } from 'react';
import { Database, Download, Edit2, Plus, Trash2, Upload } from 'lucide-react';
import { useDBStore } from '../store/dbStore';
import { exportToCSV, importFromCSV } from '../utils/csvUtils';
import type {
  ClientType,
  CompanyConfig,
  FinishType,
  InkType,
  MachineType,
  PaperType,
  PlateType,
  QuoteType,
} from '../types/database';
import { createEntityId } from '../utils/id';
import { supabaseRepository } from '../repositories/supabaseRepository';
import { IVA_RATE } from '../utils/financial';

type TabType = 'clients' | 'papers' | 'machines' | 'finishes' | 'inks' | 'plates' | 'company' | 'quotes';

type FormDataState = Record<string, string | number | undefined>;

const toNumber = (value: unknown): number => Number(value) || 0;
const toText = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''));

export const AdminPanel: React.FC = () => {
  const {
    clients,
    papers,
    machines,
    finishes,
    inks,
    plates,
    companyConfig,
    quotes,
    setClients,
    addClient,
    updateClient,
    deleteClient,
    setPapers,
    addPaper,
    updatePaper,
    deletePaper,
    setMachines,
    addMachine,
    updateMachine,
    deleteMachine,
    setFinishes,
    addFinish,
    updateFinish,
    deleteFinish,
    setInks,
    addInk,
    updateInk,
    deleteInk,
    setPlates,
    addPlate,
    updatePlate,
    deletePlate,
    updateCompanyConfig,
    deleteQuote,
  } = useDBStore();

  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataState>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const titleByTab = useMemo<Record<TabType, string>>(
    () => ({
      clients: 'Clientes',
      papers: 'Papeles',
      machines: 'Maquinas',
      finishes: 'Terminados',
      inks: 'Tintas',
      plates: 'Planchas',
      company: 'Mi Empresa',
      quotes: 'Historial de Cotizaciones',
    }),
    [],
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setEditingId(null);
    setFormData(tab === 'company' ? { ...companyConfig } : {});
  };

  const handleEdit = <T extends { id: string }>(item: T) => {
    setEditingId(item.id);
    setFormData(item as unknown as FormDataState);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(activeTab === 'company' ? { ...companyConfig } : {});
  };

  const handleExportCSV = () => {
    if (activeTab === 'clients') exportToCSV(clients, 'Clientes');
    else if (activeTab === 'papers') exportToCSV(papers, 'Papeles');
    else if (activeTab === 'machines') exportToCSV(machines, 'Maquinas');
    else if (activeTab === 'finishes') exportToCSV(finishes, 'Terminados');
    else if (activeTab === 'inks') exportToCSV(inks, 'Tintas');
    else if (activeTab === 'plates') exportToCSV(plates, 'Planchas');
    else if (activeTab === 'quotes') exportToCSV(quotes, 'Historial_Cotizaciones');
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const data = await importFromCSV(file);

      if (!Array.isArray(data) || data.length === 0) {
        alert('No se encontraron filas validas en el CSV.');
        return;
      }

      if (activeTab === 'clients') {
        const parsed = data as unknown as ClientType[];
        setClients(parsed);
        await supabaseRepository.replaceCatalog('clients', parsed);
      } else if (activeTab === 'papers') {
        const parsed = data as unknown as PaperType[];
        setPapers(parsed);
        await supabaseRepository.replaceCatalog('papers', parsed);
      } else if (activeTab === 'machines') {
        const parsed = data as unknown as MachineType[];
        setMachines(parsed);
        await supabaseRepository.replaceCatalog('machines', parsed);
      } else if (activeTab === 'finishes') {
        const parsed = data as unknown as FinishType[];
        setFinishes(parsed);
        await supabaseRepository.replaceCatalog('finishes', parsed);
      } else if (activeTab === 'inks') {
        const parsed = data as unknown as InkType[];
        setInks(parsed);
        await supabaseRepository.replaceCatalog('inks', parsed);
      } else if (activeTab === 'plates') {
        const parsed = data as unknown as PlateType[];
        setPlates(parsed);
        await supabaseRepository.replaceCatalog('plates', parsed);
      }

      alert('Datos importados correctamente.');
    } catch (error) {
      console.error(error);
      alert('Error al importar el archivo CSV.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'clients') {
        const payload: ClientType = {
          id: editingId || createEntityId('C'),
          name: toText(formData.name),
          company: formData.company ? toText(formData.company) : undefined,
          email: formData.email ? toText(formData.email) : undefined,
          phone: formData.phone ? toText(formData.phone) : undefined,
          documentId: formData.documentId ? toText(formData.documentId) : undefined,
        };

        if (editingId) updateClient(editingId, payload);
        else addClient(payload);

        await supabaseRepository.upsertCatalogItem('clients', payload);
      } else if (activeTab === 'papers') {
        const payload: PaperType = {
          id: editingId || createEntityId('PPR'),
          name: toText(formData.name),
          substrateKind: (formData.substrateKind as PaperType['substrateKind']) || 'sheet',
          formatWidth: toNumber(formData.formatWidth),
          formatHeight: toNumber(formData.formatHeight),
          costPerSheet: toNumber(formData.costPerSheet),
          rollWidthCm: formData.rollWidthCm ? toNumber(formData.rollWidthCm) : undefined,
          pricingMode: (formData.pricingMode as PaperType['pricingMode']) || undefined,
          costPerLinearMeter: formData.costPerLinearMeter ? toNumber(formData.costPerLinearMeter) : undefined,
          costPerSquareMeter: formData.costPerSquareMeter ? toNumber(formData.costPerSquareMeter) : undefined,
          grainDirection: (formData.grainDirection as PaperType['grainDirection']) || 'unknown',
          purchaseIncrement: formData.purchaseIncrement ? toNumber(formData.purchaseIncrement) : undefined,
          weightGrams: formData.weightGrams ? toNumber(formData.weightGrams) : undefined,
          provider: formData.provider ? toText(formData.provider) : undefined,
        };

        if (editingId) updatePaper(editingId, payload);
        else addPaper(payload);

        await supabaseRepository.upsertCatalogItem('papers', payload);
      } else if (activeTab === 'machines') {
        const payload: MachineType = {
          id: editingId || createEntityId('MQ'),
          name: toText(formData.name),
          technology: (formData.technology as MachineType['technology']) || 'Offset',
          chargeType: (formData.chargeType as MachineType['chargeType']) || 'Policromia',
          maxWidth: toNumber(formData.maxWidth),
          maxHeight: toNumber(formData.maxHeight),
          minWidth: toNumber(formData.minWidth),
          minHeight: toNumber(formData.minHeight),
          gripperMargin: toNumber(formData.gripperMargin),
          setupCost: toNumber(formData.setupCost),
          platesCost: toNumber(formData.platesCost),
          variableCost: toNumber(formData.variableCost),
        };

        if (editingId) updateMachine(editingId, payload);
        else addMachine(payload);

        await supabaseRepository.upsertCatalogItem('machines', payload);
      } else if (activeTab === 'finishes') {
        const payload: FinishType = {
          id: editingId || createEntityId('T'),
          name: toText(formData.name),
          chargeType: (formData.chargeType as FinishType['chargeType']) || 'Global',
          setupCost: toNumber(formData.setupCost),
          variableCost: toNumber(formData.variableCost),
        };

        if (editingId) updateFinish(editingId, payload);
        else addFinish(payload);

        await supabaseRepository.upsertCatalogItem('finishes', payload);
      } else if (activeTab === 'inks') {
        const payload: InkType = {
          id: editingId || createEntityId('I'),
          type: toText(formData.type),
          baseCost: toNumber(formData.baseCost),
        };

        if (editingId) updateInk(editingId, payload);
        else addInk(payload);

        await supabaseRepository.upsertCatalogItem('inks', payload);
      } else if (activeTab === 'plates') {
        const payload: PlateType = {
          id: editingId || createEntityId('PLT'),
          name: toText(formData.name),
          baseCost: toNumber(formData.baseCost),
        };

        if (editingId) updatePlate(editingId, payload);
        else addPlate(payload);

        await supabaseRepository.upsertCatalogItem('plates', payload);
      } else if (activeTab === 'company') {
        const payload: CompanyConfig = {
          name: toText(formData.name),
          documentId: toText(formData.documentId),
          phone: toText(formData.phone),
          address: toText(formData.address),
          email: toText(formData.email),
          termsAndConditions: toText(formData.termsAndConditions),
          presentationMessage: toText(formData.presentationMessage),
        };

        updateCompanyConfig(payload);
        await supabaseRepository.upsertCompanyConfig(payload);
        alert('Configuracion de empresa guardada exitosamente.');
      }

      if (activeTab !== 'company') {
        setEditingId(null);
        setFormData({});
      }
    } catch (error) {
      console.error(error);
      alert('No fue posible sincronizar el cambio con cloud. El ajuste local si se aplico.');
    }
  };

  const handleDelete = async (tab: Exclude<TabType, 'company'>, id: string) => {
    if (tab === 'clients') deleteClient(id);
    else if (tab === 'papers') deletePaper(id);
    else if (tab === 'machines') deleteMachine(id);
    else if (tab === 'finishes') deleteFinish(id);
    else if (tab === 'inks') deleteInk(id);
    else if (tab === 'plates') deletePlate(id);
    else if (tab === 'quotes') deleteQuote(id);

    try {
      if (tab === 'quotes') {
        await supabaseRepository.deleteQuote(id);
      } else {
        await supabaseRepository.deleteCatalogItem(tab, id);
      }
    } catch (error) {
      console.error(error);
      alert('El registro se elimino localmente, pero fallo la sincronizacion cloud.');
    }
  };

  const renderForm = () => {
    if (activeTab === 'quotes') {
      return null;
    }

    if (activeTab === 'clients') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Nombre contacto</label>
            <input className="input-field" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Empresa</label>
            <input className="input-field" value={formData.company || ''} onChange={(event) => setFormData({ ...formData, company: event.target.value })} />
          </div>
        </div>
      );
    }

    if (activeTab === 'papers') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="input-group" style={{ gridColumn: '1 / span 2' }}>
            <label className="input-label">Nombre</label>
            <input className="input-field" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Tipo sustrato</label>
            <select className="input-field" value={formData.substrateKind || 'sheet'} onChange={(event) => setFormData({ ...formData, substrateKind: event.target.value as PaperType['substrateKind'] })}>
              <option value="sheet">Pliego</option>
              <option value="roll">Rollo</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Tarifa rollo</label>
            <select className="input-field" value={formData.pricingMode || 'linear_meter'} onChange={(event) => setFormData({ ...formData, pricingMode: event.target.value as PaperType['pricingMode'] })}>
              <option value="linear_meter">Metro lineal</option>
              <option value="square_meter">Metro cuadrado</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Ancho cm</label>
            <input type="number" className="input-field" value={formData.formatWidth || ''} onChange={(event) => setFormData({ ...formData, formatWidth: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Alto cm</label>
            <input type="number" className="input-field" value={formData.formatHeight || ''} onChange={(event) => setFormData({ ...formData, formatHeight: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Costo pliego</label>
            <input type="number" className="input-field" value={formData.costPerSheet || ''} onChange={(event) => setFormData({ ...formData, costPerSheet: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Ancho rollo (cm)</label>
            <input type="number" className="input-field" value={formData.rollWidthCm || ''} onChange={(event) => setFormData({ ...formData, rollWidthCm: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Costo / ML</label>
            <input type="number" className="input-field" value={formData.costPerLinearMeter || ''} onChange={(event) => setFormData({ ...formData, costPerLinearMeter: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Costo / m2</label>
            <input type="number" className="input-field" value={formData.costPerSquareMeter || ''} onChange={(event) => setFormData({ ...formData, costPerSquareMeter: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Sentido de fibra</label>
            <select className="input-field" value={formData.grainDirection || 'unknown'} onChange={(event) => setFormData({ ...formData, grainDirection: event.target.value as PaperType['grainDirection'] })}>
              <option value="unknown">Sin definir</option>
              <option value="long">Fibra al largo</option>
              <option value="short">Fibra al ancho</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Gramaje (g/m2)</label>
            <input type="number" className="input-field" value={formData.weightGrams || ''} onChange={(event) => setFormData({ ...formData, weightGrams: Number(event.target.value) })} />
          </div>
          <div className="input-group">
            <label className="input-label">Incremento compra rollo (ML)</label>
            <input type="number" step="0.01" className="input-field" value={formData.purchaseIncrement || ''} onChange={(event) => setFormData({ ...formData, purchaseIncrement: Number(event.target.value) })} />
          </div>
        </div>
      );
    }

    if (activeTab === 'machines') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="input-group" style={{ gridColumn: '1 / span 2' }}>
            <label className="input-label">Nombre</label>
            <input className="input-field" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Tecnologia</label>
            <select className="input-field" value={formData.technology || 'Offset'} onChange={(event) => setFormData({ ...formData, technology: event.target.value as MachineType['technology'] })}>
              <option value="Offset">Offset</option>
              <option value="Digital">Digital</option>
              <option value="Gran Formato">Gran Formato</option>
              <option value="Plotter">Plotter</option>
              <option value="Flexo">Flexo</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Tipo cobro</label>
            <select className="input-field" value={formData.chargeType || 'Policromia'} onChange={(event) => setFormData({ ...formData, chargeType: event.target.value as MachineType['chargeType'] })}>
              <option value="Policromia">Policromia</option>
              <option value="Color">Color</option>
            </select>
          </div>
          <div className="input-group"><label className="input-label">Ancho max</label><input type="number" className="input-field" value={formData.maxWidth || ''} onChange={(event) => setFormData({ ...formData, maxWidth: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Alto max</label><input type="number" className="input-field" value={formData.maxHeight || ''} onChange={(event) => setFormData({ ...formData, maxHeight: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Ancho min</label><input type="number" className="input-field" value={formData.minWidth || ''} onChange={(event) => setFormData({ ...formData, minWidth: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Alto min</label><input type="number" className="input-field" value={formData.minHeight || ''} onChange={(event) => setFormData({ ...formData, minHeight: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Pinza</label><input type="number" className="input-field" value={formData.gripperMargin || ''} onChange={(event) => setFormData({ ...formData, gripperMargin: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Setup</label><input type="number" className="input-field" value={formData.setupCost || ''} onChange={(event) => setFormData({ ...formData, setupCost: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Planchas</label><input type="number" className="input-field" value={formData.platesCost || ''} onChange={(event) => setFormData({ ...formData, platesCost: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Variable</label><input type="number" className="input-field" value={formData.variableCost || ''} onChange={(event) => setFormData({ ...formData, variableCost: Number(event.target.value) })} /></div>
        </div>
      );
    }

    if (activeTab === 'finishes') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="input-group" style={{ gridColumn: '1 / span 2' }}>
            <label className="input-label">Nombre</label>
            <input className="input-field" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Tipo cobro</label>
            <select className="input-field" value={formData.chargeType || 'Global'} onChange={(event) => setFormData({ ...formData, chargeType: event.target.value as FinishType['chargeType'] })}>
              <option value="Global">Global</option>
              <option value="Millar">Millar</option>
              <option value="Pliego">Pliego</option>
              <option value="Unidad">Unidad</option>
            </select>
          </div>
          <div className="input-group"><label className="input-label">Setup</label><input type="number" className="input-field" value={formData.setupCost || ''} onChange={(event) => setFormData({ ...formData, setupCost: Number(event.target.value) })} /></div>
          <div className="input-group"><label className="input-label">Variable</label><input type="number" className="input-field" value={formData.variableCost || ''} onChange={(event) => setFormData({ ...formData, variableCost: Number(event.target.value) })} /></div>
        </div>
      );
    }

    if (activeTab === 'inks') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group"><label className="input-label">Tipo tinta</label><input className="input-field" value={formData.type || ''} onChange={(event) => setFormData({ ...formData, type: event.target.value })} /></div>
          <div className="input-group"><label className="input-label">Costo base</label><input type="number" className="input-field" value={formData.baseCost || ''} onChange={(event) => setFormData({ ...formData, baseCost: Number(event.target.value) })} /></div>
        </div>
      );
    }

    if (activeTab === 'plates') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group"><label className="input-label">Nombre plancha</label><input className="input-field" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></div>
          <div className="input-group"><label className="input-label">Costo unidad</label><input type="number" className="input-field" value={formData.baseCost || ''} onChange={(event) => setFormData({ ...formData, baseCost: Number(event.target.value) })} /></div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div className="input-group"><label className="input-label">Razon social</label><input className="input-field" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></div>
        <div className="input-group"><label className="input-label">NIT</label><input className="input-field" value={formData.documentId || ''} onChange={(event) => setFormData({ ...formData, documentId: event.target.value })} /></div>
        <div className="input-group"><label className="input-label">Telefono</label><input className="input-field" value={formData.phone || ''} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></div>
        <div className="input-group"><label className="input-label">Direccion</label><input className="input-field" value={formData.address || ''} onChange={(event) => setFormData({ ...formData, address: event.target.value })} /></div>
        <div className="input-group"><label className="input-label">Email</label><input className="input-field" value={formData.email || ''} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></div>
        <div className="input-group" style={{ gridColumn: '1 / span 2' }}><label className="input-label">Mensaje presentacion</label><textarea className="input-field" rows={2} value={formData.presentationMessage || ''} onChange={(event) => setFormData({ ...formData, presentationMessage: event.target.value })} /></div>
        <div className="input-group" style={{ gridColumn: '1 / span 2' }}><label className="input-label">Terminos</label><textarea className="input-field" rows={4} value={formData.termsAndConditions || ''} onChange={(event) => setFormData({ ...formData, termsAndConditions: event.target.value })} /></div>
      </div>
    );
  };

  const renderRows = () => {
    if (activeTab === 'clients') {
      return clients.map((row) => (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.name}</td>
          <td style={{ padding: '1rem' }}>{row.company || '---'}</td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(row)}><Edit2 size={16} /></button>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('clients', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      ));
    }

    if (activeTab === 'papers') {
      return papers.map((row) => (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.name}</td>
          <td style={{ padding: '1rem' }}>
            {row.substrateKind === 'roll'
              ? `Rollo ${row.rollWidthCm || row.formatWidth}cm`
              : `${row.formatWidth}x${row.formatHeight} cm`}
          </td>
          <td style={{ padding: '1rem', color: 'var(--color-success)' }}>
            {row.substrateKind === 'roll'
              ? row.pricingMode === 'square_meter'
                ? `$${row.costPerSquareMeter || 0}/m2`
                : `$${row.costPerLinearMeter || 0}/ML`
              : `$${row.costPerSheet}/pliego`}
          </td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(row)}><Edit2 size={16} /></button>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('papers', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      ));
    }

    if (activeTab === 'machines') {
      return machines.map((row) => (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.name}</td>
          <td style={{ padding: '1rem' }}>{row.technology}</td>
          <td style={{ padding: '1rem' }}>{row.chargeType || 'Policromia'}</td>
          <td style={{ padding: '1rem' }}>${row.setupCost}</td>
          <td style={{ padding: '1rem', color: 'var(--color-success)' }}>${row.variableCost}</td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(row)}><Edit2 size={16} /></button>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('machines', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      ));
    }

    if (activeTab === 'finishes') {
      return finishes.map((row) => (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.name}</td>
          <td style={{ padding: '1rem' }}>{row.chargeType}</td>
          <td style={{ padding: '1rem' }}>${row.setupCost}</td>
          <td style={{ padding: '1rem', color: 'var(--color-success)' }}>${row.variableCost}</td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(row)}><Edit2 size={16} /></button>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('finishes', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      ));
    }

    if (activeTab === 'inks') {
      return inks.map((row) => (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.type}</td>
          <td style={{ padding: '1rem', color: 'var(--color-success)' }}>${row.baseCost}</td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(row)}><Edit2 size={16} /></button>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('inks', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      ));
    }

    if (activeTab === 'plates') {
      return plates.map((row) => (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.name}</td>
          <td style={{ padding: '1rem', color: 'var(--color-success)' }}>${row.baseCost}</td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => handleEdit(row)}><Edit2 size={16} /></button>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('plates', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      ));
    }

    return quotes.map((row: QuoteType) => {
      const includeIva = row.items?.[0]?.specs?.pricingSnapshot?.includeIva ?? true;
      const displayTotal = includeIva ? row.subtotal * (1 + IVA_RATE) : row.subtotal;

      return (
        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
          <td style={{ padding: '1rem' }}>{row.id}</td>
          <td style={{ padding: '1rem' }}>{new Date(row.date).toLocaleString('es-CO')}</td>
          <td style={{ padding: '1rem', fontWeight: 500 }}>{row.clientName}</td>
          <td style={{ padding: '1rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>${Math.round(displayTotal).toLocaleString('es-CO')}</td>
          <td style={{ padding: '1rem' }}>{row.status}</td>
          <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => void handleDelete('quotes', row.id)}><Trash2 size={16} /></button>
          </td>
        </tr>
      );
    });
  };

  const renderHeader = () => {
    if (activeTab === 'clients') return ['ID', 'Nombre', 'Empresa', 'Acciones'];
    if (activeTab === 'papers') return ['ID', 'Nombre', 'Formato/Tipo', 'Costo Base', 'Acciones'];
    if (activeTab === 'machines') return ['ID', 'Nombre', 'Tecnologia', 'Cobro', 'Setup', 'Variable', 'Acciones'];
    if (activeTab === 'finishes') return ['ID', 'Nombre', 'Cobro', 'Setup', 'Variable', 'Acciones'];
    if (activeTab === 'inks') return ['ID', 'Tipo', 'Base', 'Acciones'];
    if (activeTab === 'plates') return ['ID', 'Nombre', 'Costo', 'Acciones'];
    return ['ID', 'Fecha', 'Cliente', 'Monto', 'Estado', 'Acciones'];
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Database size={28} color="var(--color-accent)" />
          <h2>Administracion Global</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={handleExportCSV}>
            <Download size={18} /> Exportar CSV
          </button>
          <label className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
            <Upload size={18} /> Importar CSV
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} />
          </label>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {(['clients', 'papers', 'machines', 'plates', 'inks', 'finishes', 'company', 'quotes'] as TabType[]).map((tab) => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleTabChange(tab)}>
            {titleByTab[tab]}
          </button>
        ))}
      </div>

      {activeTab !== 'quotes' && (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Editar Registro' : 'Nuevo Registro'}</h3>
          {renderForm()}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={activeTab !== 'company' && !formData.name && activeTab !== 'inks'}
            >
              {editingId ? 'Actualizar' : <><Plus size={16} /> Guardar</>}
            </button>
            {editingId && <button className="btn btn-outline" onClick={cancelEdit}>Cancelar</button>}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              {renderHeader().map((header) => (
                <th key={header} style={{ padding: '1rem' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
    </div>
  );
};
