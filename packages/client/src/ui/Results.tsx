import type { MatchResult } from '../App';
import { sfx } from '../game/audio';

export default function Results({
  results,
  you,
  onBack,
}: {
  results: MatchResult[];
  you: string;
  onBack: () => void;
}) {
  const mine = results.find((r) => r.id === you);

  return (
    <div className="results">
      <div className="results-head">
        <h2>{mine ? sentenceFor(mine.placement, results.length) : 'Maç bitti'}</h2>
        {mine && (
          <p className="muted">
            {mine.score} puan · en uzun zincir {mine.maxChain}
          </p>
        )}
      </div>

      <ol className="result-list">
        {results.map((r) => (
          <li key={r.id} className={`result-row ${r.id === you ? 'me' : ''}`}>
            <span className="place">{r.placement}</span>
            <span className="rname">{r.name}</span>
            <span className="rscore">{r.score}</span>
          </li>
        ))}
      </ol>

      <button
        className="btn primary wide"
        onClick={() => {
          sfx('click');
          onBack();
        }}
      >
        Odaya dön
      </button>
    </div>
  );
}

function sentenceFor(place: number, total: number) {
  if (place === 1) return 'Kazandın';
  if (place === 2) return 'Kıl payı kaçtı';
  if (place === total) return 'Bu sefer olmadı';
  return `${place}. oldun`;
}
