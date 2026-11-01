import type { NodeKind, NodeParams, SceneNode, Vec3 } from '../types';

let seq = 0;
export const uid = (p = 'n') => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const defaultAppearance = { color: '#AA9BEA', roughness: 0.55, metalness: 0.05 };

export const KIND_NAMES: Record<NodeKind, string> = {
  box: 'Hộp', sphere: 'Cầu', cylinder: 'Trụ', cone: 'Nón', torus: 'Xuyến', plane: 'Mặt phẳng',
  text: 'Chữ 3D', extrude: 'Hình 2D đùn', mesh: 'Mesh', group: 'Nhóm',
};

export const DEFAULT_PARAMS: Record<Exclude<NodeKind, 'mesh' | 'group'>, NodeParams> = {
  box: { width: 20, height: 20, depth: 20 },
  sphere: { radius: 10, segments: 48 },
  cylinder: { radius: 10, height: 20, segments: 48 },
  cone: { radius: 10, height: 20, segments: 48 },
  torus: { radius: 10, tube: 3, segments: 48 },
  plane: { width: 20, height: 20 },
  text: { text: 'Text', fontSize: 10, depth: 2 },
  extrude: { profile: 'rectangle', width: 20, height: 10, depth: 5, cornerRadius: 0, sides: 6, radius: 10, holeRadius: 0, holeOffsetX: 0 },
};

export function makeNode(kind: NodeKind, partial: Partial<SceneNode> = {}): SceneNode {
  const params = { ...(DEFAULT_PARAMS as Record<string, NodeParams>)[kind], ...(partial.params ?? {}) } as NodeParams;
  let position: Vec3 = [0, 0, 0];
  let rotation: Vec3 = [0, 0, 0];
  if (kind === 'box' || kind === 'cylinder' || kind === 'cone') position = [0, (params.height ?? 0) / 2, 0];
  if (kind === 'sphere') position = [0, params.radius ?? 0, 0];
  if (kind === 'torus') { position = [0, params.tube ?? 0, 0]; rotation = [-90, 0, 0]; }
  if (kind === 'plane' || kind === 'text' || kind === 'extrude') rotation = [-90, 0, 0];
  return {
    id: uid(), name: KIND_NAMES[kind], kind, parentId: null, position, rotation, scale: [1, 1, 1], params,
    appearance: { ...defaultAppearance }, visible: true, locked: false, includedForPrint: true,
    ...partial,
  } as SceneNode;
}

const TEAL = { color: '#68D9D0', roughness: 0.55, metalness: 0 };
const WHITE = { color: '#F5F6FA', roughness: 0.4, metalness: 0 };
const AMBER = { color: '#F5B85C', roughness: 0.55, metalness: 0 };

const box = (name: string, parentId: string, w: number, h: number, d: number, at: Vec3, appearance = TEAL) =>
  makeNode('box', { name, parentId, params: { width: w, height: h, depth: d }, position: at, appearance: { ...appearance } });

/** Open-top box: floor + four walls (separate touching parts, each one closed). */
function openBox(parentId: string, w: number, h: number, d: number, t: number, prefix: string, appearance = TEAL): SceneNode[] {
  return [
    box(`${prefix} · đáy`, parentId, w, t, d, [0, t / 2, 0], appearance),
    box(`${prefix} · thành trước`, parentId, w, h - t, t, [0, t + (h - t) / 2, d / 2 - t / 2], appearance),
    box(`${prefix} · thành sau`, parentId, w, h - t, t, [0, t + (h - t) / 2, -d / 2 + t / 2], appearance),
    box(`${prefix} · thành trái`, parentId, t, h - t, d - 2 * t, [-w / 2 + t / 2, t + (h - t) / 2, 0], appearance),
    box(`${prefix} · thành phải`, parentId, t, h - t, d - 2 * t, [w / 2 - t / 2, t + (h - t) / 2, 0], appearance),
  ];
}

export function keychainTemplate(): SceneNode[] {
  const group = makeNode('group', { name: 'Móc khóa Studio' });
  const base = makeNode('extrude', {
    name: 'Base', parentId: group.id,
    params: { profile: 'rectangle', width: 60, height: 24, depth: 4, cornerRadius: 6, holeRadius: 2.5, holeOffsetX: -23 },
  });
  const text = makeNode('text', {
    name: 'Lettering · STUDIO', parentId: group.id, position: [4, 4, 0],
    params: { text: 'STUDIO', fontSize: 10, depth: 1.2 }, appearance: { ...WHITE },
  });
  return [group, base, text];
}

