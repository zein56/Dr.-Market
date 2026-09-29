import React, { useState, useEffect } from 'react';
import { sfx } from '../game/audio';

export type Pos = { x: number; y: number };
export type Layout = Record<string, Pos>;

export const getSavedLayout = (): Layout => {
  try {
    const raw = localStorage.getItem('pill.mc_layout');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

export const saveLayout = (l: Layout) => {
  localStorage.setItem('pill.mc_layout', JSON.stringify(l));
};

const defaultBtnSize = 90;

export default function MobileControlsEditor({ onExit }: { onExit: () => void }) {
  const [layout, setLayout] = useState<Layout>(getSavedLayout());
  const [dragging, setDragging] = useState<string | null>(null);

  const startDrag = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(id);
    sfx('click');
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setLayout(prev => ({
      ...prev,
      [dragging]: {
        x: e.clientX - defaultBtnSize / 2,
        y: e.clientY - defaultBtnSize / 2,
      },
    }));
  };

  const onPointerUp = () => {
    if (dragging) setDragging(null);
  };

  const onSave = () => {
    sfx('click');
    saveLayout(layout);
    onExit();
  };

  const onReset = () => {
    sfx('click');
    setLayout({});
    localStorage.removeItem('pill.mc_layout');
  };

  const renderBtn = (id: string, text: string, defaultClass: string, isSmall?: boolean) => {
    const pos = layout[id];
    let style: React.CSSProperties = {};
    if (pos) {
      style = { position: 'fixed', left: pos.x, top: pos.y, margin: 0, bottom: 'auto', right: 'auto' };
    }

    return (
      <button
        key={id}
        className={`mc-btn ${defaultClass}`}
        style={style}
        onPointerDown={(e) => startDrag(id, e)}
      >
        {text}
      </button>
    );
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 9999, touchAction: 'none' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Sahte oyun arayüzü (mock) */}
      <div className="game" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
        <div className="game-hud">
          <div className="hud-item"><span className="hud-label">Virüs</span><span className="hud-value">12</span></div>
          <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">400</span></div>
          <div className="hud-item"><span className="hud-label">Kalan</span><span className="hud-value">1</span></div>
          
          <div className="hud-item strike-bar-container">
            <span className="hud-label">Ceza</span>
            <div className="strike-bar">
              <div className="strike-pip"></div>
              <div className="strike-pip on"></div>
              <div className="strike-pip"></div>
            </div>
          </div>
        </div>
        <div className="game-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="stage" style={{ width: 128, height: 256, border: '2px solid var(--line)', background: 'black', borderRadius: 8 }}></div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', gap: 10, justifyContent: 'center', zIndex: 10 }}>
        <div style={{ background: 'var(--panel)', padding: '10px 20px', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>Butonları sürükleyerek yerlerini ayarla</span>
          <button className="btn primary small" onClick={onSave}>Kaydet</button>
          <button className="btn ghost small" onClick={onReset}>Sıfırla</button>
          <button className="btn small" onClick={onExit} style={{ background: '#e74c3c', color: 'white' }}>İptal</button>
        </div>
      </div>

      <div className="mobile-controls" style={{ pointerEvents: 'auto' }}>
        <div className="mc-left">
          {renderBtn('left', '⬅️', 'dir left')}
          {renderBtn('down', '⬇️', 'dir down')}
          {renderBtn('right', '➡️', 'dir right')}
        </div>
        <div className="mc-right">
          {renderBtn('b', 'B', 'action b')}
          {renderBtn('a', 'A', 'action a')}
          {renderBtn('pause', '⏸️', 'action pause', true)}
          {renderBtn('bomb', '💣', 'action bomb')}
        </div>
      </div>
    </div>
  );
}
