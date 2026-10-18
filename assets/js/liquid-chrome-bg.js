/* Liquid Chrome — ambient site background.
 *
 * Runs the same fragment shader as the art piece (art/liquid-chrome.html) but
 * without the control panel, microphone input or image uploads, and without
 * three.js: it is one fullscreen quad, so the ~600KB library buys nothing here.
 * The shader source is unmodified, so the art piece stays the source of truth.
 *
 * It drives itself — slow drift, occasional swells, light pointer parallax.
 *
 * Degrades quietly. No WebGL or reduced-motion means nothing is drawn and the
 * CSS gradient on the host element shows through instead.
 */
(function () {
  'use strict';

  var host = document.querySelector('[data-liquid-chrome]');
  if (!host) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !window.LIQUID_CHROME_SHADER) {
    host.setAttribute('data-lc-state', 'static');
    return;
  }

  /* Presets let one page ask for a calmer version of the same look.
   *
   * `blend` maps to uEffBlend, which the art piece ships at 0 because its GUI
   * expects you to raise it — at 0 the surface is fully transparent and the
   * canvas renders black. It has to be non-zero here for anything to appear.
   *
   * Motion is deliberately un-splashy. The shader keeps a wave alive for a long
   * time (amplitude decays as exp(-age * 0.048), so ~20s to a third), which means
   * one strong wave every few seconds reads as a distinct *splash* followed by
   * dead air. Instead each preset emits many weak waves on a short cadence, so
   * that at any moment several are overlapping at different ages and the surface
   * simply breathes. `cadence` is seconds between waves, `str` their strength,
   * `wSpd` how fast a ring expands and `splash` the overall amplitude. */
  var PRESETS = {
    hero: {
      reflect: 4.2, fresnel: 8.0, iriAmt: 0.62, hue: 0.62, sat: 1.05,
      prism: 9.0, flare: 0.85, grain: 0.022, blend: 0.92,
      cadence: 1.9, str: 0.15, strVar: 0.09, wSpd: 0.62, splash: 0.95, drift: 0.34
    },
    quiet: {
      reflect: 3.4, fresnel: 9.0, iriAmt: 0.46, hue: 0.55, sat: 0.95,
      prism: 7.0, flare: 0.55, grain: 0.028, blend: 0.58,
      cadence: 2.6, str: 0.11, strVar: 0.06, wSpd: 0.50, splash: 0.75, drift: 0.28
    }
  };
  var preset = PRESETS[host.getAttribute('data-liquid-chrome')] || PRESETS.hero;

  var canvas = document.createElement('canvas');
  canvas.className = 'lc-canvas';
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
        || canvas.getContext('experimental-webgl');
  if (!gl) {
    host.setAttribute('data-lc-state', 'static');
    return;
  }

  /* --- Program ---------------------------------------------------------- */
  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Liquid Chrome shader failed:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, 'attribute vec3 position;attribute vec2 uv;' + LIQUID_CHROME_SHADER.VERT);
  var fs = compile(gl.FRAGMENT_SHADER, LIQUID_CHROME_SHADER.FRAG);
  if (!vs || !fs) {
    host.setAttribute('data-lc-state', 'static');
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Liquid Chrome link failed:', gl.getProgramInfoLog(prog));
    host.setAttribute('data-lc-state', 'static');
    return;
  }
  gl.useProgram(prog);

  /* Fullscreen quad. The vertex shader ignores z, so position is packed as
     vec3 purely to match the art piece's shader source. */
  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    // x, y, z, u, v
    -1, -1, 0, 0, 0,
     1, -1, 0, 1, 0,
    -1,  1, 0, 0, 1,
     1,  1, 0, 1, 1
  ]), gl.STATIC_DRAW);

  var stride = 5 * 4;
  var aPos = gl.getAttribLocation(prog, 'position');
  var aUv = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 3 * 4);

  /* --- Uniforms ---------------------------------------------------------- */
  var loc = {};
  function u(name) {
    if (!(name in loc)) loc[name] = gl.getUniformLocation(prog, name);
    return loc[name];
  }
  function f1(n, v) { gl.uniform1f(u(n), v); }
  function f2(n, x, y) { gl.uniform2f(u(n), x, y); }
  function fv(n, arr) { gl.uniform1fv(u(n), arr); }
  function v2v(n, arr) { gl.uniform2fv(u(n), arr); }

  /* A 1x1 black texture stands in for the two background image slots, which
     this build never uses (uHasBgA/uHasBgB stay 0). */
  var blank = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blank);
  gl.uniform1i(u('uBgA'), 0);
  gl.uniform1i(u('uBgB'), 1);

  /* Everything that never changes after setup — the art piece's defaults, with
     the preset's overrides applied. */
  var STATIC_UNIFORMS = {
    uAmbient: 0,
    uReflect: preset.reflect,
    uFresnel: preset.fresnel,
    uIriMode: 1,
    uIriAmt: preset.iriAmt,
    uIriBands: 2.0,
    uHueShift: preset.hue,
    uIriSat: preset.sat,
    uPrism: preset.prism,
    uFlare: preset.flare,
    uOpacity: 1.0,
    uEffBlend: preset.blend,
    uRefr: 2.02,
    uPitch: 0.2,
    uHasBgA: 0, uBlendA: 1.0, uMirrorA: 1, uSatA: 1.8, uSharpA: 2.24,
    uHasBgB: 0, uBlendB: 0.5, uMirrorB: 0, uSatB: 1,
    uMicVol: 0, uMicBass: 0,
    uGrainStr: preset.grain,
    uGrainSize: 0.5,
    uWSpd: preset.wSpd,
    uWSize: 0.52,      /* wider rings; a broad swell reads calmer than a tight one */
    uWSoft: 1.15,      /* softer crest edges, so nothing snaps */
    uSplash: preset.splash
  };
  Object.keys(STATIC_UNIFORMS).forEach(function (k) { f1(k, STATIC_UNIFORMS[k]); });

  /* --- Wave field -------------------------------------------------------- */
  var NW = 8;
  var wPos = new Float32Array(NW * 2);
  var wBirth = new Float32Array(NW);
  var wStr = new Float32Array(NW);
  var wVel = new Float32Array(NW * 2);
  var wSeed = new Float32Array(NW);
  for (var i = 0; i < NW; i++) wBirth[i] = -999;

  var wHead = 0;
  function addWave(sx, sy, str, vx, vy, now) {
    var slot = wHead++ % NW;
    var scl = 1.4 + STATIC_UNIFORMS.uPitch * 1.8;
    wPos[slot * 2] = (sx - 0.5) * scl;
    wPos[slot * 2 + 1] = (sy - 0.5) * scl;
    wBirth[slot] = now;
    wStr[slot] = Math.min(str, 1);
    wVel[slot * 2] = vx;
    wVel[slot * 2 + 1] = vy;
    wSeed[slot] = Math.random() * 13.7;
  }

  /* --- Sizing ------------------------------------------------------------ */
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1);   // shading is fill-rate bound
    var w = Math.max(1, Math.round((host.clientWidth || window.innerWidth) * dpr));
    var h = Math.max(1, Math.round((host.clientHeight || window.innerHeight) * dpr));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    f2('uRes', w, h);
  }

  host.insertBefore(canvas, host.firstChild);
  host.setAttribute('data-lc-state', 'live');
  resize();
  window.addEventListener('resize', resize);

  /* --- Interaction -------------------------------------------------------- */
  var targetX = 0.5, targetY = 0.5, mouseX = 0.5, mouseY = 0.5;
  window.addEventListener('pointermove', function (e) {
    targetX = e.clientX / window.innerWidth;
    targetY = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  /* Don't burn battery on a background nobody is looking at. */
  var visible = true;
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting && !document.hidden;
    }, { threshold: 0 }).observe(host);
  }

  /* --- Loop --------------------------------------------------------------- */
  var start = performance.now();
  var last = start;
  var nextSwell = preset.cadence * 0.5;
  var momentum = 0;

  /* Where the next wave is born. A slow Lissajous wander keeps successive waves
   * spread across the frame instead of stacking in one spot, which is what would
   * turn an overlap back into a single pulsing blob. */
  function waveOrigin(t) {
    return [
      0.5 + Math.cos(t * 0.11) * preset.drift,
      0.5 + Math.sin(t * 0.083) * preset.drift * 0.88
    ];
  }

  /* Start with the field already populated at staggered ages. Without this the
   * first fifteen seconds are visibly emptier than the steady state, so the page
   * loads flat and then fills — the one moment every visitor sees. */
  (function seedField() {
    for (var k = NW - 1; k >= 0; k--) {
      var age = (k + 1) * preset.cadence;
      var o = waveOrigin(-age);
      addWave(o[0], o[1], preset.str + Math.random() * preset.strVar,
              Math.cos(-age * 0.7) * 0.12, Math.sin(-age * 0.5) * 0.12, -age);
    }
  })();

  function frame(now) {
    requestAnimationFrame(frame);

    var t = (now - start) / 1000;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible) return;

    resize();

    mouseX += (targetX - mouseX) * dt * 0.9;
    mouseY += (targetY - mouseY) * dt * 0.9;

    /* A steady procession of weak waves, rather than an occasional strong one.
     * The cadence is short relative to how long a wave stays alive, so several
     * are always overlapping at different ages and there is no moment where the
     * surface goes still and then gets hit. */
    if (t > nextSwell) {
      var o = waveOrigin(t);
      addWave(
        o[0], o[1],
        preset.str + Math.random() * preset.strVar,
        Math.cos(t * 0.7) * 0.12,
        Math.sin(t * 0.5) * 0.12,
        t
      );
      momentum = Math.min(momentum + 0.09, 0.4);
      /* Jittered just enough to avoid a metronome, not enough to clump. */
      nextSwell = t + preset.cadence * (0.85 + Math.random() * 0.3);
    }
    momentum *= Math.exp(-dt / 4.5);

    f1('uTime', t);
    f2('uMouse', mouseX, mouseY);
    f1('uAzimuth', Math.sin(t * 0.021) * 0.28);
    f2('uMomP', mouseX, mouseY);
    f1('uMomS', momentum);
    v2v('uWP', wPos);
    fv('uWB', wBirth);
    fv('uWS', wStr);
    v2v('uWV', wVel);
    fv('uWK', wSeed);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  requestAnimationFrame(frame);
})();
