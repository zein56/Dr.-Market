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

  const getStyle = (id: string): React.CSSProperties => {
    const pos = layout[id];
    if (pos) {
      return { position: 'fixed', left: pos.x, top: pos.y, margin: 0, bottom: 'auto', right: 'auto' };
    }
    return {};
  };

  return (
    <div className="mobile-controls">
      {/* Sol taraf: D-Pad */}
      <div className="mc-left">
        <button className="mc-btn dir left" style={getStyle('left')} {...holdable(sink, Input.Left, Input.SoftDropOff)}>⬅️</button>
        <button className="mc-btn dir down" style={getStyle('down')} {...holdable(sink, Input.SoftDropOn, Input.SoftDropOff)}>⬇️</button>
        <button className="mc-btn dir right" style={getStyle('right')} {...holdable(sink, Input.Right, Input.SoftDropOff)}>➡️</button>
      </div>

      {/* Sağ taraf: Aksiyon */}
      <div className="mc-right">
        <button className="mc-btn action b" style={getStyle('b')} {...holdable(sink, Input.RotateCCW)}>B</button>
        <button className="mc-btn action a" style={getStyle('a')} {...holdable(sink, Input.RotateCW)}>A</button>
        <button
          className="mc-btn action pause"
          style={getStyle('pause')}
          onPointerDown={(e) => { e.preventDefault(); onPause(); }}
          onContextMenu={(e) => e.preventDefault()}
        >⏸️</button>
        {showBomb && (
          <button className="mc-btn action bomb" style={getStyle('bomb')} {...holdable(sink, Input.UseBomb)}>💣</button>
        )}
      </div>
    </div>
  );
}
