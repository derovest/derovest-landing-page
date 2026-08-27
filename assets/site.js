/* ── contact details: change these three lines and every page follows ── */
const WHATSAPP = "916381641340";          // digits only, with country code
const EMAIL    = "hello@derovest.com";
const WA_SHOWN = "+91 63816 41340";       // how the number reads once revealed

const $ = (sel) => document.querySelector(sel);

const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* theme toggle — respects the OS until the visitor overrides it */
const root = document.documentElement;
try {
  const saved = localStorage.getItem("derovest-theme");
  if (saved) root.setAttribute("data-theme", saved);
} catch (e) {}
const themeBtn = $("#theme");
if (themeBtn) themeBtn.addEventListener("click", () => {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const now  = root.getAttribute("data-theme") || (dark ? "dark" : "light");
  const next = now === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("derovest-theme", next); } catch (e) {}
});

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

/* scroll reveals */
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
document.querySelectorAll(".rv").forEach((el, i) => {
  el.style.transitionDelay = Math.min(i % 4, 3) * 60 + "ms";
  io.observe(el);
});
