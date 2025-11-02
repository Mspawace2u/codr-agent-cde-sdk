/* web/builder.js
 * Codr — ND-friendly builder UI (6 core Qs + style quiz + review)
 * - Click-to-select CTAs (toggleable)
 * - One question at a time; progress saved locally until POST
 * - Posts full payload to /api/agents
 */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---- UI helpers ----------------------------------------------------------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.forEach(c => node.append(c));
    return node;
  }

  function cta(label, value, group, selectedSet) {
    const btn = el("button", { class: "cta", type: "button", "data-value": value });
    btn.textContent = label;
    const refresh = () => btn.classList.toggle("selected", selectedSet.has(value));
    btn.onclick = () => {
      if (selectedSet.has(value)) selectedSet.delete(value);
      else selectedSet.add(value);
      refresh();
    };
    refresh();
    return btn;
  }

  function singleChoice(label, value, model) {
    const btn = el("button", { class: "cta", type: "button", "data-value": value });
    btn.textContent = label;
    const refresh = () => btn.classList.toggle("selected", model.value === value);
    btn.onclick = () => { model.value = (model.value === value ? null : value); refreshParent(); };
    function refreshParent() {
      btn.parentElement && $$(".cta", btn.parentElement).forEach(b => b.classList.toggle("selected", b === btn && model.value === value));
    }
    // First paint
    queueMicrotask(refreshParent);
    return btn;
  }

  // ---- Question content (exact wording) -----------------------------------
  const core = [
    {
      id: "q1",
      label: "1 — What bottleneck or process are we fixing first?",
      help: "Short + blunt. 5–7 words tops. Example: 'Podcast episode to blog post'.",
      type: "text",
      key: "name"
    },
    {
      id: "q2",
      label: "2 — If we ship one small win in this app, what is it?",
      help: "Name the micro-win that proves it works. Example: 'Clean summary + title + slug'.",
      type: "textarea",
      key: "jtbds"
    },
    {
      id: "q3",
      label: "3 — Where will this app pull inputs from?",
      help: "Pick all that apply.",
      type: "multi",
      key: "input_sources",
      options: [
        ["gdrive","Google Drive"],["dropbox","Dropbox"],["notion","Notion"],
        ["web","Public URL scrape"],["upload","File upload"],["email","Email inbox"],["other","Other"]
      ]
    },
    {
      id: "q4",
      label: "4 — What should the app produce? (pick all)",
      help: "Outputs can be text, files, assets, or triggers.",
      type: "multi",
      key: "outputs",
      options: [
        ["summary","Summary/Brief"],["doc","Google Doc"],["json","JSON for automations"],
        ["post","Social posts"],["slides","Slides / storyboard"],["audio","Audio"],
        ["video","Video"],["image","Images"],["trigger","Trigger actions (send, post, update)"]
      ]
    },
    {
      id: "q5",
      label: "5 — Required connections the app will need (pick all)",
      help: "We’ll only ask for keys you choose here.",
      type: "multi",
      key: "api_keys_required",
      options: [
        ["google","Google Workspace"],["notion","Notion"],["slack","Slack"],
        ["openai","OpenAI"],["anthropic","Anthropic"],["gemini","Gemini (Google)"],
        ["openrouter","OpenRouter"],["replicate","Replicate"],["mail","Email/SMTP"]
      ]
    },
    {
      id: "q6",
      label: "6 — Is there a next project or process you want to trigger once this agent completes its JTBD after you’re done?",
      help: "Click a button so we keep code agile for chaining later.",
      type: "single",
      key: "next_step",
      options: [["yes","Yes"],["no","No"]]
    }
  ];

  // Style quiz (exact phrasing you requested)
  const style = [
    {
      id: "s1",
      label: "Time to give your app some flair… Theme?",
      type: "single",
      key: "theme",
      options: [["light","Light"],["dark","Dark"],["either","Either works for me"]]
    },
    {
      id: "s2",
      label: "Color palette?",
      type: "single",
      key: "color",
      options: [
        ["mono","Monochromatic with on-brand pops"],
        ["bright","Bright"],
        ["muted","Muted"],
        ["neutrals","Neutrals"],
        ["bw","Black & White"]
      ]
    },
    {
      id: "s3",
      label: "Font vibe?",
      type: "single",
      key: "font",
      options: [
        ["geometric","Geometric"],
        ["book","Book-style typeface"],
        ["code","Code-style typeface"],
        ["display","Display + sans-serif combo"]
      ]
    },
    {
      id: "s4",
      label: "Design vibe?",
      type: "single",
      key: "vibe",
      options: [
        ["simple","Simple & minimalist"],
        ["cleanmax","Clean & maximalist"],
        ["corporate","Corporate"],
        ["boho","Boho & feminine"],
        ["playful","Playful & engaging"]
      ]
    },
    {
      id: "s5",
      label: "Motion effects?",
      type: "single",
      key: "motion",
      options: [
        ["none","None"],
        ["elements","Elements only"],
        ["text+elements","Text and elements"],
        ["transitions","Page/scroll transitions"],
        ["surprise","Surprise me"]
      ]
    },
    {
      id: "s6",
      label: "Favorite app (optional)",
      help: "Name one app whose design makes the work feel easier, energizes you, or lightens your mood. Paste a link if you have one.",
      type: "text",
      key: "favorite_app"
    },
    {
      id: "s7",
      label: "Screenshots (optional)",
      help: "Upload up to 3 images that show design elements you want to mirror (vibe, icons/shapes, colors/fonts).",
      type: "file",
      key: "screenshots",
      max: 3
    }
  ];

  // ---- State ----------------------------------------------------------------
  const state = {
    answers: {
      name: "", jtbds: "", input_sources: [], outputs: [],
      api_keys_required: [], next_step: null
    },
    style: { theme:null, color:null, font:null, vibe:null, motion:null, favorite_app:"", screenshots:[] },
    llm_models: {},          // optional per-JTBD map (you can extend later)
    frontend_framework: null // derived (react|vite)
  };

  // Heuristic to choose framework
  function chooseFramework(sty) {
    if (sty.vibe === "playful" || sty.motion === "transitions" || sty.motion === "text+elements") {
      return "react";
    }
    return "vite";
  }

  // ---- Render engine --------------------------------------------------------
  const steps = [...core, ...style];
  let idx = 0;

  function renderQuestion(q) {
    const main = $("#app");
    main.innerHTML = "";

    const title = el("h2", {}, q.label);
    const help = q.help ? el("p", { class: "help" }, q.help) : null;

    let field = null;

    if (q.type === "text") {
      const input = el("input", { type: "text", class: "input" });
      input.value = (q.key in state.answers ? state.answers[q.key] : state.style[q.key]) || "";
      input.oninput = () => {
        if (q.key in state.answers) state.answers[q.key] = input.value;
        else state.style[q.key] = input.value;
      };
      field = input;
    }

    if (q.type === "textarea") {
      const ta = el("textarea", { class: "textarea", rows: 5 });
      ta.value = state.answers[q.key] || "";
      ta.oninput = () => state.answers[q.key] = ta.value;
      field = ta;
    }

    if (q.type === "multi") {
      const set = new Set(state.answers[q.key] || []);
      const wrap = el("div", { class: "cta-row" });
      q.options.forEach(([val, label]) => wrap.append(cta(label, val, q.key, set)));
      field = wrap;
      // persist on advance
      field._get = () => { state.answers[q.key] = Array.from(set); };
    }

    if (q.type === "single") {
      const model = { value: (q.key in state.answers ? state.answers[q.key] : state.style[q.key]) || null };
      const wrap = el("div", { class: "cta-row" });
      q.options.forEach(([val, label]) => wrap.append(singleChoice(label, val, model)));
      field = wrap;
      field._get = () => {
        if (q.key in state.answers) state.answers[q.key] = model.value;
        else state.style[q.key] = model.value;
      };
    }

    if (q.type === "file") {
      const input = el("input", { type: "file", accept: "image/*", multiple: true });
      field = el("div", {}, input);
      field._get = async () => {
        const files = Array.from(input.files || []).slice(0, q.max || 3);
        state.style.screenshots = files;
      };
    }

    const nav = el("div", { class: "nav" },
      idx > 0 ? el("button", { class: "ghost", onclick: back }, "Back") : el("span"),
      el("button", { class: "primary", onclick: next }, idx === steps.length - 1 ? "Review" : "Next")
    );

    main.append(title);
    help && main.append(help);
    field && main.append(field);
    main.append(nav);

    function back() { idx = Math.max(0, idx - 1); renderQuestion(steps[idx]); }
    async function next() {
      // collect for multi/single/file widgets
      if (field && typeof field._get === "function") await field._get();
      if (idx < steps.length - 1) { idx++; renderQuestion(steps[idx]); }
      else review();
    }
  }

  function bullet(label, value) {
    const li = el("li");
    li.innerHTML = `<strong>${label}:</strong> ${value}`;
    return li;
  }

  function review() {
    state.frontend_framework = chooseFramework(state.style);

    const main = $("#app");
    main.innerHTML = "";

    const h2 = el("h2", {}, "Quick Review");
    const list = el("ul", { class: "review" });
    list.append(
      bullet("App name", state.answers.name || "—"),
      bullet("Micro-win", state.answers.jtbds || "—"),
      bullet("Inputs", (state.answers.input_sources || []).join(", ") || "—"),
      bullet("Outputs", (state.answers.outputs || []).join(", ") || "—"),
      bullet("Connections", (state.answers.api_keys_required || []).join(", ") || "—"),
      bullet("Chain next?", state.answers.next_step || "—"),
      bullet("Theme", state.style.theme || "—"),
      bullet("Color", state.style.color || "—"),
      bullet("Font", state.style.font || "—"),
      bullet("Design vibe", state.style.vibe || "—"),
      bullet("Motion", state.style.motion || "—"),
      bullet("Favorite app", state.style.favorite_app || "—"),
      bullet("Framework", state.frontend_framework)
    );

    const actions = el("div", { class: "nav" },
      el("button", { class: "ghost", onclick: edit }, "Fix it"),
      el("button", { class: "primary", onclick: submit }, "Code it")
    );

    main.append(h2, list, actions);

    function edit() { idx = 0; renderQuestion(steps[idx]); }

    async function submit() {
      // upload screenshots (if any) first
      let screenshotKeys = [];
      if (state.style.screenshots && state.style.screenshots.length) {
        for (const file of state.style.screenshots) {
          const fd = new FormData();
          fd.append("file", file);
          const up = await fetch("/api/assets/upload", { method: "POST", body: fd });
          const { key } = await up.json();
          screenshotKeys.push(key);
        }
      }

      const payload = {
        name: state.answers.name,
        jtbds: state.answers.jtbds,
        logic_yaml: "", // optional at create; can be added later
        input_sources: (state.answers.input_sources || []).join(","),
        api_keys_required: (state.answers.api_keys_required || []).join(","),
        visual_style: {
          theme: state.style.theme,
          color: state.style.color,
          font: state.style.font,
          vibe: state.style.vibe,
          motion: state.style.motion,
          favoriteApp: state.style.favorite_app,
          screenshots: screenshotKeys
        },
        frontend_framework: state.frontend_framework,
        llm_models: state.llm_models // empty map for now; can be edited in a details screen
      };

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Create failed");
        return;
        }
      // Show preview URL
      const main = $("#app");
      main.innerHTML = "";
      main.append(
        el("h2", {}, "Agent created 🎉"),
        el("p", {}, "Preview or share your agent:"),
        el("p", {}, el("a", { href: data.preview_url, target: "_blank" }, data.preview_url)),
        el("p", {}, "You can now refine prompts, models and connectors from the agent dashboard.")
      );
    }
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => renderQuestion(steps[idx]));
})();
