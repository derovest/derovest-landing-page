/* ── contact details: change these three lines and every page follows ── */
const WHATSAPP = "916381641340";          // digits only, with country code
const EMAIL    = "hello@derovest.com";
const WA_SHOWN = "+91 63816 41340";       // how the number reads once revealed

const $ = (sel) => document.querySelector(sel);

const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* mobile menu — the nav collapses below 1000px */
const navEl = document.getElementById("nav");
const navToggle = document.getElementById("nav-toggle");
if (navEl && navToggle) {
  const setOpen = (open) => {
    navEl.dataset.open = open ? "true" : "false";
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  setOpen(false);
  navToggle.addEventListener("click", () => setOpen(navEl.dataset.open !== "true"));
  // a tap on any link, Escape, or a jump back to desktop width all close it
  navEl.querySelectorAll(".nav-links a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  matchMedia("(min-width: 1001px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
}

/* contact icons: first click reveals the detail, second click opens the app */
for (const a of document.querySelectorAll(".direct a.reveal")) {
  a.addEventListener("click", (e) => {
    if (a.classList.contains("shown")) return;      // revealed already — let the link work
    e.preventDefault();
    const wa = a.dataset.reveal === "wa";
    a.querySelector(".v").textContent = wa ? WA_SHOWN : EMAIL;
    a.href = wa ? "https://wa.me/" + WHATSAPP : "mailto:" + EMAIL;
    if (wa) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    a.setAttribute("aria-label", (wa ? "Open WhatsApp chat — " : "Send an email to ") + (wa ? WA_SHOWN : EMAIL));
    a.title = a.getAttribute("aria-label");
    a.classList.add("shown");
    a.closest(".direct").classList.add("open");
  });
}

/* brief → prefilled WhatsApp or email, no backend */
const form = $("#brief");
const note = $("#form-note");

function brief() {
  const nameEl = $("#f-name");
  const name    = nameEl.value.trim();
  const company = ($("#f-company") || {}).value?.trim() || "";
  const email   = ($("#f-email") || {}).value?.trim() || "";
  const need    = $("#f-need").value;
  const msg     = $("#f-msg").value.trim();
  if (!name) {
    nameEl.focus();
    note.textContent = "Add your name first, so we know who we're replying to.";
    return null;
  }
  note.textContent = "Nothing is stored here — this opens your own app with the message written.";
  const lines = ["Hi Derovest — I'm " + name + (company ? " from " + company : "") + "."];
  lines.push("I'm interested in: " + need);
  if (email) lines.push("Reach me at: " + email);
  if (msg) lines.push("", msg);
  return { name, company, email, need, msg, body: lines.join("\n") };
}

if (form) form.addEventListener("submit", (e) => {
  e.preventDefault();
  const b = brief();
  if (!b) return;
  window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(b.body), "_blank", "noopener");
});

const mailBtn = $("#send-mail");
if (mailBtn) mailBtn.addEventListener("click", () => {
  const b = brief();
  if (!b) return;
  const subject = b.need + " — " + (b.company || b.name);
  const query = "subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(b.body);

  /* an anchor click hands the mailto to the OS without navigating this page away.
     assigning location.href does nothing at all when no mail app is registered. */
  const link = document.createElement("a");
  link.href = "mailto:" + EMAIL + "?" + query;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  /* whether or not a mail app answered, leave a way through */
  const gmail = document.createElement("a");
  gmail.href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(EMAIL) + "&" +
    "su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(b.body);
  gmail.target = "_blank"; gmail.rel = "noopener noreferrer";
  gmail.textContent = "write it in Gmail";

  const copy = document.createElement("a");
  copy.href = "#"; copy.textContent = "copy the message";
  copy.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText("To: " + EMAIL + "\nSubject: " + subject + "\n\n" + b.body);
      note.textContent = "Copied — paste it into an email to " + EMAIL + ".";
    } catch (err) {
      note.textContent = "Copy didn't work here. Our address is " + EMAIL + ".";
    }
  });

  note.textContent = "No mail app? ";
  note.append(gmail, " or ", copy, " — we're at " + EMAIL + ".");
});

/* ── scroll reveals ───────────────────────────────────────────────────
   One observer for anything that animates on arrival. Children of a
   [data-stagger] container get an index so CSS can cascade them.     */
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    en.target.classList.add("in");
    io.unobserve(en.target);
  }
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

