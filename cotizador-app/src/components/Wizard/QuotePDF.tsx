import React from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { useDBStore } from '../../store/dbStore';
import type { QuoteItem } from '../../types/database';
import type { QuoteEngineResult } from '../../domain/quoteEngine';
import { calculateTax, calculateTotalWithTax, formatCop, IVA_RATE } from '../../utils/financial';
import { sumQuoteItemsSubtotal } from '../../domain/quoteItems';

interface QuotePDFTemplateProps {
  resolvedItems: QuoteItem[];
  calculation: QuoteEngineResult;
  includeIva: boolean;
  includeTechnicalCutAnnex: boolean;
}

export const QuotePDFTemplate = React.forwardRef<HTMLDivElement, QuotePDFTemplateProps>(
  ({ resolvedItems, calculation, includeIva, includeTechnicalCutAnnex }, ref) => {
    const wizard = useWizardStore();
    const db = useDBStore();

    const client = db.clients.find((entry) => entry.id === wizard.selectedClientId);
    const subtotalExempt = resolvedItems.length > 0 ? sumQuoteItemsSubtotal(resolvedItems) : calculation.finalPrice;
    const taxRate = includeIva ? IVA_RATE : 0;
    const ivaValue = calculateTax(subtotalExempt, taxRate);
    const grandTotal = calculateTotalWithTax(subtotalExempt, taxRate);
    const finalQuoteNumber = wizard.quoteNumber.trim() || 'COT-BORRADOR';
    const technicalItems = includeTechnicalCutAnnex
      ? resolvedItems.filter(
          (item) =>
            item.specs.geometrySnapshot &&
            (item.specs.includeTechnicalCutAnnex === undefined || item.specs.includeTechnicalCutAnnex),
        )
      : [];

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          padding: '40px 40px 80px 40px',
          boxSizing: 'border-box',
          background: 'white',
          color: 'black',
          fontFamily: 'Inter, sans-serif',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          zIndex: -1,
        }}
      >
        <div
          id="pdf-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '15px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{ flex: '0 0 auto' }}>
              {wizard.companyLogo ? (
                <img
                  src={wizard.companyLogo}
                  alt="Logo Empresa"
                  style={{
                    width: 'auto',
                    height: '115px',
                    maxWidth: '450px',
                    objectFit: 'contain',
                    objectPosition: 'left center',
                    display: 'block',
                  }}
                />
              ) : (
                <h1
                  style={{
                    fontSize: '24px',
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {db.companyConfig.name}
                </h1>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              <span>
                <strong>NIT:</strong> {db.companyConfig.documentId}
              </span>
              <span>
                <strong>Tel:</strong> {db.companyConfig.phone}
              </span>
              <span>
                <strong>Dir:</strong> {db.companyConfig.address}
              </span>
              <span>
                <strong>Email:</strong> {db.companyConfig.email}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '180px' }}>
            <div
              style={{
                background: '#f8fafc',
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Cotizacion Oficial
              </p>
              <p style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 'bold' }}>{finalQuoteNumber}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Datos del Cliente
            </h3>
            {client ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#334155' }}>
                <div>
                  <strong>Razon Social:</strong> {client.company || 'N/A'}
                </div>
                <div>
                  <strong>Contacto:</strong> {client.name}
                </div>
                <div>
                  <strong>Identificacion:</strong> {client.documentId || 'N/A'}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Cliente no especificado (Mostrador)</p>
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Detalles del Proyecto
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#334155' }}>
              <div>
                <strong>Referencia:</strong> {wizard.reference || 'Sin Referencia'}
              </div>
              <div>
                <strong>Producto:</strong> {wizard.productName || 'Impresion Comercial'}
              </div>
              <div>
                <strong>Cantidad Solicitada:</strong> {wizard.quantity.toLocaleString('es-CO')} Unidades
              </div>
            </div>
          </div>
        </div>

        {db.companyConfig.presentationMessage && (
          <div
            style={{
              marginBottom: '20px',
              padding: '10px 15px',
              background: '#f8fafc',
              borderRadius: '6px',
              borderLeft: '3px solid var(--color-primary)',
              fontSize: '13px',
              color: '#334155',
              fontStyle: 'italic',
              lineHeight: '1.5',
            }}
          >
            {db.companyConfig.presentationMessage}
          </div>
        )}

        <h3 id="pdf-items-title" style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', fontSize: '18px', marginBottom: '15px', color: '#0f172a' }}>
          Propuesta de Valor e Items
        </h3>

        <table id="pdf-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px 15px', borderRadius: '6px 0 0 0' }}>Descripcion Detallada</th>
              <th style={{ padding: '12px 15px', textAlign: 'center', width: '90px' }}>Cantidad</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', width: '110px' }}>V. Unitario</th>
              <th style={{ padding: '12px 15px', textAlign: 'right', width: '120px', borderRadius: '0 6px 0 0' }}>V. Total</th>
            </tr>
          </thead>
          <tbody>
            {resolvedItems.length > 0 ? (
              resolvedItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 15px', verticalAlign: 'top' }}>
                    <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                      {item.productName} {item.reference && item.reference !== item.productName ? `- Ref: ${item.reference}` : ''}
                    </strong>

                    {item.description && (
                      <div style={{ color: '#475569', marginBottom: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.4', fontSize: '13px' }}>
                        {item.description}
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {item.specs.width}x{item.specs.height}cm - {item.specs.paperName} - {item.specs.printFormat} ({item.specs.inks}C:{' '}
                      {item.specs.inkName})
                      {item.specs.finishes.length > 0 && ` - T: ${item.specs.finishes.join(', ')}`}
                    </div>
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center', verticalAlign: 'top', fontWeight: 500 }}>
                    {item.quantity.toLocaleString('es-CO')}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'right', verticalAlign: 'top' }}>${item.unitPrice.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>${formatCop(item.subtotal)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b' }}>
                  No hay items listos para cotizar.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div id="pdf-totales" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', marginBottom: '20px' }}>
          <div style={{ width: '280px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#475569' }}>
              <span>Subtotal Neto:</span>
              <span>${formatCop(subtotalExempt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#475569' }}>
              <span>IVA (19%):</span>
              <span>{includeIva ? `$${formatCop(ivaValue)}` : '$0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
              <span>Costo Base:</span>
              <span>${formatCop(calculation.baseCost)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
              <span>Utilidad Neta:</span>
              <span>${formatCop(calculation.profitValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
              <span>Utilidad sobre Base:</span>
              <span>{calculation.profitOnBasePct.toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #cbd5e1', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
              <span>{includeIva ? 'TOTAL (IVA incl.)' : 'TOTAL (Sin IVA)'}</span>
              <span>${formatCop(grandTotal)}</span>
            </div>
          </div>
        </div>

        {technicalItems.length > 0 && (
          <div id="pdf-technical-annex" style={{ marginTop: '10px', marginBottom: '20px' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', fontSize: '16px', marginBottom: '12px', color: '#0f172a' }}>
              Anexo Tecnico de Cortes
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {technicalItems.map((item) => {
                const geometry = item.specs.geometrySnapshot;
                if (!geometry) {
                  return null;
                }

                return (
                  <div key={`tech-${item.id}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      {item.productName} {item.reference ? `- ${item.reference}` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: '6px' }}>
                      <span>Estrategia: {geometry.strategy}</span>
                      <span>Layout: {geometry.layoutMode}</span>
                      <span>Tipo: {geometry.substrateKind === 'roll' ? 'Rollo' : 'Pliego'}</span>
                      <span>Aprovechamiento: {geometry.utilizationPct.toFixed(1)}%</span>
                      <span>Cabidas: {geometry.piecesPerSheetOrRun.toLocaleString('es-CO')}</span>
                      <span>Costo material: ${formatCop(geometry.materialCost)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
                      Parametros: sangrado {geometry.bleedCm}cm | calle {geometry.gapCm}cm | pinza {geometry.gripperCm}cm | merma {(geometry.wastePct * 100).toFixed(1)}%
                    </div>
                    {geometry.cutPlan.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#1e293b', lineHeight: '1.4' }}>
                        {geometry.cutPlan.map((step, index) => (
                          <div key={`tech-step-${item.id}-${index}`}>
                            Etapa {step.stage} - {step.axis} - {step.description} - tamano {step.sizeCm.toLocaleString('es-CO', { maximumFractionDigits: 3 })}cm - repeticiones {step.count}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div id="pdf-terms" style={{ marginTop: '20px', fontSize: '11px', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '15px', lineHeight: '1.4' }}>
          <p style={{ margin: '0 0 5px 0', color: '#0f172a' }}>
            <strong>TERMINOS Y CONDICIONES COMERCIALES:</strong>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {(db.companyConfig.termsAndConditions || '')
              .split('\n')
              .filter((line) => line.trim() !== '')
              .map((line) => (
                <p key={line} style={{ margin: '0 0 3px 0' }}>
                  {line}
                </p>
              ))}
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '250px', textAlign: 'center' }}>
              <div style={{ height: '40px', marginBottom: '10px' }} />
              <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>Elaborado por ({db.companyConfig.name})</p>
              <p style={{ margin: 0 }}>{wizard.elaboratedBy || 'Area Comercial'}</p>
            </div>
            {wizard.includeSignature && (
              <div style={{ width: '250px', textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #cbd5e1', height: '40px', marginBottom: '10px' }} />
                <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>Aprobado por (Cliente)</p>
                <p style={{ margin: 0 }}>Firma / Sello</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

QuotePDFTemplate.displayName = 'QuotePDFTemplate';
