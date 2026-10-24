import { useMemo, useState } from 'react';
import {
  Box, ChevronDown, ChevronRight, Copy, Eye, EyeOff, Folder, Lock, LockOpen, Printer, Trash2, Type, Hexagon, Shapes, Plus,
} from 'lucide-react';
import { TEMPLATES, useStudio } from '../store';
import type { SceneNode } from '../types';

function KindIcon({ kind }: { kind: SceneNode['kind'] }) {
  if (kind === 'group') return <Folder size={14} className="ico" />;
  if (kind === 'text') return <Type size={14} className="ico" />;
  if (kind === 'extrude') return <Hexagon size={14} className="ico" />;
  if (kind === 'mesh') return <Shapes size={14} className="ico" />;
  return <Box size={14} className="ico" />;
}

function TreeItem({ node, depth, childrenOf, collapsed, toggleCollapse }: {
  node: SceneNode; depth: number; childrenOf: Map<string | null, SceneNode[]>; collapsed: Set<string>; toggleCollapse: (id: string) => void;
}) {
  const selected = useStudio((s) => s.selection.includes(node.id));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(node.name);
  const [over, setOver] = useState(false);
  const st = useStudio.getState;
  const kids = childrenOf.get(node.id) ?? [];
  const isCollapsed = collapsed.has(node.id);

  return (
    <>
      <div
        className={`tree-item${selected ? ' selected' : ''}${!node.visible ? ' hidden-node' : ''}${over ? ' dragover' : ''}`}
        style={{ ['--depth' as any]: depth }}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={node.kind === 'group' ? !isCollapsed : undefined}
        tabIndex={0}
        draggable={!node.locked}
        onDragStart={(e) => { e.dataTransfer.setData('text/node', node.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(e) => { if (node.kind === 'group') { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData('text/node'); if (id) st().reparent(id, node.id); }}
        onClick={(e) => st().select(node.id, e.shiftKey || e.ctrlKey || e.metaKey ? 'toggle' : 'replace')}
        onDoubleClick={() => { if (!node.locked) { setName(node.name); setEditing(true); } }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st().select(node.id); }
          if (e.key === 'F2') { setName(node.name); setEditing(true); }
        }}
      >
        <span className="caret" onClick={(e) => { e.stopPropagation(); if (kids.length) toggleCollapse(node.id); }}>
          {kids.length ? (isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />) : null}
        </span>
        <KindIcon kind={node.kind} />
        <span className="name">
          {editing ? (
            <input
              autoFocus
              value={name}
              maxLength={120}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { setEditing(false); if (name.trim() && name !== node.name) st().updateNode(node.id, { name: name.trim() }, 'Đổi tên'); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setName(node.name); setEditing(false); } }}
            />
          ) : node.name}
        </span>
        {node.kind !== 'group' || kids.length ? (
          <button
            className={`flag ${node.includedForPrint ? 'on' : 'print-off'}`}
            title={node.includedForPrint ? 'Đang chọn in · bấm để loại khỏi in' : 'Không chọn in · bấm để chọn in'}
            aria-label={node.includedForPrint ? 'Bỏ chọn in' : 'Chọn in'}
            aria-pressed={node.includedForPrint}
            onClick={(e) => { e.stopPropagation(); st().toggleFlag(node.id, 'includedForPrint'); }}
          >
            <Printer size={13} style={{ opacity: node.includedForPrint ? 1 : 0.9 }} strokeDasharray={node.includedForPrint ? undefined : '2 2'} />
          </button>
        ) : null}
        <button className={`flag${node.visible ? ' on' : ''}`} title={node.visible ? 'Ẩn (H) — không đổi lựa chọn in' : 'Hiện'} aria-label={node.visible ? 'Ẩn' : 'Hiện'}
          onClick={(e) => { e.stopPropagation(); st().toggleFlag(node.id, 'visible'); }}>
          {node.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button className={`flag${node.locked ? ' on' : ''}`} title={node.locked ? 'Mở khóa' : 'Khóa — không transform'} aria-label={node.locked ? 'Mở khóa' : 'Khóa'}
          onClick={(e) => { e.stopPropagation(); st().toggleFlag(node.id, 'locked'); }}>
          {node.locked ? <Lock size={13} /> : <LockOpen size={13} />}
        </button>
      </div>
      {!isCollapsed && kids.map((k) => (
        <TreeItem key={k.id} node={k} depth={depth + 1} childrenOf={childrenOf} collapsed={collapsed} toggleCollapse={toggleCollapse} />
      ))}
    </>
  );
}

