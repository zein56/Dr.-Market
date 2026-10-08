import React, { useMemo } from 'react';
import { Input } from '@pill/game-core';
import { holdable } from '../game/controls';
import { getSavedLayout } from './MobileControlsEditor';

export default function MobileControls({
  sink,
  onPause,
  showBomb
}: {
  sink: (i: Input) => void;
  onPause: () => void;
  showBomb: boolean;
}) {
  const layout = useMemo(() => getSavedLayout(), []);

  const getStyle = (id: string, isPlaceholder?: boolean): React.CSSProperties => {
    const pos = layout[id];
    if (isPlaceholder && pos) {
      return { visibility: 'hidden', pointerEvents: 'none' };
    }
    if (pos) {
      return { position: 'fixed', left: pos.x, top: pos.y, margin: 0, bottom: 'auto', right: 'auto', zIndex: 100 };
    }
    if (isPlaceholder) {
      return { display: 'none' }; // Don't render placeholder if not fixed
    }
    return {};
  };

  return (
    <div className="mobile-controls">
      {/* Sol taraf: D-Pad */}
      <div className="mc-left">
        <div className="mc-btn dir left" style={getStyle('left', true)}>⬅️</div>
        <button className="mc-btn dir left" style={getStyle('left')} {...holdable(sink, Input.Left, Input.SoftDropOff)}>⬅️</button>
        <div className="mc-btn dir down" style={getStyle('down', true)}>⬇️</div>
        <button className="mc-btn dir down" style={getStyle('down')} {...holdable(sink, Input.SoftDropOn, Input.SoftDropOff)}>⬇️</button>
        <div className="mc-btn dir right" style={getStyle('right', true)}>➡️</div>
        <button className="mc-btn dir right" style={getStyle('right')} {...holdable(sink, Input.Right, Input.SoftDropOff)}>➡️</button>
      </div>

      {/* Sağ taraf: Aksiyon */}
      <div className="mc-right">
        <div className="mc-btn action b" style={getStyle('b', true)}>B</div>
        <button className="mc-btn action b" style={getStyle('b')} {...holdable(sink, Input.RotateCCW)}>B</button>
        <div className="mc-btn action a" style={getStyle('a', true)}>A</div>
        <button className="mc-btn action a" style={getStyle('a')} {...holdable(sink, Input.RotateCW)}>A</button>
        <div className="mc-btn action pause" style={getStyle('pause', true)}>⏸️</div>
        <button
          className="mc-btn action pause"
          style={getStyle('pause')}
          onPointerDown={(e) => { e.preventDefault(); onPause(); }}
          onContextMenu={(e) => e.preventDefault()}
        >⏸️</button>
        {showBomb && (
          <>
            <div className="mc-btn action bomb" style={getStyle('bomb', true)}>💣</div>
            <button className="mc-btn action bomb" style={getStyle('bomb')} {...holdable(sink, Input.UseBomb)}>💣</button>
          </>
        )}
      </div>
    </div>
  );
}
