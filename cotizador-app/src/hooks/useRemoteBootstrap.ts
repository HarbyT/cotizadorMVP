import { useEffect, useState } from 'react';
import { supabaseRepository } from '../repositories/supabaseRepository';
import { useDBStore } from '../store/dbStore';

export function useRemoteBootstrap(shouldSync = true) {
  const setClients = useDBStore((state) => state.setClients);
  const setPapers = useDBStore((state) => state.setPapers);
  const setMachines = useDBStore((state) => state.setMachines);
  const setFinishes = useDBStore((state) => state.setFinishes);
  const setInks = useDBStore((state) => state.setInks);
  const setPlates = useDBStore((state) => state.setPlates);
  const setPopItems = useDBStore((state) => state.setPopItems);
  const setCompanyConfig = useDBStore((state) => state.setCompanyConfig);
  const setQuotes = useDBStore((state) => state.setQuotes);

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!shouldSync || !supabaseRepository.isEnabled()) {
        return;
      }

      setIsBootstrapping(true);
      setBootstrapError(null);

      try {
        const payload = await supabaseRepository.loadBootstrapData();

        if (!payload || !isMounted) {
          return;
        }

        setClients(payload.clients);
        setPapers(payload.papers);
        setMachines(payload.machines);
        setFinishes(payload.finishes);
        setInks(payload.inks);
        setPlates(payload.plates);
        setPopItems(payload.popItems);

        if (payload.companyConfig) {
          setCompanyConfig(payload.companyConfig);
        }

        setQuotes(payload.quotes);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Error desconocido al cargar datos cloud.';
        setBootstrapError(message);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    shouldSync,
    setClients,
    setPapers,
    setMachines,
    setFinishes,
    setInks,
    setPlates,
    setPopItems,
    setCompanyConfig,
    setQuotes,
  ]);

  return {
    remoteEnabled: supabaseRepository.isEnabled(),
    isBootstrapping,
    bootstrapError,
  };
}
