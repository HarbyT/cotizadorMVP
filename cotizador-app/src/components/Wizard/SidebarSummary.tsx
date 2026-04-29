import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FileText } from 'lucide-react';
import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';
import { QuotePDFTemplate } from './QuotePDF';
import { calculateQuote } from '../../domain/quoteEngine';
import {
  buildDraftQuoteItem,
  mergeQuoteItems,
  shouldBuildDraftItem,
  sumQuoteItemsSubtotal,
} from '../../domain/quoteItems';
import { calculateTax, calculateTotalWithTax, formatCop, IVA_RATE } from '../../utils/financial';
import { createQuoteId } from '../../utils/id';
import { supabaseRepository } from '../../repositories/supabaseRepository';
import type { QuoteItemPricingSnapshot, QuoteType } from '../../types/database';

export const SidebarSummary: React.FC = () => {
  const wizard = useWizardStore();
  const db = useDBStore();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTone, setEmailTone] = useState<'emocional' | 'formal'>('emocional');
  const [emailIncludePrice, setEmailIncludePrice] = useState(false);

  const paper = db.papers.find((entry) => entry.id === wizard.selectedPaperId) ?? null;
  const machine = db.machines.find((entry) => entry.id === wizard.selectedMachineId) ?? null;
  const ink = db.inks.find((entry) => entry.id === wizard.selectedInkId) ?? null;
  const plate = db.plates.find((entry) => entry.id === wizard.selectedPlateId) ?? null;
  const popItem = db.popItems.find((entry) => entry.id === wizard.selectedPopItemId) ?? null;

  const calculation = useMemo(
    () =>
      calculateQuote({
        projectMode: wizard.projectMode,
        quantity: wizard.quantity,
        pliegosTotales: wizard.pliegosTotales,
        printFormat: wizard.printFormat,
        numberOfInks: wizard.numberOfInks,
        sellMachineProcess: wizard.sellMachineProcess,
        sellInkProcess: wizard.sellInkProcess,
        targetMargin: wizard.targetMargin,
        customSalePrice: wizard.customSalePrice,
        materialCostOverride: wizard.geometryMaterialCost,
        strategicMachinePrice: wizard.strategicMachinePrice,
        forceMachineCost: wizard.forceMachineCost,
        forcePassesOrColors: wizard.forcePassesOrColors,
        strategicPlatePrice: wizard.strategicPlatePrice,
        forcePlatesCost: wizard.forcePlatesCost,
        strategicInkPrice: wizard.strategicInkPrice,
        forceInkCost: wizard.forceInkCost,
        strategicFinishPrices: wizard.strategicFinishPrices,
        selectedFinishIds: wizard.selectedFinishIds,
        paper,
        machine,
        plate,
        ink,
        popItem,
        finishes: db.finishes,
      }),
    [
      wizard.projectMode,
      wizard.quantity,
      wizard.pliegosTotales,
      wizard.printFormat,
      wizard.numberOfInks,
      wizard.sellMachineProcess,
      wizard.sellInkProcess,
      wizard.targetMargin,
      wizard.customSalePrice,
      wizard.geometryMaterialCost,
      wizard.strategicMachinePrice,
      wizard.forceMachineCost,
      wizard.forcePassesOrColors,
      wizard.strategicPlatePrice,
      wizard.forcePlatesCost,
      wizard.strategicInkPrice,
      wizard.forceInkCost,
      wizard.strategicFinishPrices,
      wizard.selectedFinishIds,
      paper,
      machine,
      plate,
      ink,
      popItem,
      db.finishes,
    ],
  );

  const draftPricingSnapshot = useMemo<QuoteItemPricingSnapshot>(
    () => {
      const ivaValue = wizard.includeIva ? calculateTax(calculation.finalPrice, IVA_RATE) : 0;

      return {
        baseCost: calculation.baseCost,
        suggestedPrice: calculation.suggestedPrice,
        salePriceNet: calculation.finalPrice,
        includeIva: wizard.includeIva,
        ivaRate: IVA_RATE,
        ivaValue,
        salePriceWithIva: calculation.finalPrice + ivaValue,
        profitValue: calculation.profitValue,
        profitOnBasePct: calculation.profitOnBasePct,
        marginOnSalePct: calculation.marginOnSalePct,
        targetMarkupPct: calculation.targetMarkupPct,
        forcedPricing: {
          machineCost: calculation.machineCostForced ? calculation.costMachine : undefined,
          platesCost: calculation.platesCostForced ? calculation.costPlates : undefined,
          inkCost: calculation.inkCostForced ? calculation.costInk : undefined,
          passesOrColors: calculation.passesForced ? calculation.passesOrColors : undefined,
        },
      };
    },
    [calculation, wizard.includeIva],
  );

  const draftItem = useMemo(() => {
    if (!shouldBuildDraftItem(wizard.productName)) {
      return null;
    }

    return buildDraftQuoteItem({
      reference: wizard.reference,
      productName: wizard.productName,
      description: wizard.description,
      quantity: wizard.quantity,
      subtotal: calculation.finalPrice,
      width: wizard.width,
      height: wizard.height,
      paperName: calculation.isPopMode ? 'N/A' : paper?.name || 'Sustrato no valido',
      printFormat: calculation.isPopMode ? 'N/A' : wizard.printFormat,
      numberOfInks: calculation.isPopMode ? 0 : wizard.numberOfInks,
      inkName: calculation.isPopMode ? 'N/A' : ink?.type || 'Sin tinta',
      finishNames: calculation.finishDetails.map((finish) => finish.name),
      pricingSnapshot: draftPricingSnapshot,
      geometrySnapshot: wizard.geometrySnapshot || undefined,
      includeTechnicalCutAnnex: wizard.includeTechnicalCutAnnex,
    });
  }, [
    wizard.productName,
    wizard.reference,
    wizard.description,
    wizard.quantity,
    wizard.width,
    wizard.height,
    wizard.printFormat,
    wizard.numberOfInks,
    calculation,
    draftPricingSnapshot,
    wizard.geometrySnapshot,
    wizard.includeTechnicalCutAnnex,
    paper?.name,
    ink?.type,
  ]);

  const resolvedItems = useMemo(() => mergeQuoteItems(wizard.quoteItems, draftItem), [wizard.quoteItems, draftItem]);
  const globalTotal = useMemo(() => sumQuoteItemsSubtotal(resolvedItems), [resolvedItems]);
  const ivaRateApplied = wizard.includeIva ? IVA_RATE : 0;
  const projectedIvaValue = calculateTax(calculation.finalPrice, ivaRateApplied);
  const projectedTotalWithTax = calculation.finalPrice + projectedIvaValue;
  const globalIvaValue = calculateTax(globalTotal, ivaRateApplied);
  const globalTotalWithTax = globalTotal + globalIvaValue;
  const liveGeometry = wizard.geometrySnapshot;

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) {
      return;
    }

    setIsExporting(true);

    try {
      pdfRef.current.style.top = '0';
      pdfRef.current.style.left = '0';
      pdfRef.current.style.position = 'fixed';
      pdfRef.current.style.zIndex = '-9999';

      const pageHeightPx = 1123;
      const idsToProtect = ['pdf-items-title', 'pdf-table', 'pdf-totales', 'pdf-technical-annex', 'pdf-terms'];

      idsToProtect.forEach((id) => {
        const node = pdfRef.current?.querySelector(`#${id}`) as HTMLElement | null;
        if (node) {
          node.style.marginTop = '';
        }
      });

      const adjustPageBreak = (id: string) => {
        const node = pdfRef.current?.querySelector(`#${id}`) as HTMLElement | null;
        if (!node || !pdfRef.current) {
          return;
        }

        const rect = node.getBoundingClientRect();
        const parentRect = pdfRef.current.getBoundingClientRect();

        const relativeTop = rect.top - parentRect.top;
        const relativeBottom = relativeTop + rect.height;

        const startPage = Math.floor(relativeTop / pageHeightPx);
        const endPage = Math.floor(relativeBottom / pageHeightPx);

        if (startPage !== endPage && rect.height < pageHeightPx - 100) {
          const pixelsToPush = (startPage + 1) * pageHeightPx - relativeTop + 40;
          const currentTopMargin = parseInt(window.getComputedStyle(node).marginTop, 10) || 0;
          node.style.marginTop = `${currentTopMargin + pixelsToPush}px`;
        }
      };

      idsToProtect.forEach((id) => adjustPageBreak(id));

      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });

      idsToProtect.forEach((id) => {
        const node = pdfRef.current?.querySelector(`#${id}`) as HTMLElement | null;
        if (node) {
          node.style.marginTop = '';
        }
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imageProperties = pdf.getImageProperties(imageData);

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageHeight = (imageProperties.height * pdfWidth) / imageProperties.width;
      const totalPages = Math.ceil(imageHeight / pageHeight - 0.5 / pageHeight);

      pdf.addImage(imageData, 'PNG', 0, 0, pdfWidth, imageHeight);

      for (let page = 1; page < totalPages; page += 1) {
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, -(page * pageHeight), pdfWidth, imageHeight);
      }

      const safeQuoteNumber = wizard.quoteNumber.trim().replace(/[^a-zA-Z0-9-]/g, '') || createQuoteId();
      const dateString = new Date().toISOString().split('T')[0];

      pdf.save(`Cotizacion_HuellasLitograficas_${dateString}_${safeQuoteNumber}.pdf`);
      setShowEmailModal(true);
    } catch (error) {
      console.error('Error generando PDF', error);
      alert('No fue posible generar el PDF. Revisa la consola para mas detalles.');
    } finally {
      if (pdfRef.current) {
        pdfRef.current.style.top = '-9999px';
        pdfRef.current.style.left = '-9999px';
        pdfRef.current.style.position = 'absolute';
      }

      setIsExporting(false);
    }
  };

  const handleSaveQuote = async (status: QuoteType['status']) => {
    if (resolvedItems.length === 0) {
      alert('No hay items configurados para guardar.');
      return;
    }

    const quoteId = wizard.quoteNumber.trim() || createQuoteId();
    const clientName = db.clients.find((entry) => entry.id === wizard.selectedClientId)?.name || 'Mostrador';

    const quoteToSave: QuoteType = {
      id: quoteId,
      date: new Date().toISOString(),
      clientName,
      items: resolvedItems,
      subtotal: globalTotal,
      status,
      includeTechnicalCutAnnex: wizard.includeTechnicalCutAnnex,
    };

    db.saveQuote(quoteToSave);

    try {
      await supabaseRepository.upsertQuote(quoteToSave);
      alert(`Cotizacion guardada exitosamente como: ${status}`);
    } catch (error) {
      console.error('Error sincronizando cotizacion en cloud', error);
      alert(`Cotizacion guardada localmente como: ${status}. La sincronizacion cloud fallo.`);
    }
  };

  const handleAddItem = () => {
    if (!shouldBuildDraftItem(wizard.productName)) {
      alert('Debes definir un producto antes de compilarlo al carrito.');
      return;
    }

    wizard.addCurrentProductToItems(
      calculation.finalPrice,
      calculation.isPopMode ? 'N/A' : paper?.name || 'Sustrato no valido',
      calculation.isPopMode ? 'N/A' : ink?.type || 'Sin tinta',
      calculation.finishDetails.map((finish) => finish.name),
      draftPricingSnapshot,
      wizard.geometrySnapshot || undefined,
      wizard.includeTechnicalCutAnnex,
    );
  };

  const generateEmailText = () => {
    const clientNameDisplay = db.clients.find((entry) => entry.id === wizard.selectedClientId)?.name || 'Cliente';
    const itemsList =
      resolvedItems.length > 0
        ? resolvedItems.map((item) => `- ${item.productName}${item.reference ? ` (${item.reference})` : ''}`).join('\n')
        : '- Sin items';

    const totalForEmail = wizard.includeIva ? calculateTotalWithTax(globalTotal, IVA_RATE) : globalTotal;
    const priceText = emailIncludePrice
      ? `\nEl valor total de la inversion es de $${formatCop(totalForEmail)} COP (${wizard.includeIva ? 'IVA incluido' : 'sin IVA'}).`
      : '';

    const finalQuoteNumberDisplay = wizard.quoteNumber.trim() || 'adjunta';
    const senderName = wizard.elaboratedBy || db.companyConfig.name;

    if (emailTone === 'emocional') {
      return `Hola ${clientNameDisplay},\n\nTe compartimos la cotizacion ${finalQuoteNumberDisplay} para los siguientes entregables:\n${itemsList}${priceText}\n\nQuedamos atentos a cualquier ajuste o comentario para avanzar contigo.\n\nUn saludo,\n${senderName}`;
    }

    return `Estimado/a ${clientNameDisplay},\n\nAdjuntamos la cotizacion ${finalQuoteNumberDisplay} correspondiente a los siguientes items:\n${itemsList}${priceText}\n\nQuedo atento/a a tus comentarios para continuar el proceso comercial.\n\nCordialmente,\n${senderName}`;
  };

  return (
    <aside className={`glass-panel ${calculation.isDanger ? 'alert-danger-bg' : ''}`} style={{ width: '380px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ color: calculation.isDanger ? 'var(--color-danger)' : 'inherit' }}>Resumen en Tiempo Real</h3>
      <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
        {calculation.isPopMode ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
              <span>Material POP ({popItem?.name || 'Seleccione articulo'})</span>
              <span>${formatCop(calculation.popCost)}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {wizard.quantity.toLocaleString('es-CO')} Unidades a ${(popItem?.unitCost || 0).toLocaleString('es-CO')} c/u.
            </span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                <span>Sustrato (Cortado)</span>
                <span>${formatCop(calculation.costPaper)}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {liveGeometry?.substrateKind === 'roll'
                  ? `${wizard.quantity.toLocaleString('es-CO')} unidades (${(liveGeometry.materialConsumption.requiredLinearMeters || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })} ML)`
                  : `${wizard.quantity.toLocaleString('es-CO')} Unidades (${wizard.pliegosTotales.toLocaleString('es-CO')} Pliegos)`}
              </span>
              {liveGeometry && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {`Modo ${liveGeometry.layoutMode} | Aprovechamiento ${liveGeometry.utilizationPct.toFixed(1)}%`}
                </span>
              )}
              {calculation.paperCostOverridden && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Costo material inyectado desde motor geometrico avanzado.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                <span>Preprensa (Planchas)</span>
                <span>${formatCop(calculation.costPlates)}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {calculation.platesCostForced
                  ? 'Costo de planchas forzado manualmente.'
                  : `${calculation.platesCount} Planchas a $${formatCop(calculation.baseValPlate)} c/u.`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                <span style={{ textDecoration: !wizard.sellMachineProcess ? 'line-through' : 'none', opacity: !wizard.sellMachineProcess ? 0.5 : 1 }}>
                  Proceso de Maquina
                </span>
                <span style={{ color: !wizard.sellMachineProcess ? 'var(--color-danger)' : 'inherit' }}>
                  {!wizard.sellMachineProcess ? 'No Cobrado ($0)' : `$${formatCop(calculation.costMachine)}`}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {calculation.machineCostForced
                  ? 'Costo de maquina forzado manualmente.'
                  : `${machine?.name || 'Ninguna'} - Setup $${formatCop(calculation.machineSetupCostApplied)} + Variable $${formatCop(calculation.machineVariableCostApplied)}`}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {calculation.facesLogicPrint} ({calculation.operativeUnitsDisplay.toLocaleString('es-CO', { maximumFractionDigits: 2 })}{' '}
                {calculation.machineMetricLabel} operativos)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                <span style={{ textDecoration: !wizard.sellInkProcess ? 'line-through' : 'none', opacity: !wizard.sellInkProcess ? 0.5 : 1 }}>
                  Consumo de Tintas
                </span>
                <span style={{ color: !wizard.sellInkProcess ? 'var(--color-danger)' : 'inherit' }}>
                  {!wizard.sellInkProcess ? 'No Cobrado ($0)' : `$${formatCop(calculation.costInk)}`}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {calculation.inkCostForced
                  ? 'Costo de tintas forzado manualmente.'
                  : `${wizard.numberOfInks} Colores a $${formatCop(calculation.baseValInk)} c/u sobre ${(wizard.pliegosTotales / 1000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} Millares`}
              </span>
            </div>
          </>
        )}

        {calculation.finishDetails.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Desglose de Terminados:</span>
            {calculation.finishDetails.map((finish) => (
              <div key={finish.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>- {finish.name}</span>
                <span>${formatCop(finish.cost)}</span>
              </div>
            ))}
          </div>
        )}

        <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
          <span>Costo Estructural Base</span>
          <span>${formatCop(calculation.baseCost)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Utilidad Neta</span>
          <span style={{ color: calculation.isDanger ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
            ${formatCop(calculation.profitValue)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Utilidad sobre costo base</span>
          <span style={{ color: calculation.isDanger ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>
            {calculation.profitOnBasePct.toFixed(1)}%
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Margen sobre venta</span>
          <span style={{ color: calculation.isDanger ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: 600 }}>
            {calculation.marginOnSalePct.toFixed(1)}%
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>IVA comercial</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {wizard.includeIva ? 'Agregar 19%' : 'Sin IVA'}
          </span>
        </div>
      </div>

      <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <span>Venta Neta</span>
        <span>${formatCop(calculation.finalPrice)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
        <span>IVA (19%)</span>
        <span>{wizard.includeIva ? `$${formatCop(projectedIvaValue)}` : '$0'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.25rem' }}>
        <span>Total Proyectado {wizard.includeIva ? '(IVA incl.)' : '(Sin IVA)'}</span>
        <span style={{ color: calculation.isDanger ? 'var(--color-danger)' : 'var(--color-primary)' }}>${formatCop(projectedTotalWithTax)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
        <span>Precio Unitario (Venta)</span>
        <span>${(projectedTotalWithTax / Math.max(1, wizard.quantity)).toLocaleString('es-CO', { maximumFractionDigits: 2 })} / und</span>
      </div>

      {calculation.isDanger && (
        <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
          <strong>Alerta de Rentabilidad:</strong> El precio ingresado no cubre los costos operativos estructurales.
        </div>
      )}

      <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} onClick={handleAddItem}>
        + Compilar y Anadir a la Cotizacion
      </button>

      {wizard.quoteItems.length > 0 && (
        <div style={{ marginTop: '1.5rem', background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>Items en esta Cotizacion ({wizard.quoteItems.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {wizard.quoteItems.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <strong style={{ color: 'var(--text-color)' }}>{item.productName}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.quantity} unidades</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', marginLeft: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Unit: $</span>
                      <input
                        type="number"
                        value={Number((item.unitPrice || item.subtotal / item.quantity).toFixed(2))}
                        onChange={(event) => wizard.updateItemPrice(index, (Number(event.target.value) || 0) * item.quantity)}
                        style={{ width: '80px', padding: '2px 4px', fontSize: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        title="Editar valor unitario"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>Total: $</span>
                      <input
                        type="number"
                        value={Math.round(item.subtotal)}
                        onChange={(event) => wizard.updateItemPrice(index, Number(event.target.value) || 0)}
                        style={{ width: '80px', padding: '2px 4px', fontSize: '0.8rem', textAlign: 'right', border: '1px dashed var(--color-primary)', borderRadius: '4px', background: '#f8fafc', color: 'var(--color-primary)', fontWeight: 'bold' }}
                        title="Editar total del item"
                      />
                      <button onClick={() => wizard.removeItem(index)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '1.2rem', padding: 0, marginLeft: '4px' }} title="Quitar item">
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', borderTop: '1px solid #e2e8f0' }}>
            <span>Venta Global Neta</span>
            <span>${formatCop(globalTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span>IVA Global (19%)</span>
            <span>{wizard.includeIva ? `$${formatCop(globalIvaValue)}` : '$0'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '6px', fontSize: '1.1rem' }}>
            <span>Total Global {wizard.includeIva ? '(IVA incl.)' : '(Sin IVA)'}</span>
            <span style={{ color: 'var(--color-primary)' }}>${formatCop(globalTotalWithTax)}</span>
          </div>
        </div>
      )}

      <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Elaborado por (Ej. Comercial)"
          value={wizard.elaboratedBy}
          onChange={(event) => wizard.updateField('elaboratedBy', event.target.value)}
          style={{ fontSize: '0.85rem', padding: '0.5rem' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={wizard.includeSignature} onChange={(event) => wizard.updateField('includeSignature', event.target.checked)} />
          Imprimir espacio de firma para Cliente
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={wizard.includeTechnicalCutAnnex}
            onChange={(event) => wizard.updateField('includeTechnicalCutAnnex', event.target.checked)}
          />
          Incluir anexo tecnico de cortes en PDF
        </label>
      </div>

      <button className="btn btn-primary" style={{ width: '100%' }} disabled={calculation.isDanger} onClick={() => void handleSaveQuote('Aprobada')}>
        Aprobar Cotizacion
      </button>
      <button className="btn btn-outline" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => void handleSaveQuote('En Seguimiento')}>
        Guardar en Seguimiento
      </button>

      <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

      <button className="btn btn-outline" style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={() => void handleDownloadPDF()} disabled={isExporting}>
        <FileText size={18} /> {isExporting ? 'Generando PDF...' : 'Descargar PDF (Formal)'}
      </button>

      {showEmailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '600px', maxWidth: '90%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Propuesta de Correo</h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Copia y pega este mensaje para enviar junto al PDF descargado.
                </p>
              </div>
              <button onClick={() => setShowEmailModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="radio" checked={emailTone === 'emocional'} onChange={() => setEmailTone('emocional')} />
                  Tono Emocional
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="radio" checked={emailTone === 'formal'} onChange={() => setEmailTone('formal')} />
                  Tono Formal
                </label>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', borderLeft: '1px solid #cbd5e1', paddingLeft: '1rem' }}>
                <input type="checkbox" checked={emailIncludePrice} onChange={(event) => setEmailIncludePrice(event.target.checked)} />
                Integrar Precio
              </label>
            </div>

            <textarea readOnly value={generateEmailText()} style={{ width: '100%', height: '240px', padding: '1rem', fontSize: '0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'none', fontFamily: 'inherit', lineHeight: '1.6', color: '#334155' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  void navigator.clipboard.writeText(generateEmailText());
                  setShowEmailModal(false);
                }}
              >
                Copiar al Portapapeles
              </button>
            </div>
          </div>
        </div>
      )}

      <QuotePDFTemplate
        ref={pdfRef}
        resolvedItems={resolvedItems}
        calculation={calculation}
        includeIva={wizard.includeIva}
        includeTechnicalCutAnnex={wizard.includeTechnicalCutAnnex}
      />
    </aside>
  );
};
