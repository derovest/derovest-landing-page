/* ══════════════════════════════════════════════════════════════════════
   DEROVEST — behaviour
   ──────────────────────────────────────────────────────────────────────
   No framework and no build step. Everything here is an enhancement:
   with JavaScript switched off, every page still renders its full
   content, every link works and the contact details are reachable.
   Nothing in this file measures layout inside a scroll or pointer
   handler — reads are batched into requestAnimationFrame, and anything
   expensive is gated behind a media query.
   ══════════════════════════════════════════════════════════════════════ */

/* ── contact details: change these three lines and every page follows ── */
const WHATSAPP = "916381641340";          // digits only, with country code
const EMAIL    = "hello@derovest.com";
const WA_SHOWN = "+91 63816 41340";       // how the number reads once revealed

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const FINE    = matchMedia("(hover:hover) and (pointer:fine)");

const year = $("#year");
if (year) year.textContent = new Date().getFullYear();


/* ══ 1. NAVIGATION ════════════════════════════════════════════════════ */
(function nav() {
  const bar = $("#nav");
  const toggle = $("#nav-toggle");
  if (!bar) return;

  /* the mobile panel is positioned under the bar, whose height changes */
  const measure = () => bar.style.setProperty("--nav-h", bar.offsetHeight + "px");
  measure();
  addEventListener("resize", measure, { passive: true });

  if (toggle) {
    const setOpen = (open) => {
      bar.dataset.open = open ? "true" : "false";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      // the page behind an open full-height menu must not scroll with it
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) measure();
    };
    setOpen(false);
    toggle.addEventListener("click", () => setOpen(bar.dataset.open !== "true"));
    $$(".nav-links a", bar).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    matchMedia("(min-width:1061px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* solid background once reading has started, plus reading progress */
  const progress = document.createElement("div");
  progress.className = "progress";
  bar.appendChild(progress);

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      bar.classList.toggle("solid", y > 24);
      const span = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = "scaleX(" + (span > 0 ? Math.min(1, y / span) : 0) + ")";
      queued = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();


/* ══ 2. SCROLL REVEALS ════════════════════════════════════════════════
   One observer for everything that animates on arrival. Children of a
   [data-stagger] container get an index so CSS can cascade them.       */
(function reveals() {
  const targets = $$(".rv, [data-stagger], .spine .stick, .timeline, .auto-before, .auto-after, .mock");
  if (!targets.length) return;

  $$("[data-stagger]").forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty("--i", i));
  });

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in");
      io.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.04 });

  targets.forEach((el) => {
    /* Landing on a #hash, or a restored scroll position, jumps over
       content without it ever intersecting. Anything already scrolled
       past is shown at once, so nobody scrolls up into a blank gap. */
    if (el.getBoundingClientRect().bottom < 0) {
      el.style.transition = "none";
      el.classList.add("in");
      requestAnimationFrame(() => { el.style.transition = ""; });
      return;
    }
    io.observe(el);
  });
})();


/* ══ 3. SERVICES SWITCHER ═════════════════════════════════════════════
   Every panel is in the document and only hidden with opacity, so the
   copy is crawlable. Arrow keys move between tabs, as a tablist should. */
(function switcher() {
  const list = $("#svc-switch");
  if (!list) return;
  const tabs = $$("[role=tab]", list);
  const panels = $$("#svc-panels [role=tabpanel]");
  if (!tabs.length) return;

  const select = (index, focus) => {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach((panel, i) => {
      const on = i === index;
      panel.dataset.active = on ? "true" : "false";
      panel.toggleAttribute("inert", !on);
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(i));
    // hovering is how most people will drive this; it should just work
    if (FINE.matches) tab.addEventListener("mouseenter", () => select(i));
    tab.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      let next = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = i === last ? 0 : i + 1;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = last;
      if (next === null) return;
      e.preventDefault();
      select(next, true);
    });
  });
  select(0);
})();


/* ══ 4. POINTER PARALLAX ══════════════════════════════════════════════
   Desktop only, and only for the hero diagram. The handler writes two
   custom properties and nothing else — no layout is read per move.     */
(function parallax() {
  const art = $("#branch");
  if (!art || !FINE.matches || REDUCED.matches) return;

  let queued = false, px = 0, py = 0;
  addEventListener("pointermove", (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      art.style.setProperty("--px", px.toFixed(3));
      art.style.setProperty("--py", py.toFixed(3));
      queued = false;
    });
  }, { passive: true });
})();


/* ══ 5. MAGNETIC BUTTONS ══════════════════════════════════════════════
   The element's own box is read once on enter, not on every move.     */
