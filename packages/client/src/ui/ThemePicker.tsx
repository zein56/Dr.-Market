import { useEffect, useState } from 'react';
import { THEMES, THEME_IDS, applyTheme, currentTheme, onThemeChange, type ThemeId } from '../game/themes';
import { sfx } from '../game/audio';

/** Görsel tema seçici: tahta renkleri + sayfa görünümü. Seçim bu cihazda hatırlanır. */
export default function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState<ThemeId>(currentTheme().id);

  useEffect(() => onThemeChange(setActive), []);

  return (
    <div className={`theme-picker ${compact ? 'compact' : ''}`} role="group" aria-label="Görsel tema">
      {!compact && <span className="theme-picker-label">🎨 Tema</span>}
      {THEME_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={`theme-pill ${active === id ? 'on' : ''}`}
          onClick={() => {
            sfx('click');
            applyTheme(id);
          }}
          title={THEMES[id].label}
        >
          <span className="theme-pill-emoji">{THEMES[id].emoji}</span>
          <span className="theme-pill-text">{THEMES[id].label}</span>
        </button>
      ))}
    </div>
  );
}
