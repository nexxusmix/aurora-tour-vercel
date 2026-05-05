/* Aurora Oasis Tour Virtual v3 — app.js */
/* Neo Swiss | Marzipano 5-level 8192px | Parallax + DoF + Zoom | Bottom Bar */

(function () {
  'use strict';

  // ─── Scene Data ───────────────────────────────────────────────────────────
  var SCENES = [
    { id: 'pano_01', label: 'Vista de Apresentação', number: '01', description: 'Panorâmica geral · 10:01' },
    { id: 'pano_02', label: 'Drone Norte',           number: '02', description: 'Vista norte · 10:27' },
    { id: 'pano_03', label: 'Drone Lago',            number: '03', description: 'Sobre o lago · 10:33' },
    { id: 'pano_04', label: 'Drone Pôr do Sol',      number: '04', description: 'Última hora · 10:37' }
  ];

  // ─── Region Data ──────────────────────────────────────────────────────────
  var REGIONS = [
    {
      id: 'aurora_oasis',
      label: 'AURORA OASIS',
      color: '#C9A84C',
      fillColor: 'rgba(201,168,76,0.18)',
      strokeColor: 'rgba(201,168,76,0.7)',
      polygon: [
        { yaw: -0.50, pitch:  0.10 },
        { yaw: -0.10, pitch:  0.10 },
        { yaw: -0.10, pitch:  0.30 },
        { yaw: -0.50, pitch:  0.30 }
      ],
      appearsIn: ['pano_01', 'pano_02']
    },
    {
      id: 'aurora_lago',
      label: 'AURORA DO LAGO',
      color: '#5B8A7A',
      fillColor: 'rgba(91,138,122,0.18)',
      strokeColor: 'rgba(91,138,122,0.7)',
      polygon: [
        { yaw:  0.20, pitch:  0.15 },
        { yaw:  0.70, pitch:  0.15 },
        { yaw:  0.70, pitch:  0.40 },
        { yaw:  0.20, pitch:  0.40 }
      ],
      appearsIn: ['pano_01', 'pano_03']
    }
  ];

  // ─── State ────────────────────────────────────────────────────────────────
  var currentSceneIdx = 0;
  var viewer = null;
  var marzipanoScenes = [];
  var autorotating = false;
  var autorotateCtrl = null;
  var regionVisibility = { regions: true, aurora_oasis: true, aurora_lago: true };
  var menuOpen = false;

  // Parallax state
  var parallaxEnabled = true;
  var basePose = { yaw: 0, pitch: 0 };
  var parallaxOffset = { yaw: 0, pitch: 0 };
  var parallaxTarget = { yaw: 0, pitch: 0 };
  var isDragging = false;
  var PARALLAX_RANGE = 0.04;

  // DoF state
  var dofEnabled = true;
  var zoomInteracting = false;
  var zoomIntTimer = null;

  // Zoom
  var FOV_MIN = 20 * Math.PI / 180;
  var FOV_MAX = 120 * Math.PI / 180;
  var FOV_STEP = 5 * Math.PI / 180;
  var currentFov = 90 * Math.PI / 180;

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  var viewerEl      = document.getElementById('viewer');
  var loadScreen    = document.getElementById('loading-screen');
  var loadBar       = document.getElementById('loading-bar');
  var loadPct       = document.getElementById('loading-pct');
  var hdrNumber     = document.getElementById('hdr-number');
  var hdrLabel      = document.getElementById('hdr-label');
  var bbScenesEl    = document.getElementById('bb-scenes');
  var infoModal     = document.getElementById('info-modal');
  var modalCloseBtn = document.getElementById('modal-close-btn');
  var regionOverlay = document.getElementById('region-overlay');
  var shareToast    = document.getElementById('share-toast');
  var dofOverlay    = document.getElementById('dof-overlay');
  var menuModal     = document.getElementById('menu-modal');
  var mmCloseBtn    = document.getElementById('mm-close-btn');
  var zoomSlider    = document.getElementById('zoom-slider');
  var btnZoomIn     = document.getElementById('btn-zoom-in');
  var btnZoomOut    = document.getElementById('btn-zoom-out');
  var btnAutorotate = document.getElementById('btn-autorotate');
  var btnInfo       = document.getElementById('btn-info');
  var btnShare      = document.getElementById('btn-share');
  var btnFullscreen = document.getElementById('btn-fullscreen');
  var btnMenu       = document.getElementById('btn-menu');

  // ─── Marzipano Init ───────────────────────────────────────────────────────
  function initViewer() {
    var viewerOpts = {
      controls: {
        mouseViewMode: 'drag',
        scrollZoom: true,
        pinchZoom: true
      }
    };
    viewer = new Marzipano.Viewer(viewerEl, viewerOpts);

    // Configure scroll zoom speed
    try {
      var wheelMethod = viewer.controls().method('wheelZoom');
      if (wheelMethod && wheelMethod.instance) {
        wheelMethod.instance.opts = { frictionTime: 0, scale: 1.5 };
      }
    } catch (e) {}

    // Autorotate controller
    autorotateCtrl = Marzipano.autorotate({
      yawSpeed: 0.04,
      targetPitch: 0,
      interruptOnAction: true
    });

    buildScenes();
    switchScene(0, true);
    hideLoading();
  }

  function buildScenes() {
    var limiter = Marzipano.RectilinearView.limit.traditional(
      8192,
      FOV_MIN,
      FOV_MAX
    );

    SCENES.forEach(function (sceneData) {
      // URL template: /media/panorama_pano_01_0/{f}/{z}/{y}_{x}.webp
      // z=0 lowest res (512px), z=4 highest (8192px)
      var source = Marzipano.ImageUrlSource.fromString(
        '/media/panorama_' + sceneData.id + '_0/{f}/{z}/{y}_{x}.webp',
        {
          cubeMapPreviewUrl: '/media/thumb_' + sceneData.id + '.webp'
        }
      );

      // 5 levels: z=0 (512) → z=4 (8192)
      var geometry = new Marzipano.CubeGeometry([
        { tileSize: 512, size: 512,  fallbackOnly: true  },  // z=0
        { tileSize: 512, size: 1024, fallbackOnly: false },  // z=1
        { tileSize: 512, size: 2048, fallbackOnly: false },  // z=2
        { tileSize: 512, size: 4096, fallbackOnly: false },  // z=3
        { tileSize: 512, size: 8192, fallbackOnly: false }   // z=4
      ]);

      var view = new Marzipano.RectilinearView(
        { yaw: 0, pitch: 0, fov: currentFov },
        limiter
      );
      var scene = viewer.createScene({ source: source, geometry: geometry, view: view });

      marzipanoScenes.push({ data: sceneData, scene: scene, view: view });
    });
  }

  // ─── Scene Switching ──────────────────────────────────────────────────────
  function switchScene(idx, immediate) {
    if (idx < 0) idx = SCENES.length - 1;
    if (idx >= SCENES.length) idx = 0;

    currentSceneIdx = idx;
    var s = marzipanoScenes[idx];

    // Preserve current fov when switching
    try { currentFov = s.view.fov(); } catch(e){}

    if (immediate) {
      s.scene.switchTo({ transitionDuration: 0 });
    } else {
      s.scene.switchTo({ transitionDuration: 800 });
    }

    // Reset base pose on scene switch
    basePose.yaw = 0;
    basePose.pitch = 0;
    parallaxTarget.yaw = 0;
    parallaxTarget.pitch = 0;

    hdrNumber.textContent = s.data.number;
    hdrLabel.textContent = s.data.label;

    // Update bottom bar active state
    var btns = bbScenesEl.querySelectorAll('.bb-scene');
    btns.forEach(function (btn, i) {
      btn.classList.toggle('active', i === idx);
    });

    setTimeout(updateRegionOverlay, 50);
  }

  // ─── Build Bottom Bar Scene Buttons ───────────────────────────────────────
  function buildBottomBarScenes() {
    SCENES.forEach(function (s, idx) {
      var btn = document.createElement('button');
      btn.className = 'bb-scene' + (idx === 0 ? ' active' : '');
      btn.setAttribute('data-idx', idx);
      btn.setAttribute('aria-label', s.label);

      var img = document.createElement('img');
      img.className = 'bb-thumb';
      img.src = '/media/thumb_' + s.id + '.webp';
      img.alt = s.label;
      img.loading = 'lazy';

      var meta = document.createElement('div');
      meta.className = 'bb-scene-meta';

      var numSpan = document.createElement('span');
      numSpan.className = 'bb-num';
      numSpan.textContent = s.number;

      var labelSpan = document.createElement('span');
      labelSpan.className = 'bb-label';
      labelSpan.textContent = s.label;

      meta.appendChild(numSpan);
      meta.appendChild(labelSpan);
      btn.appendChild(img);
      btn.appendChild(meta);

      btn.addEventListener('click', function () {
        var i = parseInt(btn.getAttribute('data-idx'), 10);
        switchScene(i, false);
      });

      bbScenesEl.appendChild(btn);
    });
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  function hideLoading() {
    setLoadProgress(100);
    setTimeout(function () {
      loadScreen.classList.add('fade-out');
      setTimeout(function () { loadScreen.style.display = 'none'; }, 700);
    }, 400);
  }

  function setLoadProgress(pct) {
    loadBar.style.width = pct + '%';
    loadPct.textContent = pct + '%';
  }

  var _loadTimer = 0;
  var _loadPct = 0;
  function tickLoad() {
    _loadPct += Math.random() * 18 + 5;
    if (_loadPct >= 90) { _loadPct = 90; return; }
    setLoadProgress(Math.round(_loadPct));
    _loadTimer = setTimeout(tickLoad, 200 + Math.random() * 250);
  }
  tickLoad();

  // ─── Parallax 3D ──────────────────────────────────────────────────────────
  function initParallax() {
    // Mouse movement → subtle yaw/pitch offset
    viewerEl.addEventListener('mousemove', function (e) {
      if (!parallaxEnabled || isDragging) return;
      var rect = viewerEl.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      parallaxTarget.yaw   = nx * PARALLAX_RANGE * 2;
      parallaxTarget.pitch = -ny * PARALLAX_RANGE * 2;
    });

    viewerEl.addEventListener('mousedown', function () { isDragging = true; });
    window.addEventListener('mouseup', function () {
      if (isDragging) {
        // Update basePose from current view when drag ends
        var s = marzipanoScenes[currentSceneIdx];
        if (s) {
          basePose.yaw   = s.view.yaw();
          basePose.pitch = s.view.pitch();
        }
        parallaxTarget.yaw   = 0;
        parallaxTarget.pitch = 0;
        parallaxOffset.yaw   = 0;
        parallaxOffset.pitch = 0;
      }
      isDragging = false;
    });

    // Touch/DeviceOrientation parallax for mobile
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function (e) {
        if (!parallaxEnabled || isDragging) return;
        if (e.beta == null) return;
        var gamma = (e.gamma || 0) / 45;  // tilt left-right → yaw
        var beta  = ((e.beta  || 0) - 45) / 45;  // tilt forward → pitch
        parallaxTarget.yaw   = Math.max(-1, Math.min(1, gamma)) * PARALLAX_RANGE;
        parallaxTarget.pitch = Math.max(-1, Math.min(1, beta))  * PARALLAX_RANGE * 0.5;
      });
    }

    startParallaxLoop();
  }

  function startParallaxLoop() {
    function tick() {
      if (parallaxEnabled && !isDragging && viewer) {
        var s = marzipanoScenes[currentSceneIdx];
        if (s) {
          // Lerp offset toward target
          parallaxOffset.yaw   += (parallaxTarget.yaw   - parallaxOffset.yaw)   * 0.06;
          parallaxOffset.pitch += (parallaxTarget.pitch - parallaxOffset.pitch) * 0.06;

          // Only apply if offset is significant
          if (Math.abs(parallaxOffset.yaw) > 0.0001 || Math.abs(parallaxOffset.pitch) > 0.0001) {
            var targetYaw   = basePose.yaw   + parallaxOffset.yaw;
            var targetPitch = basePose.pitch + parallaxOffset.pitch;
            var cy = s.view.yaw();
            var cp = s.view.pitch();
            var ny = cy + (targetYaw   - cy) * 0.05;
            var np = cp + (targetPitch - cp) * 0.05;
            // Clamp pitch
            np = Math.max(-Math.PI/3, Math.min(Math.PI/3, np));
            s.view.setYaw(ny);
            s.view.setPitch(np);
          }
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ─── Depth of Field Overlay ───────────────────────────────────────────────
  function setDof(enabled) {
    dofEnabled = enabled;
    if (enabled && !zoomInteracting) {
      dofOverlay.classList.remove('disabled');
    } else {
      dofOverlay.classList.add('disabled');
    }
  }

  // ─── Zoom Controls ────────────────────────────────────────────────────────
  function setFov(fovRad) {
    fovRad = Math.max(FOV_MIN, Math.min(FOV_MAX, fovRad));
    currentFov = fovRad;
    var s = marzipanoScenes[currentSceneIdx];
    if (s) s.view.setFov(fovRad);
    // Update slider (fov in degrees)
    var deg = Math.round(fovRad * 180 / Math.PI);
    zoomSlider.value = deg;

    // Temporarily disable DoF during zoom interaction
    dofOverlay.classList.add('disabled');
    if (zoomIntTimer) clearTimeout(zoomIntTimer);
    zoomInteracting = true;
    zoomIntTimer = setTimeout(function () {
      zoomInteracting = false;
      if (dofEnabled) dofOverlay.classList.remove('disabled');
    }, 600);
  }

  btnZoomIn.addEventListener('click', function () {
    setFov(currentFov - FOV_STEP);
  });
  btnZoomOut.addEventListener('click', function () {
    setFov(currentFov + FOV_STEP);
  });

  zoomSlider.addEventListener('input', function () {
    setFov(parseInt(zoomSlider.value, 10) * Math.PI / 180);
  });

  // Sync slider when view changes (via drag/scroll)
  function onViewChange() {
    var s = marzipanoScenes[currentSceneIdx];
    if (!s) return;
    try {
      var fov = s.view.fov();
      currentFov = fov;
      var deg = Math.round(fov * 180 / Math.PI);
      zoomSlider.value = deg;
    } catch(e) {}

    // Update base pose when view changes (non-parallax)
    if (!isDragging) {
      basePose.yaw   = s.view.yaw();
      basePose.pitch = s.view.pitch();
    }
    updateRegionOverlay();
  }

  // ─── Autorotate ───────────────────────────────────────────────────────────
  btnAutorotate.addEventListener('click', function () {
    autorotating = !autorotating;
    btnAutorotate.setAttribute('aria-pressed', autorotating ? 'true' : 'false');
    btnAutorotate.classList.toggle('active', autorotating);
    if (autorotating) {
      viewer.startMovement(autorotateCtrl);
    } else {
      viewer.stopMovement();
    }
  });

  // ─── Fullscreen ───────────────────────────────────────────────────────────
  btnFullscreen.addEventListener('click', function () { toggleFullscreen(); });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  }

  document.addEventListener('fullscreenchange', function () {
    var isFs = !!document.fullscreenElement;
    btnFullscreen.classList.toggle('active', isFs);
  });

  // ─── Share ────────────────────────────────────────────────────────────────
  btnShare.addEventListener('click', function () {
    var url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(showShareToast).catch(function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showShareToast(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function showShareToast() {
    shareToast.classList.add('show');
    setTimeout(function () { shareToast.classList.remove('show'); }, 2200);
  }

  // ─── Info Modal ───────────────────────────────────────────────────────────
  btnInfo.addEventListener('click', function () { infoModal.hidden = false; });
  modalCloseBtn.addEventListener('click', function () { infoModal.hidden = true; });
  infoModal.addEventListener('click', function (e) {
    if (e.target === infoModal) infoModal.hidden = true;
  });

  // ─── Menu Modal ───────────────────────────────────────────────────────────
  btnMenu.addEventListener('click', function () { openMenu(); });
  mmCloseBtn.addEventListener('click', function () { closeMenu(); });
  menuModal.addEventListener('click', function (e) {
    if (e.target === menuModal) closeMenu();
  });

  function openMenu() {
    menuOpen = true;
    menuModal.hidden = false;
    btnMenu.classList.add('active');
  }
  function closeMenu() {
    menuOpen = false;
    menuModal.hidden = true;
    btnMenu.classList.remove('active');
  }

  // ─── Toggle Switches ──────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.switch-btn');
    if (!btn) return;
    var key = btn.getAttribute('data-toggle');
    if (!key) return;

    var nowActive = !btn.classList.contains('active');
    btn.classList.toggle('active', nowActive);
    btn.setAttribute('aria-checked', nowActive ? 'true' : 'false');

    if (key === 'parallax') {
      parallaxEnabled = nowActive;
      if (!nowActive) {
        parallaxTarget.yaw = 0;
        parallaxTarget.pitch = 0;
      }
      return;
    }

    if (key === 'dof') {
      setDof(nowActive);
      return;
    }

    regionVisibility[key] = nowActive;

    if (key === 'regions') {
      document.querySelectorAll('[data-toggle="aurora_oasis"], [data-toggle="aurora_lago"]')
        .forEach(function (sub) {
          sub.classList.toggle('active', nowActive);
          sub.setAttribute('aria-checked', nowActive ? 'true' : 'false');
          regionVisibility[sub.getAttribute('data-toggle')] = nowActive;
        });
    }

    updateRegionOverlay();
  });

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!infoModal.hidden) { infoModal.hidden = true; return; }
      if (menuOpen) { closeMenu(); return; }
    }
    if (e.key === 'ArrowLeft')  { switchScene(currentSceneIdx - 1, false); return; }
    if (e.key === 'ArrowRight') { switchScene(currentSceneIdx + 1, false); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
    if (e.key === ' ') { e.preventDefault(); btnAutorotate.click(); return; }
    if (e.key === '+' || e.key === '=') { setFov(currentFov - FOV_STEP); return; }
    if (e.key === '-' || e.key === '_') { setFov(currentFov + FOV_STEP); return; }
  });

  // ─── Region Overlay ───────────────────────────────────────────────────────
  function updateRegionOverlay() {
    if (!viewer) return;
    var svg = regionOverlay;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var w = window.innerWidth;
    var h = window.innerHeight;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    if (!regionVisibility.regions) return;

    var scene = marzipanoScenes[currentSceneIdx];
    if (!scene) return;
    var view = scene.view;

    REGIONS.forEach(function (region) {
      if (!regionVisibility[region.id]) return;
      if (region.appearsIn.indexOf(SCENES[currentSceneIdx].id) < 0) return;

      var pts = region.polygon.map(function (v) {
        return view.coordinatesToScreen({ yaw: v.yaw, pitch: v.pitch });
      });
      var validPts = pts.filter(function (p) { return p !== null; });
      if (validPts.length < 3) return;

      var ptsStr = validPts.map(function (p) { return p.x + ',' + p.y; }).join(' ');

      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', ptsStr);
      poly.setAttribute('fill', region.fillColor);
      poly.setAttribute('stroke', region.strokeColor);
      poly.setAttribute('stroke-width', '1.5');
      svg.appendChild(poly);

      var cx = 0, cy = 0;
      validPts.forEach(function (p) { cx += p.x; cy += p.y; });
      cx /= validPts.length; cy /= validPts.length;

      var labelPad = 10;
      var labelH = 22;
      var labelW = region.label.length * 6.5 + labelPad * 2;

      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', cx - labelW / 2);
      rect.setAttribute('y', cy - labelH / 2);
      rect.setAttribute('width', labelW);
      rect.setAttribute('height', labelH);
      rect.setAttribute('fill', 'rgba(239,237,226,0.92)');
      rect.setAttribute('stroke', 'rgba(26,26,26,0.2)');
      rect.setAttribute('stroke-width', '1');
      svg.appendChild(rect);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', cx);
      text.setAttribute('y', cy + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', "'Britti Sans', sans-serif");
      text.setAttribute('font-weight', '400');
      text.setAttribute('font-size', '9');
      text.setAttribute('letter-spacing', '0.15em');
      text.setAttribute('fill', '#1A1A1A');
      text.textContent = region.label;
      svg.appendChild(text);
    });
  }

  function attachViewChangeListeners() {
    marzipanoScenes.forEach(function (s) {
      s.view.addEventListener('change', onViewChange);
    });
  }

  window.addEventListener('resize', function () {
    if (viewer) viewer.updateSize();
    updateRegionOverlay();
  });

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  buildBottomBarScenes();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      initViewer();
      attachViewChangeListeners();
      initParallax();
    });
  } else {
    window.addEventListener('load', function () {
      initViewer();
      attachViewChangeListeners();
      initParallax();
    });
  }

})();
