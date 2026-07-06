(function () {
  const RUM_SCRIPT_SRC = "https://www.datadoghq-browser-agent.com/us1/v6/datadog-rum.js";
  const LOADER_GUARD_KEY = '__UNIFIED_DATADOG_LOADER_BOOTSTRAPPED__';

  function log(...args) { try { console.log("[UnifiedDatadog]", ...args); } catch {} }

  function getCdnOrigin() {
    try {
      const cs = document.currentScript;
      const src = cs && cs.src;
      if (!src) throw new Error("no currentScript src");
      const u = new URL(src, window.location.href);
      return u.origin;
    } catch (e) {
      log("CDN origin resolution failed; skipping loader:", e && e.message);
      return null;
    }
  }

  function resolveAppId() {
    const meta = document.querySelector('meta[name="app-id"]');
    const appId = meta && meta.getAttribute('content');
    if (!appId) {
      log("No app-id meta found; skipping loader");
      return null;
    }
    return appId;
  }

  function resolveConfigUrl(appId) {
    const origin = getCdnOrigin();
    if (!origin) return null;
    return `${origin}/assets/telemetry/config/${encodeURIComponent(appId)}.json`;
  }

  async function fetchConfig(appId) {
    const url = resolveConfigUrl(appId);
    if (!url) return null;
    log("Fetching config:", url);
    const ctrl = new AbortController();
    let timeout;
    try {
      timeout = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
      if (!res.ok) throw new Error(`config http ${res.status}`);
      const json = await res.json();
      log("Config fetch success for", appId);
      return json;
    } catch (e) {
      log("Config fetch failed; skipping loader for", appId, e && e.message);
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  function deepMerge(target, ...sources) {
    for (const src of sources) {
      if (!src) continue;
      for (const k of Object.keys(src)) {
        const v = src[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          target[k] = deepMerge(target[k] || {}, v);
        } else {
          target[k] = v;
        }
      }
    }
    return target;
  }

  const SELECTORS_TO_MASK = [];

  function maskElements() {
    SELECTORS_TO_MASK.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.hasAttribute('data-dd-privacy')) {
          el.setAttribute('data-dd-privacy', 'mask');
        }
      });
    });
  }

  function applyConfigMasking(masking) {
    if (!masking || !Array.isArray(masking.elementIds)) return;
    masking.elementIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.hasAttribute('data-dd-privacy')) {
        el.setAttribute('data-dd-privacy', 'mask');
        log("Applied masking to elementId:", id);
      }
    });
  }

  function setupMutationObserver(masking) {
    const observer = new MutationObserver(() => { maskElements(); applyConfigMasking(masking); });
    const startObserving = () => {
      if (!document.body) return false;
      observer.observe(document.body, { childList: true, subtree: true });
      return true;
    };
    if (!startObserving()) {
      document.addEventListener('DOMContentLoaded', () => { startObserving(); }, { once: true });
    }
  }

  function applyReplayControls(urlPatterns) {
    if (!window.DD_RUM || !urlPatterns) return;
    const href = window.location.href;
    const isMatch = (pattern) => {
      try {
        return new RegExp(pattern).test(href);
      } catch (e) {
        log("Invalid session replay URL pattern skipped:", pattern, e && e.message);
        return false;
      }
    };
    const match = (patterns) => patterns && patterns.some(isMatch);
    if (match(urlPatterns.start)) {
      if (window.DD_RUM.startSessionReplayRecording) {
        window.DD_RUM.startSessionReplayRecording();
        log("Session Replay: start triggered by URL", href);
      }
    }
    if (match(urlPatterns.stop)) {
      if (window.DD_RUM.stopSessionReplayRecording) {
        window.DD_RUM.stopSessionReplayRecording();
        log("Session Replay: stop triggered by URL", href);
      }
    }
  }

  function readConsent() {
    try {
      const groups = (window.OnetrustActiveGroups || '').split(',');
      const perf = groups.includes('C0002');
      log("Consent state:", { necessary: true, performance: perf, groups });
      return { necessary: true, performance: perf };
    } catch (e) {
      log("Consent read failed:", e && e.message);
      return { necessary: true, performance: false };
    }
  }

  function redact(val) {
    if (!val || typeof val !== 'string') return val;
    if (val.length <= 8) return "(redacted)";
    return val.slice(0, 4) + "…" + val.slice(-4);
  }

  function isBotTraffic() {
    try {
      const ua = (navigator.userAgent || '');
      const botPattern = /(bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|duckduckbot|baiduspider|yandex|headlesschrome|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|datadogsynthetics|newrelicpinger|statuscake|ltip\w*)/i;
      return !!navigator.webdriver || botPattern.test(ua);
    } catch (e) {
      log("Bot detection failed; continuing loader:", e && e.message);
      return false;
    }
  }

  async function bootstrap() {
    if (window[LOADER_GUARD_KEY]) {
      log("Loader already bootstrapped; skipping duplicate run");
      return;
    }
    window[LOADER_GUARD_KEY] = true;

    if (isBotTraffic()) {
      log("Bot/automation traffic detected; skipping loader");
      return;
    }

    const appId = resolveAppId();
    if (!appId) return;
    const remote = await fetchConfig(appId);
    if (!remote) return;

    const defaults = deepMerge({}, remote && remote.defaults);
    const effective = deepMerge({}, defaults, remote);

    const script = document.createElement('script');
    script.src = RUM_SCRIPT_SRC;
    script.defer = true;
    script.onload = function () {
      if (!window.DD_RUM) { log("DD_RUM not available after script load"); return; }
      log("Datadog RUM script loaded");

      const replayEnabled = !!(effective.sessionReplay && effective.sessionReplay.enabled);
      if (replayEnabled) {
        maskElements();
        setupMutationObserver(effective.masking);
        applyConfigMasking(effective.masking);
      } else {
        log("Session Replay disabled by config; masking skipped");
      }

      const dd = effective.datadog || {};
      if (!dd.clientToken || !dd.applicationId) {
        log("Missing required Datadog config (clientToken/applicationId); skipping RUM init");
        return;
      }
      const privacy = effective.defaultPrivacyLevel || 'mask-user-input';
      const env = dd.env || 'local';
      const sessionReplaySampleRate = replayEnabled ? dd.sessionReplaySampleRate : 0;

      const initLog = {
        site: dd.site || 'datadoghq.com',
        service: dd.service,
        env: env,
        version: dd.version,
        sessionSampleRate: dd.sessionSampleRate,
        sessionReplaySampleRate: sessionReplaySampleRate,
        defaultPrivacyLevel: privacy,
        clientToken: redact(dd.clientToken),
        applicationId: redact(dd.applicationId)
      };
      log("Initializing RUM with:", initLog);

      window.DD_RUM.init({
        clientToken: dd.clientToken,
        applicationId: dd.applicationId,
        site: dd.site || 'datadoghq.com',
        service: dd.service,
        env: env,
        version: dd.version,
        sessionSampleRate: dd.sessionSampleRate,
        sessionReplaySampleRate: sessionReplaySampleRate,
        defaultPrivacyLevel: privacy,
        startSessionReplayRecordingManually: true,
        trackResources: dd.trackResources !== false,
        trackLongTasks: dd.trackLongTasks !== false,
        trackInteractions: dd.trackInteractions !== false
      });

      const consent = readConsent();
      if (replayEnabled && consent.performance) {
        applyReplayControls(effective.sessionReplayControls);
      } else if (replayEnabled) {
        log("Session Replay gated: disabled by consent (Performance)");
      }
    };
    document.head.appendChild(script);
  }

  bootstrap();
})();
