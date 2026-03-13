import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  capabilityKeys,
  getCapabilitiesForState,
  getCapabilityMessage,
  getLicenseStateLabel,
  licenseStates,
  resolveEffectiveLicenseState,
} from '../../lib/license';

const storageKey = 'cutlogic:license:v1';

const LicenseContext = createContext(undefined);

function readStoredLicense() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      state: String(parsed.state || ''),
      lastValidatedAt: Number(parsed.lastValidatedAt) || Date.now(),
      graceDays: Number(parsed.graceDays) || 30,
    };
  } catch {
    return null;
  }
}

const defaultLicense = {
  state: licenseStates.trialActive,
  lastValidatedAt: Date.now(),
  graceDays: 30,
};

export function LicenseProvider({ children }) {
  const [storedLicense, setStoredLicense] = useState(() => readStoredLicense() || defaultLicense);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(storedLicense));
  }, [storedLicense]);

  const effectiveState = useMemo(
    () => resolveEffectiveLicenseState(storedLicense),
    [storedLicense],
  );

  const capabilities = useMemo(
    () => getCapabilitiesForState(effectiveState),
    [effectiveState],
  );

  const daysLeftInGrace = useMemo(() => {
    if (storedLicense.state !== licenseStates.graceOffline) {
      return null;
    }
    const elapsedMs = Math.max(0, Date.now() - Number(storedLicense.lastValidatedAt || 0));
    const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((storedLicense.graceDays || 30) - elapsedDays));
  }, [storedLicense]);

  const value = useMemo(() => {
    const can = (capability) => Boolean(capabilities[capability]);
    return {
      state: effectiveState,
      stateLabel: getLicenseStateLabel(effectiveState),
      graceDays: storedLicense.graceDays || 30,
      daysLeftInGrace,
      capabilities,
      can,
      isRestricted: !can(capabilityKeys.editData) || !can(capabilityKeys.generate) || !can(capabilityKeys.print),
      getCapabilityMessage: (capability) => getCapabilityMessage(effectiveState, capability),
      touchValidation: () => {
        setStoredLicense((prev) => ({ ...prev, lastValidatedAt: Date.now() }));
      },
      setLicenseStateForTesting: (nextState) => {
        setStoredLicense((prev) => ({
          ...prev,
          state: nextState,
          lastValidatedAt:
            nextState === licenseStates.trialActive ||
            nextState === licenseStates.paidActive ||
            nextState === licenseStates.graceOffline
              ? Date.now()
              : prev.lastValidatedAt,
        }));
      },
      setGraceDaysForTesting: (days) => {
        setStoredLicense((prev) => ({ ...prev, graceDays: Math.max(1, Number(days) || 30) }));
      },
      isDevToolsEnabled: Boolean(import.meta.env.DEV),
      licenseStates,
      capabilityKeys,
    };
  }, [capabilities, daysLeftInGrace, effectiveState, storedLicense]);

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within LicenseProvider');
  }
  return context;
}
