/* Aurora Oasis Tour Virtual v4 — app.js */
/* Feature Bottom Bar | MapLibre Localização | Scene Picker | Zero Italic */

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
  var scenePkrOpen = false;
  var featModalOpen = false;

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
  var FOV_MIN = 30 * Math.PI / 180;
  var FOV_MAX = 130 * Math.PI / 180;
  var FOV_STEP = 5 * Math.PI / 180;
  var currentFov = 110 * Math.PI / 180;

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  var viewerEl       = document.getElementById('viewer');
  var loadScreen     = document.getElementById('loading-screen');
  var loadBar        = document.getElementById('loading-bar');
  var loadPct        = document.getElementById('loading-pct');
  var hdrNumber      = document.getElementById('hdr-number');
  var hdrLabel       = document.getElementById('hdr-label');
  var infoModal      = document.getElementById('info-modal');
  var modalCloseBtn  = document.getElementById('modal-close-btn');
  var regionOverlay  = document.getElementById('region-overlay');
  var shareToast     = document.getElementById('share-toast');
  var dofOverlay     = document.getElementById('dof-overlay');
  var menuModal      = document.getElementById('menu-modal');
  var mmCloseBtn     = document.getElementById('mm-close-btn');
  var zoomSlider     = document.getElementById('zoom-slider');
  var btnZoomIn      = document.getElementById('btn-zoom-in');
  var btnZoomOut     = document.getElementById('btn-zoom-out');
  var btnAutorotate  = document.getElementById('btn-autorotate');
  var btnFullscreen  = document.getElementById('btn-fullscreen');
  var btnAdmin       = document.getElementById('btn-admin');
  var btnCenas       = document.getElementById('btn-cenas');
  var scenePicker    = document.getElementById('scene-picker');
  var featModal      = document.getElementById('feat-modal');
  var featModalBack  = document.getElementById('feat-modal-backdrop');
  var featModalClose = document.getElementById('feat-modal-close');
  var featModalTitle = document.getElementById('feat-modal-title');
  var featModalBody  = document.getElementById('feat-modal-body');

  // ─── Feature Definitions ─────────────────────────────────────────────────
  function locationContent() {
    return [
      '<div class="modal-section">',
        '<div class="modal-mini">Endereço</div>',
        '<div class="modal-line">Lago Corumbá IV</div>',
        '<div class="modal-line">Abadiânia · Goiás · 72940-000</div>',
      '</div>',
      '<div class="modal-section">',
        '<div class="modal-mini">Coordenadas</div>',
        '<div class="modal-line modal-mono">-16.274689 · -48.464529</div>',
      '</div>',
      '<div class="modal-section">',
        '<div id="map"></div>',
      '</div>',
      '<div class="modal-section modal-actions">',
        '<a href="https://www.google.com/maps/?q=-16.274689,-48.464529" target="_blank" rel="noopener" class="modal-link">Abrir no Google Maps</a>',
        '<a href="https://www.google.com/maps/dir/?api=1&destination=-16.274689,-48.464529" target="_blank" rel="noopener" class="modal-link">Como chegar</a>',
      '</div>'
    ].join('');
  }

  var FEATURES = {
    home: {
      handler: function() { resetView(); }
    },
    conceito: {
      title: 'Conceito',
      content: [
        '<div class="modal-section">',
          '<div class="modal-mini">O Projeto</div>',
          '<div class="modal-line">Aurora Oasis é um loteamento de alto padrão às margens do Lago Corumbá IV, em Abadiânia, Goiás.</div>',
        '</div>',
        '<div class="modal-section">',
          '<div class="modal-mini">Visão</div>',
          '<div class="modal-line">241 lotes com infraestrutura completa, área de lazer premium e segurança 24h. A 90 km de Brasília.</div>',
        '</div>',
        '<div class="modal-section">',
          '<div class="modal-mini">Fase Atual</div>',
          '<div class="modal-line">1ª Fase · 60 lotes disponíveis.</div>',
        '</div>'
      ].join('')
    },
    localizacao: {
      title: 'Localização',
      content: locationContent(),
      onOpen: function() {
        setTimeout(initLocationMap, 120);
      }
    },
    implantacao: {
      title: 'Implantação',
      content: '<div class="modal-section"><div class="modal-mini">Master Plan</div><div class="modal-line">Master plan do empreendimento. Conteúdo em breve.</div></div>'
    },
    disponibilidades: {
      title: 'Mapa de Disponibilidades',
      content: '<div class="modal-section"><div class="modal-mini">Status dos Lotes</div><div class="modal-line">Status dos lotes em tempo real. Conteúdo em breve.</div></div>'
    },
    imagens: {
      title: 'Galeria de Imagens',
      content: '<div class="modal-section"><div class="modal-mini">Fotografia</div><div class="modal-line">Galeria fotográfica em alta resolução. Conteúdo em breve.</div></div>'
    },
    fotolivro: {
      title: 'Fotolivro · Book Digital',
      content: '<div class="modal-section"><div class="modal-mini">Edição Completa</div><div class="modal-line">Edição completa do projeto. Conteúdo em breve.</div></div>'
    },
    videos: {
      title: 'Vídeos',
      content: '<div class="modal-section"><div class="modal-mini">Audiovisual</div><div class="modal-line">Reels, teasers e versão estendida. Conteúdo em breve.</div></div>'
    },
    cenas: {
      handler: function() { toggleScenePicker(); }
    }
  };

  // ─── Reset View ───────────────────────────────────────────────────────────
  function resetView() {
    closeAllOverlays();
    var s = marzipanoScenes[currentSceneIdx];
    if (s) {
      s.view.setYaw(0);
      s.view.setPitch(0);
      basePose.yaw = 0;
      basePose.pitch = 0;
    }
  }

  // ─── Feature Modal ────────────────────────────────────────────────────────
  function openFeatModal(title, content, onOpen) {
    featModalTitle.textContent = title;
    featModalBody.innerHTML = content;
    featModal.hidden = false;
    featModalOpen = true;
    if (onOpen) onOpen();
  }

  function closeFeatModal() {
    featModal.hidden = true;
    featModalOpen = false;
    document.querySelectorAll('.bb-feat').forEach(function(b) {
      b.classList.remove('is-active');
    });
  }

  featModalClose.addEventListener('click', closeFeatModal);
  featModalBack.addEventListener('click', closeFeatModal);

  // ─── Feature Buttons ──────────────────────────────────────────────────────
  document.querySelectorAll('.bb-feat').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var f = btn.dataset.feature;
      var cfg = FEATURES[f];
      if (!cfg) return;

      // Deactivate all feat buttons first
      document.querySelectorAll('.bb-feat').forEach(function(b) {
        b.classList.remove('is-active');
      });

      // Close scene picker if open
      closeScenePicker();

      if (cfg.handler) {
        cfg.handler();
        return;
      }

      // If same modal already open, close it
      if (featModalOpen && featModalTitle.textContent === cfg.title) {
        closeFeatModal();
        return;
      }

      btn.classList.add('is-active');
      openFeatModal(cfg.title, cfg.content, cfg.onOpen);
    });
  });

  // Cenas aux button
  btnCenas.addEventListener('click', function() {
    toggleScenePicker();
  });

  // ─── Scene Picker ─────────────────────────────────────────────────────────
  function toggleScenePicker() {
    if (scenePkrOpen) {
      closeScenePicker();
    } else {
      openScenePicker();
    }
  }

  function openScenePicker() {
    scenePicker.hidden = false;
    scenePkrOpen = true;
    btnCenas.classList.add('is-active');
    updateScenePickerActive();
  }

  function closeScenePicker() {
    scenePicker.hidden = true;
    scenePkrOpen = false;
    btnCenas.classList.remove('is-active');
  }

  function updateScenePickerActive() {
    document.querySelectorAll('.sp-btn').forEach(function(btn, i) {
      btn.classList.toggle('active', i === currentSceneIdx);
    });
  }

  document.querySelectorAll('.sp-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.sceneIdx, 10);
      switchScene(idx, false);
      closeScenePicker();
    });
  });

  // Close pickers on backdrop click (outside scene-picker)
  document.addEventListener('click', function(e) {
    if (scenePkrOpen && !scenePicker.contains(e.target) && e.target !== btnCenas && !btnCenas.contains(e.target)) {
      closeScenePicker();
    }
  });

  // ─── Close All Overlays ───────────────────────────────────────────────────
  function closeAllOverlays() {
    closeFeatModal();
    closeScenePicker();
  }

  // ─── MapLibre Localização ─────────────────────────────────────────────────
  function initLocationMap() {
    if (!window.maplibregl) return;
    var el = document.getElementById('map');
    if (!el || el._inited) return;
    el._inited = true;
    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-48.464529, -16.274689],
      zoom: 13,
      attributionControl: false
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Gold marker dot
    var dot = document.createElement('div');
    dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#C9A84C;border:2px solid #1A1A1A;box-shadow:0 0 0 4px rgba(201,168,76,0.2);';
    new maplibregl.Marker({ element: dot }).setLngLat([-48.464529, -16.274689]).addTo(map);
  }

  // ─── Admin placeholder ────────────────────────────────────────────────────
  btnAdmin.addEventListener('click', function() {
    var pw = prompt('Senha admin:');
    if (pw === 'aurora') {
      alert('Modo admin em desenvolvimento. Em breve: demarcações manuais e via IA, edição de conteúdo, upload de panoramas.');
    } else if (pw !== null) {
      alert('Senha inválida.');
    }
  });

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

    try {
      var wheelMethod = viewer.controls().method('wheelZoom');
      if (wheelMethod && wheelMethod.instance) {
        wheelMethod.instance.opts = { frictionTime: 0, scale: 1.5 };
      }
    } catch (e) {}

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
    var limiter = Marzipano.RectilinearView.limit.traditional(4096, FOV_MIN, FOV_MAX);

    SCENES.forEach(function(sceneData) {
      var baseId = sceneData.id;
      var source = new Marzipano.ImageUrlSource(function(tile) {
        var inverted = 3 - tile.z;
        return { url: '/media/panorama_' + baseId + '_0/' + tile.face + '/' + inverted + '/' + tile.y + '_' + tile.x + '.jpg' };
      }, {
        cubeMapPreviewUrl: '/media/thumb_' + sceneData.id + '.webp'
      });

      var geometry = new Marzipano.CubeGeometry([
        { tileSize: 512, size: 512,  fallbackOnly: true  },
        { tileSize: 512, size: 1024, fallbackOnly: false },
        { tileSize: 512, size: 2048, fallbackOnly: false },
        { tileSize: 512, size: 4096, fallbackOnly: false }
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

    try { currentFov = s.view.fov(); } catch(e) {}

    if (immediate) {
      s.scene.switchTo({ transitionDuration: 0 });
    } else {
      s.scene.switchTo({ transitionDuration: 800 });
    }

    basePose.yaw = 0;
    basePose.pitch = 0;
    parallaxTarget.yaw = 0;
    parallaxTarget.pitch = 0;

    hdrNumber.textContent = s.data.number;
    hdrLabel.textContent = s.data.label;

    updateScenePickerActive();
    setTimeout(updateRegionOverlay, 50);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  function hideLoading() {
    setLoadProgress(100);
    setTimeout(function() {
      loadScreen.classList.add('fade-out');
      setTimeout(function() { loadScreen.style.display = 'none'; }, 700);
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
    viewerEl.addEventListener('mousemove', function(e) {
      if (!parallaxEnabled || isDragging) return;
      var rect = viewerEl.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      parallaxTarget.yaw   = nx * PARALLAX_RANGE * 2;
      parallaxTarget.pitch = -ny * PARALLAX_RANGE * 2;
    });

    viewerEl.addEventListener('mousedown', function() { isDragging = true; });
    window.addEventListener('mouseup', function() {
      if (isDragging) {
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

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function(e) {
        if (!parallaxEnabled || isDragging) return;
        if (e.beta == null) return;
        var gamma = (e.gamma || 0) / 45;
        var beta  = ((e.beta  || 0) - 45) / 45;
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
          parallaxOffset.yaw   += (parallaxTarget.yaw   - parallaxOffset.yaw)   * 0.06;
          parallaxOffset.pitch += (parallaxTarget.pitch - parallaxOffset.pitch) * 0.06;

          if (Math.abs(parallaxOffset.yaw) > 0.0001 || Math.abs(parallaxOffset.pitch) > 0.0001) {
            var targetYaw   = basePose.yaw   + parallaxOffset.yaw;
            var targetPitch = basePose.pitch + parallaxOffset.pitch;
            var cy = s.view.yaw();
            var cp = s.view.pitch();
            var ny = cy + (targetYaw   - cy) * 0.05;
            var np = cp + (targetPitch - cp) * 0.05;
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

  // ─── Depth of Field ───────────────────────────────────────────────────────
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
    var deg = Math.round(fovRad * 180 / Math.PI);
    zoomSlider.value = deg;

    dofOverlay.classList.add('disabled');
    if (zoomIntTimer) clearTimeout(zoomIntTimer);
    zoomInteracting = true;
    zoomIntTimer = setTimeout(function() {
      zoomInteracting = false;
      if (dofEnabled) dofOverlay.classList.remove('disabled');
    }, 600);
  }

  btnZoomIn.addEventListener('click', function() { setFov(currentFov - FOV_STEP); });
  btnZoomOut.addEventListener('click', function() { setFov(currentFov + FOV_STEP); });
  zoomSlider.addEventListener('input', function() {
    setFov(parseInt(zoomSlider.value, 10) * Math.PI / 180);
  });

  function onViewChange() {
    var s = marzipanoScenes[currentSceneIdx];
    if (!s) return;
    try {
      var fov = s.view.fov();
      currentFov = fov;
      zoomSlider.value = Math.round(fov * 180 / Math.PI);
    } catch(e) {}

    if (!isDragging) {
      basePose.yaw   = s.view.yaw();
      basePose.pitch = s.view.pitch();
    }
    updateRegionOverlay();
  }

  // ─── Autorotate ───────────────────────────────────────────────────────────
  btnAutorotate.addEventListener('click', function() {
    autorotating = !autorotating;
    btnAutorotate.setAttribute('aria-pressed', autorotating ? 'true' : 'false');
    btnAutorotate.classList.toggle('is-active', autorotating);
    if (autorotating) {
      viewer.startMovement(autorotateCtrl);
    } else {
      viewer.stopMovement();
    }
  });

  // ─── Fullscreen ───────────────────────────────────────────────────────────
  btnFullscreen.addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function() {});
    } else {
      document.exitFullscreen().catch(function() {});
    }
  }

  document.addEventListener('fullscreenchange', function() {
    btnFullscreen.classList.toggle('is-active', !!document.fullscreenElement);
  });

  // ─── Menu Modal ───────────────────────────────────────────────────────────
  // (Menu accessible via Admin button or keyboard; no dedicated button in new bar)
  mmCloseBtn.addEventListener('click', closeMenu);
  menuModal.addEventListener('click', function(e) {
    if (e.target === menuModal) closeMenu();
  });

  function openMenu() {
    menuOpen = true;
    menuModal.hidden = false;
  }
  function closeMenu() {
    menuOpen = false;
    menuModal.hidden = true;
  }

  // ─── Toggle Switches ──────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.switch-btn');
    if (!btn) return;
    var key = btn.getAttribute('data-toggle');
    if (!key) return;

    var nowActive = !btn.classList.contains('active');
    btn.classList.toggle('active', nowActive);
    btn.setAttribute('aria-checked', nowActive ? 'true' : 'false');

    if (key === 'parallax') {
      parallaxEnabled = nowActive;
      if (!nowActive) { parallaxTarget.yaw = 0; parallaxTarget.pitch = 0; }
      return;
    }
    if (key === 'dof') { setDof(nowActive); return; }

    regionVisibility[key] = nowActive;

    if (key === 'regions') {
      document.querySelectorAll('[data-toggle="aurora_oasis"], [data-toggle="aurora_lago"]')
        .forEach(function(sub) {
          sub.classList.toggle('active', nowActive);
          sub.setAttribute('aria-checked', nowActive ? 'true' : 'false');
          regionVisibility[sub.getAttribute('data-toggle')] = nowActive;
        });
    }
    updateRegionOverlay();
  });

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (featModalOpen) { closeFeatModal(); return; }
      if (scenePkrOpen)  { closeScenePicker(); return; }
      if (!infoModal.hidden) { infoModal.hidden = true; return; }
      if (menuOpen) { closeMenu(); return; }
    }
    if (e.key === 'ArrowLeft')  { switchScene(currentSceneIdx - 1, false); return; }
    if (e.key === 'ArrowRight') { switchScene(currentSceneIdx + 1, false); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
    if (e.key === ' ') { e.preventDefault(); btnAutorotate.click(); return; }
    if (e.key === '+' || e.key === '=') { setFov(currentFov - FOV_STEP); return; }
    if (e.key === '-' || e.key === '_') { setFov(currentFov + FOV_STEP); return; }
    if (e.key === 'm' || e.key === 'M') { menuOpen ? closeMenu() : openMenu(); return; }
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

    REGIONS.forEach(function(region) {
      if (!regionVisibility[region.id]) return;
      if (region.appearsIn.indexOf(SCENES[currentSceneIdx].id) < 0) return;

      var pts = region.polygon.map(function(v) {
        return view.coordinatesToScreen({ yaw: v.yaw, pitch: v.pitch });
      });
      var validPts = pts.filter(function(p) { return p !== null; });
      if (validPts.length < 3) return;

      var ptsStr = validPts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', ptsStr);
      poly.setAttribute('fill', region.fillColor);
      poly.setAttribute('stroke', region.strokeColor);
      poly.setAttribute('stroke-width', '1.5');
      svg.appendChild(poly);

      var cx = 0, cy = 0;
      validPts.forEach(function(p) { cx += p.x; cy += p.y; });
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
    marzipanoScenes.forEach(function(s) {
      s.view.addEventListener('change', onViewChange);
    });
  }

  window.addEventListener('resize', function() {
    if (viewer) viewer.updateSize();
    updateRegionOverlay();
  });

  // ─── Info modal (kept for compatibility) ──────────────────────────────────
  modalCloseBtn.addEventListener('click', function() { infoModal.hidden = true; });
  infoModal.addEventListener('click', function(e) {
    if (e.target === infoModal) infoModal.hidden = true;
  });

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      initViewer();
      attachViewChangeListeners();
      initParallax();
    });
  } else {
    window.addEventListener('load', function() {
      initViewer();
      attachViewChangeListeners();
      initParallax();
    });
  }

})();