document.querySelectorAll("[data-stagger]").forEach((group) => {
  [...group.children].forEach((child, i) => child.style.setProperty("--i", i));
});

document.querySelectorAll(".rv, [data-stagger], .gutter .stick").forEach((el) => {
  // Arriving at a #hash, or restoring a scroll position, jumps over content
  // without it ever intersecting. Anything already scrolled past is shown at
  // once and unobserved, so nobody scrolls up into a blank gap.
  if (el.getBoundingClientRect().bottom < 0) {
    el.style.transition = "none";
    el.classList.add("in");
    requestAnimationFrame(() => { el.style.transition = ""; });
    return;
  }
  io.observe(el);
});

/* ── nav condenses once you have started reading, and carries a
      hairline progress bar for how far through the page you are ── */
(function () {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const bar = document.createElement("div");
  bar.className = "progress";
  nav.appendChild(bar);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle("compact", y > 120);
      const span = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (span > 0 ? Math.min(1, y / span) : 0) + ")";
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  onScroll();
})();

/* ── automation demo ──────────────────────────────────────────────────
   Plays the manual column out and the automated column in, one step at
   a time, then moves to the next scenario. Starts only when scrolled
   into view, pauses while hovered or when the tab is hidden, and stops
   auto-advancing the moment someone picks a scenario themselves.      */
(function () {
  const root = document.querySelector(".demo");
  if (!root) return;

  const tabs = [...root.querySelectorAll(".demo-tab")];
  const panels = [...root.querySelectorAll(".demo-panel")];
  if (!tabs.length) return;

  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  const STEP = 420;          // gap between steps
  const HOLD = 2600;         // pause once a scenario has finished
  let current = 0, timers = [], playing = false, manual = false, hovered = false;

  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const at = (fn, ms) => timers.push(setTimeout(fn, ms));

  function reset(i) {
    const p = panels[i];
    p.querySelectorAll(".demo-col.now .demo-step").forEach((s) => s.classList.remove("gone"));
    p.querySelectorAll(".demo-col.after .demo-step").forEach((s) => s.classList.remove("in"));
    p.querySelector(".saved").classList.remove("in");
  }

  function show(i, { auto = false } = {}) {
    clear();
    current = i;
    tabs.forEach((t, n) => t.setAttribute("aria-selected", String(n === i)));
    panels.forEach((p, n) => { p.hidden = n !== i; });
    reset(i);

    const p = panels[i];
    const gone = [...p.querySelectorAll(".demo-col.now .demo-step")];
    const arriving = [...p.querySelectorAll(".demo-col.after .demo-step")];
    const saved = p.querySelector(".saved");

    if (calm.matches) {                       // no animation: show the end state
      gone.forEach((s) => s.classList.add("gone"));
      arriving.forEach((s) => s.classList.add("in"));
      saved.classList.add("in");
      return;
    }

    const pairs = Math.max(gone.length, arriving.length);
    for (let n = 0; n < pairs; n++) {
      at(() => {
        gone[n] && gone[n].classList.add("gone");
        arriving[n] && arriving[n].classList.add("in");
      }, 260 + n * STEP);
    }
    const done = 260 + pairs * STEP;
    at(() => saved.classList.add("in"), done);

    // how long the tab's progress bar should take, so the two agree
    tabs[i].style.setProperty("--dwell", (done + HOLD) + "ms");

    if (auto && !manual) at(() => { if (!hovered) show((i + 1) % panels.length, { auto: true }); else at(() => show((i + 1) % panels.length, { auto: true }), 1200); }, done + HOLD);
  }

  tabs.forEach((t, i) => t.addEventListener("click", () => { manual = true; clear(); show(i); }));
  root.addEventListener("mouseenter", () => { hovered = true; });
  root.addEventListener("mouseleave", () => { hovered = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) clear(); else if (playing && !manual) show(current, { auto: true }); });

  new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      obs.disconnect();
      // someone who already picked a scenario keeps it — scrolling in must not
      // yank the selection back to the first one
      if (manual) return;
      playing = true;
      show(0, { auto: true });
    }
  }, { threshold: 0.25 }).observe(root);
})();
