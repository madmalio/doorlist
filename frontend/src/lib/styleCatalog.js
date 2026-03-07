export function getStyleFamily(style) {
  const family = (style?.family || '').trim();
  if (family) {
    return family;
  }

  const legacyName = (style?.name || '').trim();
  return legacyName || 'Uncategorized';
}

export function getStyleVariant(style) {
  if (style?.isSlab) {
    return '';
  }

  const variant = (style?.variant || '').trim();
  return variant || 'Standard';
}

export function getStyleVariantLabel(style) {
  if (style?.isSlab) {
    return 'Slab';
  }

  return getStyleVariant(style);
}

export function getStyleUse(style) {
  const value = (style?.styleUse || '').trim().toLowerCase();
  if (value === 'door' || value === 'drawer-front') {
    return value;
  }
  return 'both';
}

export function styleMatchesOverlayType(style, overlayType) {
  const use = getStyleUse(style);
  const target = overlayType === 'drawer-front' ? 'drawer-front' : 'door';
  return use === 'both' || use === target;
}

export function getStyleDisplayName(style) {
  const family = getStyleFamily(style);
  const variant = getStyleVariant(style);
  if (!variant || variant.toLowerCase() === 'standard') {
    return family;
  }

  return `${family} - ${variant}`;
}

export function groupStylesByFamily(styles) {
  const groups = [];
  const indexByFamily = new Map();

  for (const style of styles || []) {
    const family = getStyleFamily(style);
    const existingIndex = indexByFamily.get(family);
    if (existingIndex === undefined) {
      indexByFamily.set(family, groups.length);
      groups.push({ family, styles: [style] });
      continue;
    }

    groups[existingIndex].styles.push(style);
  }

  return groups;
}

export function findStyleById(styles, styleId) {
  return (styles || []).find((style) => style.id === styleId) || null;
}
