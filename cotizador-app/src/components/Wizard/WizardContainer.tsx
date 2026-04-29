import React, { useState } from 'react';
import { SidebarSummary } from './SidebarSummary';
import { StepProduct } from './StepProduct';
import { StepMaterials } from './StepMaterials';
import { StepImpression } from './StepImpression';
import { StepFinishes } from './StepFinishes';
import { StepFinancial } from './StepFinancial';
import { useWizardStore } from '../../store/wizardStore';

export const WizardContainer: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);

    const { projectMode } = useWizardStore();

    // We will build these steps next
    const renderStep = () => {
        switch (currentStep) {
            case 1: return <StepProduct />;
            case 2: return <StepMaterials />;
            case 3: return <StepImpression />;
            case 4: return <StepFinishes />;
            case 5: return <StepFinancial />;
            default: return <StepProduct />;
        }
    };

    const handleNext = () => {
        if (projectMode === 'POP' && currentStep === 1) {
            // Ir directamente al paso 4 (Terminados) saltándose materiales e impresión
            setCurrentStep(4);
        } else {
            setCurrentStep(Math.min(5, currentStep + 1));
        }
    };

    const handlePrev = () => {
        if (projectMode === 'POP' && currentStep === 4) {
            // Volver al paso 1 directamente
            setCurrentStep(1);
        } else {
            setCurrentStep(Math.max(1, currentStep - 1));
        }
    };

    return (
        <div className="app-container animate-fade-in" style={{ padding: 0 }}>
            {/* Main Wizard Area */}
            <div className="glass-panel" style={{ flex: '1', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Cotizador</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Paso {currentStep} de 5 {projectMode === 'POP' && currentStep > 1 && '(Modo POP)'}
                        </p>
                    </div>
                </header>

                <div style={{ flex: 1 }}>
                    {renderStep()}
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <button
                        className="btn btn-outline"
                        onClick={handlePrev}
                        disabled={currentStep === 1}
                    >
                        Anterior
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={currentStep === 5}
                    >
                        {currentStep === 5 ? 'Finalizar' : 'Siguiente Paso'}
                    </button>
                </div>
            </div>

            {/* Sidebar Summary Area */}
            <SidebarSummary />
        </div>
    );
};
