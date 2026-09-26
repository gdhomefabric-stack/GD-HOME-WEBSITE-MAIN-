"use client";

import { useEffect, useState } from "react";
import { ROOMS } from "@/data/villa";
import { buildMailto, SALES_EMAIL } from "./mailto";

const TYPES = [
  { id: "home", name: "In-home measure & design", note: "We bring the swatch library and measure every window." },
  { id: "video", name: "Video consultation", note: "Thirty minutes with a designer, wherever you are." },
  { id: "showroom", name: "Showroom visit", note: "Handle the full collection, by appointment." },
];

export function ConsultationForm() {
  const [look, setLook] = useState("");
  const [room, setRoom] = useState("");
  const [type, setType] = useState("home");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setLook(p.get("look") ?? "");
    const r = ROOMS.find((x) => x.id === p.get("room"));
    if (r) setRoom(r.name);
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rooms = f.getAll("rooms").join(", ") || "—";
    const body = [
      `Consultation: ${TYPES.find((t) => t.id === f.get("type"))?.name}`,
      `Name: ${f.get("name")}`,
      `Email: ${f.get("email")}`,
      `Telephone: ${f.get("phone") || "—"}`,
      `Town / postcode: ${f.get("city") || "—"}`,
      `Preferred date: ${f.get("date") || "flexible"} (${f.get("time")})`,
      `Rooms: ${rooms}`,
      `Look from the villa: ${f.get("look") || "—"}`,
      "",
      `${f.get("message") || ""}`,
    ].join("\n");
    window.location.href = buildMailto(`Consultation request — ${f.get("name")}`, body);
    setSent(true);
  };

  if (sent)
    return (
      <div className="panel quote" role="status">
        <h2>Thank you.</h2>
        <p className="serif">Your email app should now be open with your request.</p>
        <p className="muted">
          If nothing opened, write to <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>. We reply within two working days.
        </p>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setSent(false)}>
          Edit request
        </button>
      </div>
    );

  return (
    <form className="panel quote consult" onSubmit={onSubmit}>
      <fieldset className="opt-group opt-group--cards">
        <legend className="opt-group__legend">How would you like to meet?</legend>
        <div className="opt-group__items">
          {TYPES.map((t) => (
            <label key={t.id} className={`opt${type === t.id ? " is-on" : ""}`}>
              <input type="radio" className="sr-only" name="type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
              <span className="opt__text">
                <span className="opt__label">{t.name}</span>
                <span className="opt__note">{t.note}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="consult__grid">
        <div className="field">
          <label htmlFor="c-name">Full name</label>
          <input id="c-name" name="name" autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="c-phone">Telephone</label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="field">
          <label htmlFor="c-city">Town or postcode</label>
          <input id="c-city" name="city" autoComplete="postal-code" />
        </div>
        <div className="field">
          <label htmlFor="c-date">Preferred date</label>
          <input id="c-date" name="date" type="date" />
        </div>
        <div className="field">
          <label htmlFor="c-time">Time of day</label>
          <select id="c-time" name="time" defaultValue="Morning">
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </div>
      </div>
      <fieldset className="opt-group">
        <legend className="opt-group__legend">Rooms you are dressing</legend>
        <div className="opt-group__items">
          {ROOMS.map((r) => (
            <label key={r.id} className="opt opt--check">
              <input type="checkbox" name="rooms" value={r.name} defaultChecked={r.name === room} key={`${r.id}-${room}`} />
              <span className="opt__label">{r.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="c-look">A look you liked in the villa</label>
        <input id="c-look" name="look" value={look} onChange={(e) => setLook(e.target.value)} placeholder="e.g. Velours Royal in Emerald" />
      </div>
      <div className="field">
        <label htmlFor="c-message">Tell us about your windows</label>
        <textarea id="c-message" name="message" />
      </div>
      <button type="submit" className="btn btn--block">
        Request consultation
      </button>
      <p className="muted quote__fine">Opens your email app, addressed to {SALES_EMAIL}.</p>
    </form>
  );
}
