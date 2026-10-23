import { ROUTES } from './routes'

export type FigureKind = 'robot' | 'bear' | 'dragon' | 'creature' | 'knight' | 'mushroom'

export const WORLDS = [
  { id: 'ai-studio', label: 'AI Studio', name: 'AI STUDIO', route: ROUTES.aiStudio },
  { id: '3d-studio', label: '3D Studio', name: '3D STUDIO', route: ROUTES.studio3d },
  { id: 'marketplace', label: 'Marketplace', name: 'MARKETPLACE', route: ROUTES.marketplace },
  { id: 'order-print', label: 'Order Print', name: 'ORDER PRINT', route: ROUTES.printOnDemand },
] as const

/** Background / light palettes per world, plus the closing finale. */
export const THEMES = [
  { top: '#EEE8FF', bottom: '#D4E2FF', accent: '#B9A7FF', key: '#FFFFFF', rim: '#9C86FF', ui: '#7955FF' },
  { top: '#EAFBF3', bottom: '#CDF2E6', accent: '#98DFFF', key: '#FFFFFF', rim: '#6FD6B0', ui: '#16A37B' },
  { top: '#FFF7EC', bottom: '#FFE2CC', accent: '#FFE58F', key: '#FFF4E6', rim: '#FFB27A', ui: '#F07A2E' },
  { top: '#EFF7FF', bottom: '#E2F7F0', accent: '#FFB37A', key: '#FFFFFF', rim: '#7CC7FF', ui: '#FF8A3D' },
  { top: '#F8F7F4', bottom: '#EFEAFF', accent: '#B9A7FF', key: '#FFFFFF', rim: '#B9A7FF', ui: '#7955FF' },
]

export const AI_PRESETS: { kind: FigureKind; label: string; file: string }[] = [
  { kind: 'robot', label: 'Cute robot', file: 'bolt-sketch.png' },
  { kind: 'bear', label: 'Astronaut bear', file: 'astro-bear.png' },
  { kind: 'creature', label: 'Fantasy creature', file: 'mochi-sprite.png' },
]

export type Product = {
  slug: string
  kind: FigureKind
  name: string
  category: string
  description: string
  demoPrice: string
  accent: string
}

/** Demo catalogue — swap for real Marketplace data when the API is connected. */
export const PRODUCTS: Product[] = [
  {
    slug: 'bolt-mini-robot',
    kind: 'robot',
    name: 'Bolt',
    category: 'Mini Robot',
    description: 'Robot tí hon với ăng-ten cam và đôi tay gập được — bản in hoàn thiện từ chính mẫu bạn vừa lắp.',
    demoPrice: '390.000₫',
    accent: '#7FE3C0',
  },
  {
    slug: 'astro-bear',
    kind: 'bear',
    name: 'Astro Bear',
    category: 'Fantasy Figure',
    description: 'Chú gấu phi hành gia với mũ kính trong suốt, sẵn sàng cho chuyến bay đến kệ sách của bạn.',
    demoPrice: '450.000₫',
    accent: '#B9A7FF',
  },
  {
    slug: 'drako-dragon',
    kind: 'dragon',
    name: 'Drako',
    category: 'Articulated Toy',
    description: 'Rồng khớp nối in liền khối, mỗi đốt thân đều chuyển động mềm mại trong tay.',
    demoPrice: '520.000₫',
    accent: '#FF9FB2',
  },
  {
    slug: 'mochi-sprite',
    kind: 'creature',
    name: 'Mochi Sprite',
    category: 'Designer Toy',
    description: 'Sinh vật bông mềm với cặp sừng bé xíu và đôi cánh pastel — phiên bản sưu tầm giới hạn.',
    demoPrice: '360.000₫',
    accent: '#98DFFF',
  },
  {
    slug: 'pixel-knight',
    kind: 'knight',
    name: 'Pixel Knight',
    category: 'Game-inspired Figure',
    description: 'Hiệp sĩ phong cách game cổ điển với khiên tròn và thanh kiếm bo góc, sơn mờ satin.',
    demoPrice: '480.000₫',
    accent: '#FFD166',
  },
  {
    slug: 'shroomy',
    kind: 'mushroom',
    name: 'Shroomy',
    category: 'Decor Collectible',
    description: 'Nấm nhỏ đốm trắng làm đồ trang trí bàn làm việc — dễ thương, bền và in sắc nét từng lớp.',
    demoPrice: '290.000₫',
    accent: '#FF8F7A',
  },
]

export const PRINT_SAMPLES: { kind: FigureKind; label: string }[] = [
  { kind: 'bear', label: 'Astro Bear' },
  { kind: 'robot', label: 'Bolt' },
  { kind: 'mushroom', label: 'Shroomy' },
]

export const PRINT_COLORS = [
  { name: 'Lavender', hex: '#A894FF' },
  { name: 'Mint', hex: '#7FE0B4' },
  { name: 'Sunny', hex: '#FFD25E' },
  { name: 'Coral', hex: '#FF8A70' },
  { name: 'Sky', hex: '#6CC8FF' },
  { name: 'Charcoal', hex: '#3A3A46' },
]

export const PRINT_SCALES = [
  { id: 'S', label: 'Small', factor: 0.78 },
  { id: 'M', label: 'Medium', factor: 1 },
  { id: 'L', label: 'Large', factor: 1.18 },
] as const

export const EDITOR_COLORS = ['#7FE3C0', '#FFD166', '#FF8F7A', '#98DFFF', '#B9A7FF', '#FFFFFF', '#3A3A46']
