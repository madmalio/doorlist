export const licenseStates = {
  trialActive: 'trial_active',
  paidActive: 'paid_active',
  graceOffline: 'grace_offline',
  expiredTrial: 'expired_trial',
  pastDue: 'past_due',
  revokedRefund: 'revoked_refund',
};

export const capabilityKeys = {
  editData: 'edit_data',
  generate: 'generate',
  print: 'print',
  manageCatalog: 'manage_catalog',
};

const blockedStateSet = new Set([
  licenseStates.expiredTrial,
  licenseStates.pastDue,
  licenseStates.revokedRefund,
]);

const defaultCapabilities = {
  [capabilityKeys.editData]: true,
  [capabilityKeys.generate]: true,
  [capabilityKeys.print]: true,
  [capabilityKeys.manageCatalog]: true,
};

export function resolveEffectiveLicenseState({ state, lastValidatedAt, graceDays = 30, now = Date.now() }) {
  if (state !== licenseStates.graceOffline) {
    return state;
  }

  const lastValidatedMs = Number(lastValidatedAt);
  if (!Number.isFinite(lastValidatedMs) || lastValidatedMs <= 0) {
    return licenseStates.expiredTrial;
  }

  const graceWindowMs = Math.max(1, graceDays) * 24 * 60 * 60 * 1000;
  return now - lastValidatedMs > graceWindowMs ? licenseStates.expiredTrial : state;
}

export function getCapabilitiesForState(state) {
  if (blockedStateSet.has(state)) {
    return {
      [capabilityKeys.editData]: false,
      [capabilityKeys.generate]: false,
      [capabilityKeys.print]: false,
      [capabilityKeys.manageCatalog]: false,
    };
  }

  return { ...defaultCapabilities };
}

export function getCapabilityMessage(state, capability) {
  const base = capability === capabilityKeys.manageCatalog
    ? 'Catalog editing is locked for this license state.'
    : capability === capabilityKeys.print
      ? 'Printing is locked for this license state.'
      : capability === capabilityKeys.generate
        ? 'Cutlist generation is locked for this license state.'
        : 'Editing is locked for this license state.';

  if (state === licenseStates.pastDue) {
    return `${base} Update billing to unlock full access.`;
  }
  if (state === licenseStates.revokedRefund) {
    return `${base} This license was revoked after a refund.`;
  }
  if (state === licenseStates.expiredTrial) {
    return `${base} Trial has expired.`;
  }
  return base;
}

export function getLicenseStateLabel(state) {
  if (state === licenseStates.paidActive) {
    return 'License Active';
  }
  if (state === licenseStates.trialActive) {
    return 'Trial Active';
  }
  if (state === licenseStates.graceOffline) {
    return 'Offline Grace';
  }
  if (state === licenseStates.pastDue) {
    return 'Past Due';
  }
  if (state === licenseStates.revokedRefund) {
    return 'Refunded / Revoked';
  }
  return 'Trial Expired';
}
