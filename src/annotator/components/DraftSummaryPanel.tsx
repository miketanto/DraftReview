import { useRef, useState } from 'react';
import { T, label } from '../../shared/theme';
import { useIsNarrow } from '../../shared/useIsNarrow';
import type { DraftSummary } from '../types';

interface DraftSummaryPanelProps {
  summary: DraftSummary;
  isEditable: boolean;
  onChange: (summary: DraftSummary) => void;
  /** Discord-pasteable walkthrough of the whole review */
  exportText: string;
  /** Picks with any note/rank/alt — shown under the copy CTA */
  annotatedCount: number;
}

export function DraftSummaryPanel({ summary, isEditable, onChange, exportText, annotatedCount }: DraftSummaryPanelProps) {
  const narrow = useIsNarrow();
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);
  const copy = () => {
    const markCopied = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    };
    (navigator.clipboard?.writeText(exportText) ?? Promise.reject())
      .then(markCopied)
      .catch(() => {
        // Clipboard API missing/blocked (iOS in-app WebViews) — legacy execCommand copy
        const ta = document.createElement('textarea');
        ta.value = exportText;
        ta.readOnly = true;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
        document.body.appendChild(ta);
        ta.focus();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        ta.remove();
        if (ok) {
          markCopied();
          return;
        }
        // Still blocked — open + select for manual copy
        setPreviewOpen(true);
        requestAnimationFrame(() => {
          if (!preRef.current) return;
          const range = document.createRange();
          range.selectNodeContents(preRef.current);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(range);
        });
      });
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 80,
    padding: 8,
    backgroundColor: T.bg3,
    color: T.ink1,
    border: `1px solid ${T.line1}`,
    borderRadius: T.radius.m,
    fontFamily: T.mono,
    fontSize: T.fs.t4,
    resize: 'vertical',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        padding: 12,
        fontFamily: T.mono,
        backgroundColor: T.bg1,
        border: `1px solid ${T.line0}`,
        borderRadius: T.radius.l,
      }}
    >
      <div style={{ ...label, color: T.ink1, marginBottom: 12 }}>
        Draft Summary
      </div>


      <div style={{ marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 8 }}>
          Rate this draft
        </div>
        <div style={{ display: 'flex', gap: 4, ...(narrow && { flexWrap: 'wrap' }) }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const isCurrent = summary.rating === n;
            const isFilled = !!summary.rating && n <= summary.rating;
            return (
              <button
                key={n}
                onClick={() => isEditable && onChange({ ...summary, rating: isCurrent ? null : n })}
                style={{
                  width: 36,
                  height: 36,
                  padding: 0,
                  backgroundColor: isCurrent ? T.sel : isFilled ? 'rgba(77,159,255,0.12)' : T.bg2,
                  color: isCurrent ? T.bg0 : isFilled ? T.sel : T.ink3,
                  border: `1px solid ${isCurrent ? T.sel : isFilled ? 'rgba(77,159,255,0.45)' : T.line1}`,
                  borderRadius: T.radius.m,
                  cursor: isEditable ? 'pointer' : 'default',
                  fontFamily: T.mono,
                  fontSize: T.fs.t4,
                  fontWeight: 700,
                }}
              >
                {n}
              </button>
            );
          })}
          {summary.rating && (
            <span style={{ color: T.sel, fontSize: T.fs.t4, fontWeight: 700, alignSelf: 'center', marginLeft: 8 }}>
              {summary.rating}/10
            </span>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ ...label, marginBottom: 4 }}>
          Closing thoughts
        </div>
        <textarea
          value={summary.closingThoughts}
          onChange={(e) => onChange({ ...summary, closingThoughts: e.target.value })}
          readOnly={!isEditable}
          placeholder={isEditable ? 'How did this draft go overall? What archetype did you end up in?' : '(no thoughts)'}
          style={textareaStyle}
        />
      </div>

      <div>
        <div style={{ ...label, marginBottom: 4 }}>
          Ways to improve
        </div>
        <textarea
          value={summary.improvements}
          onChange={(e) => onChange({ ...summary, improvements: e.target.value })}
          readOnly={!isEditable}
          placeholder={isEditable ? 'What would you do differently next time? Key mistakes or missed signals?' : '(none)'}
          style={textareaStyle}
        />
      </div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.line0}` }}>
        <div id="discord-cta">
        <button
          onClick={copy}
          style={{
            width: '100%',
            minHeight: 48,
            padding: '10px 14px',
            backgroundColor: copied ? T.picked : T.sel,
            color: T.bg0,
            border: 'none',
            borderBottom: `2px solid ${copied ? '#2A8A3A' : '#2F7AD6'}`,
            borderRadius: T.radius.m,
            cursor: 'pointer',
            fontFamily: T.mono,
            fontSize: T.fs.t5,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {copied ? 'Copied ✓ — paste it in Discord' : 'Copy review for Discord'}
        </button>
        </div>
        <div style={{ fontSize: T.fs.t2, color: T.ink2, marginTop: 6, textAlign: 'center' }}>
          {annotatedCount === 0
            ? 'No pick notes yet — add some on the Picks tab'
            : `${annotatedCount} annotated pick${annotatedCount === 1 ? '' : 's'} + your closing thoughts`}
        </div>
      <details
        open={previewOpen}
        onToggle={(e) => setPreviewOpen(e.currentTarget.open)}
        style={{ marginTop: 8 }}
      >
        <summary style={{ ...label, cursor: 'pointer' }}>Preview copied text</summary>
        <pre
          ref={preRef}
          style={{
            margin: '8px 0 0',
            padding: 8,
            maxHeight: 240,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            backgroundColor: T.bg3,
            color: T.ink0,
            lineHeight: 1.5,
            border: `1px solid ${T.line1}`,
            borderRadius: T.radius.m,
            fontFamily: T.mono,
            fontSize: T.fs.t4,
          }}
        >
          {exportText}
        </pre>
      </details>
      </div>
    </div>
  );
}
