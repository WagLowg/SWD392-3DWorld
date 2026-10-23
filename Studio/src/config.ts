// Capabilities/limits (FRD §6, DRAFT defaults). In production these come from the BE capabilities endpoint.
export const CAPABILITIES = {
  configVersion: 'cfg-2026-10-22-draft',
  maxUploadMiB: 50,
  maxSceneTriangles: 500_000,
  maxSceneNodes: 1000,
  autosaveDebounceSec: 5,
  undoCommands: 100,
  maxProjectNameChars: 120,
  maxTextChars: 500,
  geometryToleranceMm: 0.01,
  importFormats: ['stl'] as const,
  exportFormats: ['stl'] as const,
  consentVersion: 'pod-terms-v1',
};

export const SWATCHES = ['#AA9BEA', '#68D9D0', '#F5B85C', '#F5F6FA', '#303746', '#F27681', '#44C997'];

// Mock POD catalog — official options & prices live in POD, Studio only displays them.
export const POD_CATALOG = {
  quantity: { min: 1, max: 100 },
  technologies: [
    { id: 'fdm', label: 'FDM (in nhựa sợi)' },
    { id: 'sla', label: 'SLA (in nhựa lỏng)' },
  ],
  materials: [
    { id: 'pla', label: 'PLA', tech: 'fdm' },
    { id: 'petg', label: 'PETG', tech: 'fdm' },
    { id: 'resin-std', label: 'Resin tiêu chuẩn', tech: 'sla' },
  ],
};
