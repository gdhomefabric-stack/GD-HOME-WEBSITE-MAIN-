"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sizeOf } from "@/data/printPillows";
import { AI_IDEAS, AI_MOODS, AI_STYLES, AiError, buildPrompt, generateImage, randomSeed, type AiKind } from "@/lib/print/ai";
import { imageLayer } from "@/lib/print/design";
import { addLayer, updateSide, usePrintStudio } from "@/store/printStudio";

interface Result {
  key: string;
  kind: AiKind;
  prompt: string;
  seed: number;
  status: "loading" | "done" | "error";
  src?: string;
  error?: string;
}

const COUNT = 4;
/** results survive switching tabs */
let history: Result[] = [];

export function applyAsBackground(src: string, kind: AiKind) {
  updateSide((s) => ({ ...s, fill: { type: "image", src, mode: kind === "pattern" ? "tile" : "cover", scale: kind === "pattern" ? 0.5 : 1, dx: 0, dy: 0, aspect: 1, px: 1024 } }));
}

export function addAsLayer(src: string) {
  const { spec } = usePrintStudio.getState().design;
  const size = sizeOf(spec);
  const w = Math.min(0.8, (0.8 * size.h) / size.w);
  addLayer(imageLayer({ src, aspect: 1, px: 1024, name: "AI artwork", w }));
}

export function AiTab() {
  const [kind, setKind] = useState<AiKind>("pattern");
  const [text, setText] = useState("");
  const [style, setStyle] = useState("auto");
  const [mood, setMood] = useState("any");
  const [results, setResults] = useState<Result[]>(history);
  const [ideaSeed, setIdeaSeed] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const running = results.some((r) => r.status === "loading");

  useEffect(() => {
    history = results.filter((r) => r.status !== "loading").slice(0, 16);
  }, [results]);
  useEffect(() => () => abort.current?.abort(), []);

  const ideas = useMemo(() => {
    const list = AI_IDEAS.filter((i) => i.kind === kind);
    const start = (ideaSeed * 4) % list.length;
    return [...list.slice(start), ...list.slice(0, start)].slice(0, 4);
  }, [kind, ideaSeed]);

  const patch = (key: string, p: Partial<Result>) => setResults((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const runOne = async (r: Result, signal: AbortSignal) => {
    try {
      const src = await generateImage(r.prompt, r.seed, signal);
      patch(r.key, { status: "done", src });
    } catch (e) {
      patch(r.key, { status: "error", error: e instanceof AiError ? e.message : "Something went wrong." });
    }
  };

  const generate = async (subject = text) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const prompt = buildPrompt(subject, kind, style, mood);
    const batch: Result[] = Array.from({ length: COUNT }, () => {
      const seed = randomSeed();
      return { key: `${seed}`, kind, prompt, seed, status: "loading" };
    });
    setResults((rs) => [...batch, ...rs.filter((r) => r.status !== "loading")].slice(0, 16));
    // two at a time is kind to the free service and still feels quick
    const queue = [...batch];
    const worker = async () => {
      while (queue.length && !ctrl.signal.aborted) await runOne(queue.shift()!, ctrl.signal);
    };
    await Promise.all([worker(), worker()]);
  };

  const surprise = () => {
    const pool = AI_IDEAS.filter((i) => i.kind === kind);
    const idea = pool[Math.floor(Math.random() * pool.length)].text;
    setText(idea);
    setStyle(AI_STYLES[1 + Math.floor(Math.random() * (AI_STYLES.length - 1))].id);
    void generate(idea);
  };

  return (
    <div className="ai">
      <div className="seg seg--wide" role="group" aria-label="What should the AI make?">
        <button type="button" aria-pressed={kind === "pattern"} onClick={() => setKind("pattern")}>
          All-over pattern
        </button>
        <button type="button" aria-pressed={kind === "art"} onClick={() => setKind("art")}>
          Picture / artwork
        </button>
      </div>

      <div className="field">
        <label htmlFor="ai-text">Describe your {kind === "pattern" ? "pattern" : "picture"}</label>
        <textarea
          id="ai-text"
          className="ai__prompt"
          rows={3}
          value={text}
          maxLength={400}
          placeholder={kind === "pattern" ? "e.g. pink peonies and eucalyptus on cream" : "e.g. a golden retriever wearing a flower crown"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !running) void generate();
          }}
        />
      </div>
      <div className="chips" aria-label="Ideas">
        <span className="chips__label">Ideas:</span>
        {ideas.map((i) => (
          <button key={i.text} type="button" className="chip" onClick={() => setText(i.text)}>
            {i.text}
          </button>
        ))}
        <button type="button" className="chip chip--ghost" onClick={() => setIdeaSeed((n) => n + 1)} aria-label="More ideas">
          More…
        </button>
      </div>

      <div className="ai__opts">
        <label className="field">
          <span className="field__label">Style</span>
          <select value={style} onChange={(e) => setStyle(e.target.value)}>
            {AI_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Colours</span>
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            {AI_MOODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ai__go">
        <button type="button" className="btn" onClick={() => void generate()} disabled={running}>
          <SparkIcon /> {running ? "Creating…" : `Create ${COUNT} designs`}
        </button>
        <button type="button" className="btn btn--outline" onClick={surprise} disabled={running}>
          Surprise me
        </button>
      </div>
      {running && (
        <p className="muted ai__wait" role="status">
          Painting your designs — usually 10–30 seconds each. You can keep editing meanwhile.
        </p>
      )}

      {results.length > 0 && (
        <>
          <h3 className="ai__title">Your designs</h3>
          <ul className="ai__grid">
            {results.map((r) => (
              <li key={r.key} className={`ai__cell ai__cell--${r.status}`}>
                {r.status === "loading" && <span className="ai__shimmer" aria-label="Creating…" />}
                {r.status === "error" && (
                  <div className="ai__err">
                    <p>{r.error}</p>
                    <button
                      type="button"
                      className="btn btn--sm btn--outline"
                      onClick={() => {
                        patch(r.key, { status: "loading" });
                        void runOne(r, (abort.current ??= new AbortController()).signal);
                      }}
                    >
                      Try again
                    </button>
                  </div>
                )}
                {r.status === "done" && r.src && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.src} alt={`AI ${r.kind === "pattern" ? "pattern" : "artwork"}: ${r.prompt.split(",")[0]}`} />
                    <div className="ai__actions">
                      <button type="button" className="btn btn--sm" onClick={() => applyAsBackground(r.src!, r.kind)}>
                        {r.kind === "pattern" ? "Use as pattern" : "Fill pillow"}
                      </button>
                      <button type="button" className="btn btn--sm btn--light" onClick={() => addAsLayer(r.src!)}>
                        Add on top
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="muted ai__fine">
            Every design is created fresh by AI and is unique to you. If the service is busy, the Patterns tab works instantly
            and offline.
          </p>
        </>
      )}
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 5.6L19.5 9.5l-5.7 1.9L12 17l-1.8-5.6L4.5 9.5l5.7-1.9L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" />
    </svg>
  );
}