function Hierarchy() {
  const nodes = useStudio((s) => s.nodes);
  const selection = useStudio((s) => s.selection);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const childrenOf = useMemo(() => {
    const m = new Map<string | null, SceneNode[]>();
    nodes.forEach((n) => m.set(n.parentId, [...(m.get(n.parentId) ?? []), n]));
    return m;
  }, [nodes]);
  const st = useStudio.getState;
  const toggleCollapse = (id: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <div
        className="tree"
        role="tree"
        aria-label="Object hierarchy"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { const id = e.dataTransfer.getData('text/node'); if (id && e.target === e.currentTarget) st().reparent(id, null); }}
      >
        {nodes.length === 0 && <div className="tree-empty">Chưa có đối tượng.<br />Dùng thanh công cụ để thêm hình.</div>}
        {(childrenOf.get(null) ?? []).map((n) => (
          <TreeItem key={n.id} node={n} depth={0} childrenOf={childrenOf} collapsed={collapsed} toggleCollapse={toggleCollapse} />
        ))}
        {nodes.length > 0 && <p className="hint" style={{ padding: '4px 4px 0' }}>Kéo thả vào nhóm để reparent (giữ world transform). Kéo ra vùng trống để đưa về gốc. Double-click để đổi tên.</p>}
      </div>
      <div className="tree-foot">
        <button className="btn sm" disabled={!selection.length} onClick={() => st().duplicateSelected()} title="Nhân bản (Ctrl+D)"><Copy size={13} /> Nhân bản</button>
        <button className="btn sm danger" disabled={!selection.length} onClick={() => st().deleteSelected()} title="Xóa (Delete)"><Trash2 size={13} /> Xóa</button>
        <span className="hint" style={{ margin: '0 0 0 auto', alignSelf: 'center' }}>{nodes.length} node</span>
      </div>
    </>
  );
}

function Library() {
  const st = useStudio.getState;
  return (
    <div className="tree">
      <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>Mẫu nội bộ do 3DWorld duyệt. Chèn tạo bản sao có thể chỉnh sửa; mẫu gốc không đổi.</p>
      {TEMPLATES.map((t) => (
        <div className="asset-card" key={t.id}>
          <h4>{t.name}</h4>
          <p>{t.desc}</p>
          <div className="meta">{t.version} · {t.license}</div>
          <button className="btn sm" onClick={() => {
            const built = t.build();
            built.forEach((n) => { if (!n.parentId) n.position = [n.position[0] + Math.random() * 10, n.position[1], n.position[2] + 30]; });
            built[0].name = `${built[0].name}`;
            st().insertNodes(built, `Chèn mẫu ${t.name}`);
            st().toast({ kind: 'success', title: `Đã chèn “${t.name}”`, text: `Provenance: ${t.id}@${t.version}` });
          }}><Plus size={13} /> Thêm vào scene</button>
        </div>
      ))}
    </div>
  );
}

export default function LeftPanel() {
  const [tab, setTab] = useState<'tree' | 'lib'>('tree');
  return (
    <aside className="left">
      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'tree'} className={tab === 'tree' ? 'on' : ''} onClick={() => setTab('tree')}>Đối tượng</button>
        <button role="tab" aria-selected={tab === 'lib'} className={tab === 'lib' ? 'on' : ''} onClick={() => setTab('lib')}>Thư viện</button>
      </div>
      {tab === 'tree' ? <Hierarchy /> : <Library />}
    </aside>
  );
}