(function magnetic() {
  if (!FINE.matches || REDUCED.matches) return;
  $$(".magnetic").forEach((el) => {
    let box = null;
    const reset = () => { el.style.setProperty("--mx", "0px"); el.style.setProperty("--my", "0px"); box = null; };
    el.addEventListener("pointerenter", () => { box = el.getBoundingClientRect(); });
    el.addEventListener("pointermove", (e) => {
      if (!box) box = el.getBoundingClientRect();
      const dx = (e.clientX - (box.left + box.width / 2)) * 0.28;
      const dy = (e.clientY - (box.top + box.height / 2)) * 0.34;
      el.style.setProperty("--mx", dx.toFixed(1) + "px");
      el.style.setProperty("--my", dy.toFixed(1) + "px");
    });
    el.addEventListener("pointerleave", reset);
    el.addEventListener("blur", reset);
  });
})();


/* ══ 6. CONTACT DETAILS ═══════════════════════════════════════════════
   First click reveals the detail, second click opens the app. The
   address is never in the markup, so it is not there to be scraped.   */
$$(".direct a.reveal").forEach((a) => {
  a.addEventListener("click", (e) => {
    if (a.classList.contains("shown")) return;   // revealed already — let the link work
    e.preventDefault();
    const wa = a.dataset.reveal === "wa";
    $(".v", a).textContent = wa ? WA_SHOWN : EMAIL;
    a.href = wa ? "https://wa.me/" + WHATSAPP : "mailto:" + EMAIL;
    if (wa) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    a.setAttribute("aria-label", (wa ? "Open WhatsApp chat — " : "Send an email to ") + (wa ? WA_SHOWN : EMAIL));
    a.title = a.getAttribute("aria-label");
    a.classList.add("shown");
    a.closest(".direct").classList.add("open");
  });
});


/* ══ 7. BRIEF FORM ════════════════════════════════════════════════════
   No backend. The form composes a message and hands it to the visitor's
   own WhatsApp or mail app — nothing is stored or sent by this site.   */
(function briefForm() {
  const form = $("#brief");
  const note = $("#form-note");
  if (!form || !note) return;

  const DEFAULT_NOTE = "Nothing is stored here — this opens your own app with the message written.";

  function compose() {
    const nameEl = $("#f-name");
    const name = nameEl.value.trim();
    if (!name) {
      nameEl.focus();
      note.textContent = "Add your name first, so we know who we're replying to.";
      return null;
    }
    const company = ($("#f-company")?.value || "").trim();
    const email   = ($("#f-email")?.value || "").trim();
    const need    = $("#f-need")?.value || "Other";
    const message = ($("#f-msg")?.value || "").trim();

    note.textContent = DEFAULT_NOTE;
    const lines = ["Hi Derovest — I'm " + name + (company ? " from " + company : "") + "."];
    lines.push("I'm interested in: " + need);
    if (email) lines.push("Reach me at: " + email);
    if (message) lines.push("", message);
    return { name, company, need, body: lines.join("\n") };
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const brief = compose();
    if (!brief) return;
    open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(brief.body), "_blank", "noopener");
  });

  $("#send-mail")?.addEventListener("click", () => {
    const brief = compose();
    if (!brief) return;
    const subject = brief.need + " — " + (brief.company || brief.name);
    const query = "subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(brief.body);

    /* An anchor click hands the mailto to the OS without navigating away.
       Assigning location.href does nothing at all when no mail app is
       registered, which is common on desktop Chrome. */
    const link = document.createElement("a");
    link.href = "mailto:" + EMAIL + "?" + query;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    /* Whether or not a mail app answered, leave a way through. */
    const gmail = document.createElement("a");
    gmail.href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(EMAIL) +
                 "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(brief.body);
    gmail.target = "_blank"; gmail.rel = "noopener noreferrer";
    gmail.textContent = "write it in Gmail";

    const copy = document.createElement("a");
    copy.href = "#"; copy.textContent = "copy the message";
    copy.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText("To: " + EMAIL + "\nSubject: " + subject + "\n\n" + brief.body);
        note.textContent = "Copied — paste it into an email to " + EMAIL + ".";
      } catch {
        note.textContent = "Copy didn't work here. Our address is " + EMAIL + ".";
      }
    });

    note.textContent = "No mail app? ";
    note.append(gmail, " or ", copy, " — we're at " + EMAIL + ".");
  });
})();


/* ══ 8. PAGE TRANSITION ═══════════════════════════════════════════════
   A short fade on the way out of a same-origin page. Guarded hard: a
   modified click, a new tab, a hash, a download or a non-http scheme
   all fall through to the browser untouched, and pageshow clears the
   class so a back-button restore is never left blank.                  */
(function transition() {
  if (REDUCED.matches) return;

  addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;

    document.body.classList.add("leaving");
  });

  addEventListener("pageshow", () => document.body.classList.remove("leaving"));
})();
