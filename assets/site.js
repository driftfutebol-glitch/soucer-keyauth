(() => {
  const STORAGE_KEY = "keyauth_custom_keys_v1";

  const state = {
    keys: [],
  };

  const el = {
    menuToggle: document.getElementById("menuToggle"),
    navLinks: document.getElementById("navLinks"),
    generateForm: document.getElementById("generateForm"),
    validateForm: document.getElementById("validateForm"),
    appName: document.getElementById("appName"),
    buyerName: document.getElementById("buyerName"),
    durationDays: document.getElementById("durationDays"),
    latestKeyValue: document.getElementById("latestKeyValue"),
    copyLatestKey: document.getElementById("copyLatestKey"),
    validateAppName: document.getElementById("validateAppName"),
    validateKeyValue: document.getElementById("validateKeyValue"),
    validationResult: document.getElementById("validationResult"),
    keysTableBody: document.getElementById("keysTableBody"),
    exportKeys: document.getElementById("exportKeys"),
    clearKeys: document.getElementById("clearKeys"),
    accs: document.getElementById("accs"),
    apps: document.getElementById("apps"),
    licenses: document.getElementById("licenses"),
    activeUsers: document.getElementById("activeUsers"),
  };

  function init() {
    wireMenu();
    wireSmoothScroll();
    wireReveal();
    loadKeys();
    renderKeys();
    wireForms();
    wireActions();
    loadStats();
  }

  function wireMenu() {
    if (!el.menuToggle || !el.navLinks) return;

    el.menuToggle.addEventListener("click", () => {
      const willOpen = !el.navLinks.classList.contains("open");
      el.navLinks.classList.toggle("open", willOpen);
      el.menuToggle.setAttribute("aria-expanded", String(willOpen));
    });

    el.navLinks.querySelectorAll("a").forEach((anchor) => {
      anchor.addEventListener("click", () => {
        el.navLinks.classList.remove("open");
        el.menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function wireSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const href = anchor.getAttribute("href");
        if (!href || href === "#") return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function wireReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  function wireForms() {
    if (el.generateForm) {
      el.generateForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const app = sanitize(el.appName.value);
        const buyer = sanitize(el.buyerName.value);
        const days = Number(el.durationDays.value || 30);

        if (!app || !buyer || Number.isNaN(days)) {
          setResult("Preencha app, cliente e duracao corretamente.", "error");
          return;
        }

        const now = Date.now();
        const keyData = {
          id: createId(),
          key: buildKey(app),
          app,
          buyer,
          createdAt: now,
          expiresAt: now + days * 24 * 60 * 60 * 1000,
          active: true,
          activations: 0,
        };

        state.keys.unshift(keyData);
        saveKeys();
        renderKeys();

        el.latestKeyValue.textContent = keyData.key;
        setResult("Key gerada com sucesso.", "success");
        el.generateForm.reset();
      });
    }

    if (el.validateForm) {
      el.validateForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const app = sanitize(el.validateAppName.value);
        const keyInput = sanitizeKey(el.validateKeyValue.value);

        if (!app || !keyInput) {
          setResult("Informe o app e a key para validar.", "error");
          return;
        }

        const license = state.keys.find((item) => item.key === keyInput);
        if (!license) {
          setResult("Key invalida: nao encontrada no painel local.", "error");
          return;
        }

        if (sanitize(license.app).toLowerCase() !== app.toLowerCase()) {
          setResult("Key encontrada, mas o app informado nao confere.", "warning");
          return;
        }

        if (!license.active) {
          setResult("Key revogada. Acesso bloqueado.", "error");
          return;
        }

        if (Date.now() > license.expiresAt) {
          setResult("Key expirada. Renove a licenca para continuar.", "warning");
          return;
        }

        license.activations = Number(license.activations || 0) + 1;
        license.lastValidatedAt = Date.now();
        saveKeys();
        renderKeys();

        const expires = formatDate(license.expiresAt);
        setResult(
          `Key valida para ${license.app}. Expira em ${expires}. Ativacoes: ${license.activations}.`,
          "success"
        );
      });
    }
  }

  function wireActions() {
    if (el.copyLatestKey) {
      el.copyLatestKey.addEventListener("click", async () => {
        const value = (el.latestKeyValue.textContent || "").trim();
        if (!value || value === "Nenhuma key gerada ainda.") {
          setResult("Nenhuma key para copiar no momento.", "warning");
          return;
        }

        const copied = await copyToClipboard(value);
        setResult(copied ? "Ultima key copiada." : "Nao foi possivel copiar a key.", copied ? "success" : "error");
      });
    }

    if (el.keysTableBody) {
      el.keysTableBody.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const action = target.dataset.action;
        const id = target.dataset.id;
        if (!action || !id) return;

        const item = state.keys.find((entry) => entry.id === id);
        if (!item) return;

        if (action === "copy") {
          const copied = await copyToClipboard(item.key);
          setResult(copied ? "Key copiada com sucesso." : "Falha ao copiar key.", copied ? "success" : "error");
          return;
        }

        if (action === "revoke") {
          item.active = false;
          saveKeys();
          renderKeys();
          setResult("Key revogada no painel local.", "warning");
          return;
        }

        if (action === "delete") {
          state.keys = state.keys.filter((entry) => entry.id !== id);
          saveKeys();
          renderKeys();
          setResult("Key removida da lista.", "warning");
        }
      });
    }

    if (el.exportKeys) {
      el.exportKeys.addEventListener("click", () => {
        if (!state.keys.length) {
          setResult("Nao ha keys para exportar.", "warning");
          return;
        }

        const blob = new Blob([JSON.stringify(state.keys, null, 2)], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `keyauth-keys-${stamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setResult("Exportacao concluida.", "success");
      });
    }

    if (el.clearKeys) {
      el.clearKeys.addEventListener("click", () => {
        const ok = window.confirm("Tem certeza que deseja limpar todas as keys?");
        if (!ok) return;

        state.keys = [];
        saveKeys();
        renderKeys();
        el.latestKeyValue.textContent = "Nenhuma key gerada ainda.";
        setResult("Todas as keys foram removidas.", "warning");
      });
    }
  }

  function loadKeys() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      state.keys = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.keys)) state.keys = [];

      if (state.keys[0] && el.latestKeyValue) {
        el.latestKeyValue.textContent = state.keys[0].key;
      }
    } catch (error) {
      state.keys = [];
    }
  }

  function saveKeys() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.keys));
  }

  function renderKeys() {
    if (!el.keysTableBody) return;

    if (!state.keys.length) {
      el.keysTableBody.innerHTML = "<tr><td colspan=\"6\">Nenhuma key cadastrada.</td></tr>";
      updateLicenseMetric(0);
      return;
    }

    const rows = state.keys
      .map((item) => {
        const expired = Date.now() > Number(item.expiresAt || 0);
        const status = !item.active ? "revogada" : expired ? "expirada" : "ativa";
        const badgeClass = !item.active
          ? "badge badge-revoked"
          : expired
          ? "badge badge-expired"
          : "badge badge-ok";

        return `
          <tr>
            <td class="key-cell">${escapeHtml(item.key)}</td>
            <td>${escapeHtml(item.app || "-")}</td>
            <td>${escapeHtml(item.buyer || "-")}</td>
            <td>${escapeHtml(formatDate(item.expiresAt))}</td>
            <td><span class="${badgeClass}">${status}</span></td>
            <td>
              <button class="table-btn" data-action="copy" data-id="${escapeHtml(item.id)}">Copiar</button>
              <button class="table-btn" data-action="revoke" data-id="${escapeHtml(item.id)}">Revogar</button>
              <button class="table-btn" data-action="delete" data-id="${escapeHtml(item.id)}">Excluir</button>
            </td>
          </tr>
        `;
      })
      .join("");

    el.keysTableBody.innerHTML = rows;
    updateLicenseMetric(state.keys.length);
  }

  function updateLicenseMetric(value) {
    if (!el.licenses) return;

    const previous = Number(el.licenses.textContent || 0);
    animateCounter(el.licenses, previous, Number(value || 0));
  }

  async function loadStats() {
    try {
      const response = await fetch("./stats.php", { cache: "no-store" });
      if (!response.ok) throw new Error("stats request failed");

      const json = await response.json();
      const accounts = toSafeNumber(json.accounts);
      const apps = toSafeNumber(json.applications);
      const licenses = toSafeNumber(json.licenses);
      const activeUsers = toSafeNumber(json.activeUsers);

      animateCounter(el.accs, Number(el.accs?.textContent || 0), accounts);
      animateCounter(el.apps, Number(el.apps?.textContent || 0), apps);
      animateCounter(el.licenses, Number(el.licenses?.textContent || 0), licenses);
      animateCounter(el.activeUsers, Number(el.activeUsers?.textContent || 0), activeUsers);
    } catch (error) {
      animateCounter(el.accs, Number(el.accs?.textContent || 0), 0);
      animateCounter(el.apps, Number(el.apps?.textContent || 0), 0);
      animateCounter(el.activeUsers, Number(el.activeUsers?.textContent || 0), 0);
      updateLicenseMetric(state.keys.length);
    }
  }

  function setResult(message, tone) {
    if (!el.validationResult) return;

    el.validationResult.textContent = message;
    el.validationResult.classList.remove(
      "result-neutral",
      "result-success",
      "result-warning",
      "result-error"
    );

    if (tone === "success") {
      el.validationResult.classList.add("result-success");
      return;
    }

    if (tone === "warning") {
      el.validationResult.classList.add("result-warning");
      return;
    }

    if (tone === "error") {
      el.validationResult.classList.add("result-error");
      return;
    }

    el.validationResult.classList.add("result-neutral");
  }

  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    return `id_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  function buildKey(appName) {
    const appCode = sanitize(appName)
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4)
      .padEnd(4, "X");

    return `KAUTH-${appCode}-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
  }

  function randomSegment(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let output = "";

    if (window.crypto?.getRandomValues) {
      const buffer = new Uint32Array(length);
      window.crypto.getRandomValues(buffer);
      for (let index = 0; index < length; index += 1) {
        output += chars[buffer[index] % chars.length];
      }
      return output;
    }

    for (let index = 0; index < length; index += 1) {
      output += chars[Math.floor(Math.random() * chars.length)];
    }

    return output;
  }

  async function copyToClipboard(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      const success = document.execCommand("copy");
      document.body.removeChild(area);
      return success;
    } catch (error) {
      return false;
    }
  }

  function animateCounter(target, from, to) {
    if (!target) return;

    const start = Number.isFinite(from) ? from : 0;
    const end = Number.isFinite(to) ? to : 0;
    const duration = 700;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      target.textContent = String(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(Number(value));
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("pt-BR");
  }

  function sanitize(value) {
    return String(value || "").trim();
  }

  function sanitizeKey(value) {
    return sanitize(value).toUpperCase();
  }

  function toSafeNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  init();
})();