export type TemplateCategory = 'keychains' | 'desk' | 'containers' | 'signs' | 'decorative' | 'basic';

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'keychains', label: 'Keychains' },
  { id: 'desk', label: 'Desk Accessories' },
  { id: 'containers', label: 'Containers' },
  { id: 'signs', label: 'Signs' },
  { id: 'decorative', label: 'Decorative Models' },
  { id: 'basic', label: 'Basic Objects' },
];

export interface Template {
  id: string;
  name: string;
  desc: string;
  category: TemplateCategory;
  dims: string;
  difficulty: string;
  tagline: string;
  about: string;
  specs: [string, string][];
  version: string;
  license: string;
  icon: 'keychain' | 'tray' | 'text' | 'box' | 'phone' | 'shapes' | 'ring';
  build: () => SceneNode[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'tpl-keychain', name: 'Móc khóa Studio', desc: '60 × 24 × 4 mm · có lỗ xỏ', category: 'keychains', dims: '60 × 24 × 4 mm',
    difficulty: 'Beginner · 5 phút', tagline: 'Một chút cá tính,\nmang theo mỗi ngày.',
    about: 'Đổi chữ STUDIO, chọn màu hiển thị và chỉnh kích thước. Các đối tượng Base, Lettering và Hole cutter vẫn có thể chỉnh sửa.',
    specs: [['Kích thước', '60 × 24 × 4 mm'], ['Lỗ móc', 'Ø 5 mm'], ['Độ sâu chữ', '1.2 mm']],
    version: 'v1', license: '3DWorld internal', icon: 'keychain', build: keychainTemplate,
  },
  {
    id: 'tpl-tray', name: 'Khay bút bàn học', desc: '80 × 20 × 60 mm · thành 2 mm', category: 'desk', dims: '80 × 20 × 60 mm',
    difficulty: 'Beginner · 5 phút', tagline: 'Gọn gàng hơn\ncho góc học tập.',
    about: 'Khay hở nắp gồm đáy và bốn thành riêng. Đổi chiều cao, độ dày thành hoặc chia ngăn bằng hộp mới.',
    specs: [['Kích thước', '80 × 20 × 60 mm'], ['Độ dày thành', '2 mm'], ['Số phần', '5 phần chạm nhau']],
    version: 'v1', license: '3DWorld internal', icon: 'tray',
    build: () => { const g = makeNode('group', { name: 'Khay bút' }); return [g, ...openBox(g.id, 80, 20, 60, 2, 'Khay')]; },
  },
  {
    id: 'tpl-nameplate', name: 'Biển tên MINH', desc: '80 × 30 × 3 mm · chữ nổi', category: 'signs', dims: '80 × 30 × 4.5 mm',
    difficulty: 'Beginner · 5 phút', tagline: 'Tên của bạn,\nnổi bật trên bàn.',
    about: 'Đế bo góc với chữ nổi. Thay chữ MINH bằng tên bất kỳ — hỗ trợ đầy đủ dấu tiếng Việt.',
    specs: [['Kích thước', '80 × 30 × 4.5 mm'], ['Độ sâu chữ', '1.5 mm'], ['Bo góc', 'R 3 mm']],
    version: 'v1', license: '3DWorld internal', icon: 'text',
    build: () => {
      const g = makeNode('group', { name: 'Biển tên' });
      const b = makeNode('extrude', { name: 'Đế biển', parentId: g.id, params: { profile: 'rectangle', width: 80, height: 30, depth: 3, cornerRadius: 3 }, appearance: { ...TEAL } });
      const t = makeNode('text', { name: 'Tên · MINH', parentId: g.id, position: [0, 3, 0], params: { text: 'MINH', fontSize: 14, depth: 1.5 }, appearance: { ...WHITE } });
      return [g, b, t];
    },
  },
  {
    id: 'tpl-lidbox', name: 'Hộp nhỏ có nắp', desc: '40 × 25 × 40 mm · nắp rời', category: 'containers', dims: '40 × 25 × 40 mm',
    difficulty: 'Intermediate · 10 phút', tagline: 'Chỗ cất nhỏ\ncho đồ quý.',
    about: 'Thân hộp hở nắp và một nắp rời đặt bên cạnh để in cùng lúc. Chỉnh dung sai nắp bằng kích thước.',
    specs: [['Kích thước', '40 × 25 × 40 mm'], ['Nắp', '44 × 2 × 44 mm'], ['Độ dày thành', '2 mm']],
    version: 'v1', license: '3DWorld internal', icon: 'box',
    build: () => {
      const g = makeNode('group', { name: 'Hộp có nắp' });
      return [g, ...openBox(g.id, 40, 25, 40, 2, 'Thân', { color: '#AA9BEA', roughness: 0.55, metalness: 0.05 }),
        box('Nắp', g.id, 44, 2, 44, [52, 1, 0], { color: '#AA9BEA', roughness: 0.55, metalness: 0.05 })];
    },
  },
  {
    id: 'tpl-phone', name: 'Đế điện thoại', desc: '70 × 60 × 50 mm · nghiêng 70°', category: 'desk', dims: '70 × 60 × 50 mm',
    difficulty: 'Intermediate · 10 phút', tagline: 'Rảnh tay,\nvẫn thấy màn hình.',
    about: 'Đế phẳng, tấm tựa nghiêng và gờ chặn. Đổi góc tựa bằng xoay trục X của tấm tựa.',
    specs: [['Kích thước', '70 × 60 × 50 mm'], ['Góc nghiêng', '70°'], ['Gờ chặn', '6 mm']],
    version: 'v1', license: '3DWorld internal', icon: 'phone',
    build: () => {
      const g = makeNode('group', { name: 'Đế điện thoại' });
      const base = box('Đế', g.id, 70, 6, 50, [0, 3, 0], AMBER);
      const lip = box('Gờ chặn', g.id, 70, 10, 5, [0, 8, 20], AMBER);
      const back = box('Tấm tựa', g.id, 70, 60, 5, [0, 30, -8], AMBER);
      back.rotation = [-20, 0, 0];
      return [g, base, lip, back];
    },
  },
  {
    id: 'tpl-calib', name: 'Khối thử kích thước', desc: 'Cube 20 mm · trụ Ø10 · nón', category: 'basic', dims: '20 × 20 × 20 mm',
    difficulty: 'Beginner · 2 phút', tagline: 'Kiểm tra trước,\nin chính xác hơn.',
    about: 'Ba khối cơ bản để so kích thước thật sau khi in. Không thay thế kiểm tra của staff POD.',
    specs: [['Cube', '20 mm'], ['Cylinder', 'Ø 10 × 20 mm'], ['Cone', 'Ø 12 × 20 mm']],
    version: 'v1', license: '3DWorld internal', icon: 'shapes',
    build: () => {
      const g = makeNode('group', { name: 'Khối thử' });
      const c = box('Cube 20', g.id, 20, 20, 20, [-25, 10, 0]);
      const cy = makeNode('cylinder', { name: 'Trụ Ø10', parentId: g.id, params: { radius: 5, height: 20, segments: 48 }, position: [0, 10, 0], appearance: { ...TEAL } });
      const co = makeNode('cone', { name: 'Nón Ø12', parentId: g.id, params: { radius: 6, height: 20, segments: 48 }, position: [25, 10, 0], appearance: { ...TEAL } });
      return [g, c, cy, co];
    },
  },
  {
    id: 'tpl-ring', name: 'Vòng trang trí', desc: 'Ø 30 mm · đế tròn', category: 'decorative', dims: '30 × 34 × 30 mm',
    difficulty: 'Beginner · 5 phút', tagline: 'Nhỏ xinh,\ncho kệ sách của bạn.',
    about: 'Vòng xuyến đứng trên đế tròn. Đổi bán kính ống để vòng mảnh hoặc dày hơn.',
    specs: [['Kích thước', '30 × 34 × 30 mm'], ['Ống', 'Ø 6 mm'], ['Đế', 'Ø 30 × 4 mm']],
    version: 'v1', license: '3DWorld internal', icon: 'ring',
    build: () => {
      const g = makeNode('group', { name: 'Vòng trang trí' });
      const base = makeNode('cylinder', { name: 'Đế tròn', parentId: g.id, params: { radius: 15, height: 4, segments: 64 }, position: [0, 2, 0], appearance: { ...WHITE } });
      const ring = makeNode('torus', { name: 'Vòng', parentId: g.id, params: { radius: 12, tube: 3, segments: 64 }, position: [0, 18, 0], rotation: [0, 0, 0] });
      return [g, base, ring];
    },
  },
];
