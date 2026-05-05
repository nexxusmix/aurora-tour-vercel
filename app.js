/* Aurora Oasis Tour Virtual v6 — FOV Wide | Drift Loop | Premium Icons | Admin Full | Zero Italic */

(function () {
  'use strict';

  // ─── Theme ────────────────────────────────────────────────────────────────
  var THEME_KEY = 'aurora-tour-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    // Map style stays independent from theme (user controls via layer switcher)
  }

  var savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  // ─── Admin ────────────────────────────────────────────────────────────────
  var ADMIN_PASSWORD = '827336';
  var REGIONS_KEY = 'aurora_regions_v1';
  var CONTENT_KEY = 'aurora_content_v1';
  var currentAdminTab = null;
  var drawingState = { active: false, label: '', color: '#C9A84C', type: 'polygon', vertices: [] };

  function loadRegions() {
    try { return JSON.parse(localStorage.getItem(REGIONS_KEY) || '[]'); } catch(e) { return []; }
  }
  function saveRegions(arr) { localStorage.setItem(REGIONS_KEY, JSON.stringify(arr)); }

  function loadContent() {
    try { return JSON.parse(localStorage.getItem(CONTENT_KEY) || '{}'); } catch(e) { return {}; }
  }

  function openAdmin() {
    var pw = prompt('Senha admin:');
    if (pw === null) return;
    if (pw !== ADMIN_PASSWORD) {
      alert('Senha inválida.');
      return;
    }
    var adminBar = document.getElementById('admin-bar');
    adminBar.hidden = false;
    document.getElementById('viewer').style.top = '48px';
    document.getElementById('header').style.top = '48px';
  }

  function exitAdmin() {
    document.getElementById('admin-bar').hidden = true;
    document.getElementById('viewer').style.top = '';
    document.getElementById('header').style.top = '';
    closeAdminPanel();
    cleanupDrawing();
    currentAdminTab = null;
    document.querySelectorAll('.admin-btn[data-admin-tab]').forEach(function(b) {
      b.classList.remove('is-active');
    });
  }

  function closeAdminPanel() {
    var panel = document.getElementById('admin-panel');
    panel.hidden = true;
  }

  function openAdminPanel(tab) {
    var panel = document.getElementById('admin-panel');
    var titleEl = document.getElementById('admin-panel-title');
    var bodyEl = document.getElementById('admin-panel-body');

    panel.hidden = false;

    document.querySelectorAll('.admin-btn[data-admin-tab]').forEach(function(b) {
      b.classList.toggle('is-active', b.dataset.adminTab === tab);
    });

    currentAdminTab = tab;

    if (tab === 'manual') {
      titleEl.textContent = 'Demarcações Manual';
      bodyEl.innerHTML = renderManualPanel();
      bindManualPanel();
    } else if (tab === 'ia') {
      titleEl.textContent = 'Demarcações IA';
      bodyEl.innerHTML = renderIAPanel();
      bindIAPanel();
    } else if (tab === 'content') {
      titleEl.textContent = 'Editar Conteúdo';
      bodyEl.innerHTML = renderContentPanel();
      bindContentPanel();
    } else if (tab === 'export') {
      titleEl.textContent = 'Exportar / Importar';
      bodyEl.innerHTML = renderExportPanel();
      bindExportPanel();
    }
  }

  // ─── Admin Manual Drawing ─────────────────────────────────────────────────
  function renderManualPanel() {
    var regions = loadRegions();
    var listHTML = regions.length === 0 ? '<p style="color:var(--ink-muted);font-size:12px;">Nenhuma região cadastrada.</p>' : '';
    regions.forEach(function(r) {
      var vCount = r.vertices ? r.vertices.length : 0;
      listHTML += '<div class="admin-region-item">' +
        '<span class="admin-region-dot" style="background:' + r.color + '"></span>' +
        '<span class="admin-region-name">' + r.label + '</span>' +
        '<span class="admin-region-meta">' + vCount + ' vértices</span>' +
        '<button class="admin-action danger" data-del-region="' + r.id + '" style="padding:4px 8px;font-size:10px;margin:0;">×</button>' +
      '</div>';
    });
    return '<div class="admin-section">' +
        '<div class="admin-status-pill" id="drawing-status">' +
          '<span class="admin-status-dot"></span>' +
          '<span>Modo desenho inativo</span>' +
        '</div>' +
      '</div>' +
      '<div class="admin-divider"></div>' +
      '<div class="admin-section">' +
        '<div class="admin-section-title">Nova região</div>' +
        '<label class="admin-label-field">Cor do pin</label>' +
        '<div class="admin-radio-group" id="color-group">' +
          '<button class="admin-radio-btn selected" data-color="#C9A84C">Dourado</button>' +
          '<button class="admin-radio-btn" data-color="#30d158">Verde</button>' +
          '<button class="admin-radio-btn" data-color="#c84c4c">Terracotta</button>' +
          '<button class="admin-radio-btn" data-color="#4c7bc8">Azul</button>' +
        '</div>' +
        '<label class="admin-label-field">Tipo</label>' +
        '<div class="admin-radio-group" id="type-group">' +
          '<button class="admin-radio-btn selected" data-type="polygon">Polígono</button>' +
          '<button class="admin-radio-btn" data-type="freehand">Freehand</button>' +
        '</div>' +
        '<label class="admin-label-field">Label</label>' +
        '<input type="text" class="admin-input" id="new-region-label" placeholder="Ex: Zona Premium">' +
        '<div class="admin-actions-row">' +
          '<button class="admin-action primary" id="btn-start-drawing">Iniciar</button>' +
          '<button class="admin-action" id="btn-finish-drawing" style="display:none">Finalizar (Enter)</button>' +
          '<button class="admin-action danger" id="btn-cancel-drawing" style="display:none">Cancelar (Esc)</button>' +
        '</div>' +
        '<div class="admin-note" id="drawing-hint" style="display:none">Clique para adicionar vértices. Duplo clique ou Enter para fechar o polígono. Esc para cancelar.</div>' +
      '</div>' +
      '<div class="admin-divider"></div>' +
      '<div class="admin-section">' +
        '<div class="admin-section-title">Regiões existentes (' + regions.length + ')</div>' +
        '<div class="admin-region-list">' + listHTML + '</div>' +
        '<div class="admin-actions-row">' +
          '<button class="admin-action primary" id="btn-save-regions">Salvar</button>' +
        '</div>' +
      '</div>';
  }

  function bindManualPanel() {
    var selectedColor = '#C9A84C';
    var selectedType = 'polygon';

    document.querySelectorAll('#color-group .admin-radio-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#color-group .admin-radio-btn').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
        drawingState.color = selectedColor;
      });
    });

    document.querySelectorAll('#type-group .admin-radio-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#type-group .admin-radio-btn').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedType = btn.dataset.type;
        drawingState.type = selectedType;
      });
    });

    var startBtn = document.getElementById('btn-start-drawing');
    var finishBtn = document.getElementById('btn-finish-drawing');
    var cancelBtn = document.getElementById('btn-cancel-drawing');
    var statusPill = document.getElementById('drawing-status');
    var hintEl = document.getElementById('drawing-hint');

    if (startBtn) {
      startBtn.addEventListener('click', function() {
        var label = (document.getElementById('new-region-label') || {}).value || 'Região ' + Date.now();
        startDrawingMode({ label: label, color: selectedColor, type: selectedType });
        statusPill.classList.add('active');
        statusPill.querySelector('span:last-child').textContent = 'Modo desenho ativo';
        startBtn.style.display = 'none';
        finishBtn.style.display = '';
        cancelBtn.style.display = '';
        hintEl.style.display = '';
      });
    }

    if (finishBtn) {
      finishBtn.addEventListener('click', function() { finishDrawing(); });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() { cleanupDrawing(); openAdminPanel('manual'); });
    }

    document.querySelectorAll('[data-del-region]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.dataset.delRegion;
        var regions = loadRegions().filter(function(r) { return r.id !== id; });
        saveRegions(regions);
        openAdminPanel('manual');
        rebuildRegionsOverlay();
      });
    });

    var saveBtn = document.getElementById('btn-save-regions');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        rebuildRegionsOverlay();
        saveBtn.textContent = 'Salvo!';
        setTimeout(function() { saveBtn.textContent = 'Salvar'; }, 1200);
      });
    }
  }

  function startDrawingMode(opts) {
    drawingState = { active: true, label: opts.label, color: opts.color, type: opts.type, vertices: [], lastSampleTime: 0 };
    var pano = document.getElementById('pano') || document.getElementById('viewer');
    pano.classList.add('drawing-mode');

    if (opts.type === 'freehand') {
      pano.addEventListener('pointerdown', onFreehandStart);
    } else {
      pano.addEventListener('click', onDrawClick);
      pano.addEventListener('dblclick', finishDrawing);
    }
  }

  function onDrawClick(e) {
    if (!drawingState.active) return;
    if (e.detail >= 2) return; // skip single-click on dblclick
    var pano = document.getElementById('pano') || document.getElementById('viewer');
    var rect = pano.getBoundingClientRect();
    var screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    var s = marzipanoScenes[currentSceneIdx];
    if (!s) return;
    var coords = s.view.screenToCoordinates(screen);
    if (!coords) return;
    drawingState.vertices.push(coords);
    renderDrawingPreview();
  }

  function onFreehandStart(e) {
    var pano = document.getElementById('pano') || document.getElementById('viewer');
    function onMove(ev) {
      var now = performance.now();
      if (now - drawingState.lastSampleTime < 50) return;
      drawingState.lastSampleTime = now;
      var rect = pano.getBoundingClientRect();
      var screen = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      var s = marzipanoScenes[currentSceneIdx];
      if (!s) return;
      var coords = s.view.screenToCoordinates(screen);
      if (!coords) return;
      drawingState.vertices.push(coords);
      renderDrawingPreview();
    }
    function onEnd() {
      pano.removeEventListener('pointermove', onMove);
      pano.removeEventListener('pointerup', onEnd);
      finishDrawing();
    }
    pano.addEventListener('pointermove', onMove);
    pano.addEventListener('pointerup', onEnd);
  }

  function renderDrawingPreview() {
    var svg = document.getElementById('region-overlay');
    if (!svg || drawingState.vertices.length < 2) return;
    var s = marzipanoScenes[currentSceneIdx];
    if (!s) return;
    var w = window.innerWidth, h = window.innerHeight;

    // Remove previous preview
    var prev = svg.querySelector('#drawing-preview');
    if (prev) prev.remove();

    var pts = drawingState.vertices.map(function(v) {
      return s.view.coordinatesToScreen({ yaw: v.yaw, pitch: v.pitch });
    }).filter(function(p) { return p !== null; });
    if (pts.length < 2) return;

    var ptsStr = pts.map(function(p) { return p.x + ',' + p.y; }).join(' ');
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = 'drawing-preview';
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', ptsStr);
    poly.setAttribute('fill', drawingState.color.replace(')', ',0.18)').replace('rgb(', 'rgba(') || 'rgba(201,168,76,0.18)');
    poly.setAttribute('stroke', drawingState.color);
    poly.setAttribute('stroke-width', '1.5');
    poly.setAttribute('stroke-dasharray', '4 3');
    g.appendChild(poly);
    svg.appendChild(g);
  }

  function clearDrawingPreview() {
    var prev = document.getElementById('drawing-preview');
    if (prev) prev.remove();
  }

  function finishDrawing() {
    if (!drawingState.active || drawingState.vertices.length < 3) { cleanupDrawing(); return; }
    var regions = loadRegions();
    regions.push({
      id: 'r_' + Date.now(),
      label: drawingState.label,
      color: drawingState.color,
      fillColor: 'rgba(201,168,76,0.18)',
      strokeColor: drawingState.color,
      vertices: drawingState.vertices,
      appearsIn: [SCENES[currentSceneIdx].id],
      createdAt: new Date().toISOString()
    });
    saveRegions(regions);
    cleanupDrawing();
    rebuildRegionsOverlay();
    openAdminPanel('manual');
  }

  function cleanupDrawing() {
    drawingState.active = false;
    var pano = document.getElementById('pano') || document.getElementById('viewer');
    pano.classList.remove('drawing-mode');
    pano.removeEventListener('click', onDrawClick);
    pano.removeEventListener('dblclick', finishDrawing);
    pano.removeEventListener('pointerdown', onFreehandStart);
    clearDrawingPreview();
  }

  function rebuildRegionsOverlay() {
    updateRegionOverlay();
  }

  // ─── Admin IA Panel ───────────────────────────────────────────────────────
  function renderIAPanel() {
    var token = localStorage.getItem('aurora_replicate_token') || '';
    var hasToken = !!token;
    return '<div class="admin-section">' +
        '<div class="admin-section-title">Detecção automática de áreas</div>' +
        '<p style="font-size:12px;color:var(--ink-soft);line-height:1.6;margin-bottom:12px;">A IA analisa a cena atual do tour e propõe demarcações de áreas distintas (lote, lago, mata, edificação).</p>' +
        '<p style="font-size:11px;color:var(--ink-muted);line-height:1.5;">Stack: Replicate · Segment Anything Model 2</p>' +
      '</div>' +
      '<div class="admin-divider"></div>' +
      (hasToken
        ? '<div class="admin-section"><button class="admin-action primary" id="btn-detect-ia">Detectar lotes na cena atual</button></div>'
        : '<div class="admin-section">' +
            '<div class="admin-note">Esta funcionalidade requer um token Replicate. Cole abaixo:</div>' +
            '<label class="admin-label-field">REPLICATE_API_TOKEN</label>' +
            '<input type="password" class="admin-input" id="replicate-token" placeholder="r8_...">' +
            '<div class="admin-actions-row">' +
              '<button class="admin-action primary" id="btn-save-token">Salvar token</button>' +
            '</div>' +
          '</div>') +
      '<div class="admin-divider"></div>' +
      '<div class="admin-note" style="font-size:10px;">Integração SAM via Replicate em desenvolvimento. Por ora, captura snapshot e inicia download local.</div>';
  }

  function bindIAPanel() {
    var saveTokenBtn = document.getElementById('btn-save-token');
    if (saveTokenBtn) {
      saveTokenBtn.addEventListener('click', function() {
        var v = (document.getElementById('replicate-token') || {}).value || '';
        if (!v) return;
        localStorage.setItem('aurora_replicate_token', v);
        openAdminPanel('ia');
      });
    }
    var detectBtn = document.getElementById('btn-detect-ia');
    if (detectBtn) {
      detectBtn.addEventListener('click', detectIA);
    }
  }

  // TODO: integrar Replicate SAM via Vercel Serverless Function (api/segment.js) pra evitar CORS.
  // Por enquanto, captura snapshot e baixa pro user processar manualmente.
  async function detectIA() {
    try {
      var canvas = viewer && viewer.stage && viewer.stage().domElement ? viewer.stage().domElement() : null;
      if (!canvas) { alert('Snapshot indisponível.'); return; }
      var dataUrl = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = dataUrl; a.download = 'aurora-snapshot-' + Date.now() + '.png';
      a.click();
      alert('Snapshot baixado. Integração SAM via Replicate em desenvolvimento.');
    } catch(e) {
      alert('Erro ao capturar snapshot: ' + e.message);
    }
  }

  // ─── Admin Content Panel ──────────────────────────────────────────────────
  var CONTENT_FIELDS = [
    { key: 'conceito.manifesto', label: 'Conceito — Manifesto', type: 'textarea' },
    { key: 'conceito.por-que-lead', label: 'Conceito — 01 Por que (lead)', type: 'textarea' },
    { key: 'conceito.conceito-lead', label: 'Conceito — 02 Conceito (lead)', type: 'textarea' },
    { key: 'localizacao.endereco-body', label: 'Localização — Endereço (body)', type: 'textarea' }
  ];

  function renderContentPanel() {
    var overrides = loadContent();
    var opts = '<option value="">— Selecionar campo —</option>';
    CONTENT_FIELDS.forEach(function(f, i) {
      opts += '<option value="' + f.key + '">' + f.label + '</option>';
    });
    return '<div class="admin-section">' +
        '<div class="admin-section-title">Sobrescrever conteúdo dos modais</div>' +
        '<label class="admin-label-field">Campo</label>' +
        '<select class="admin-select" id="content-field-sel">' + opts + '</select>' +
        '<div id="content-edit-area" style="display:none">' +
          '<label class="admin-label-field" id="content-field-label">Valor</label>' +
          '<textarea class="admin-textarea" id="content-field-val" rows="5"></textarea>' +
        '</div>' +
        '<div class="admin-actions-row">' +
          '<button class="admin-action primary" id="btn-save-content">Salvar mudanças</button>' +
          '<button class="admin-action danger" id="btn-reset-content">Restaurar padrão</button>' +
        '</div>' +
      '</div>';
  }

  function bindContentPanel() {
    var overrides = loadContent();
    var sel = document.getElementById('content-field-sel');
    var editArea = document.getElementById('content-edit-area');
    var valEl = document.getElementById('content-field-val');
    var labelEl = document.getElementById('content-field-label');

    if (sel) {
      sel.addEventListener('change', function() {
        var key = sel.value;
        if (!key) { editArea.style.display = 'none'; return; }
        editArea.style.display = '';
        var field = CONTENT_FIELDS.find(function(f) { return f.key === key; });
        if (field && labelEl) labelEl.textContent = field.label;
        if (valEl) valEl.value = overrides[key] || '';
      });
    }

    var saveBtn = document.getElementById('btn-save-content');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        var key = sel ? sel.value : '';
        if (!key || !valEl) return;
        overrides[key] = valEl.value;
        localStorage.setItem(CONTENT_KEY, JSON.stringify(overrides));
        saveBtn.textContent = 'Salvo!';
        setTimeout(function() { saveBtn.textContent = 'Salvar mudanças'; }, 1200);
      });
    }

    var resetBtn = document.getElementById('btn-reset-content');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (!confirm('Restaurar todo o conteúdo ao padrão?')) return;
        localStorage.removeItem(CONTENT_KEY);
        openAdminPanel('content');
      });
    }
  }

  // ─── Admin Export Panel ───────────────────────────────────────────────────
  function renderExportPanel() {
    return '<div class="admin-section">' +
        '<div class="admin-section-title">Configuração completa</div>' +
        '<p style="font-size:12px;color:var(--ink-soft);line-height:1.6;margin-bottom:16px;">Exporte regions, conteúdo personalizado e tema em um único JSON. Importe para restaurar ou migrar configuração.</p>' +
        '<div class="admin-actions-row">' +
          '<button class="admin-action primary" id="btn-export">Exportar configuração</button>' +
        '</div>' +
      '</div>' +
      '<div class="admin-divider"></div>' +
      '<div class="admin-section">' +
        '<div class="admin-section-title">Importar</div>' +
        '<input type="file" accept=".json" id="import-file" style="display:none">' +
        '<label for="import-file" class="admin-action" style="cursor:pointer;display:inline-flex;">Selecionar arquivo JSON</label>' +
      '</div>';
  }

  function bindExportPanel() {
    var expBtn = document.getElementById('btn-export');
    if (expBtn) expBtn.addEventListener('click', exportConfig);

    var importFile = document.getElementById('import-file');
    if (importFile) {
      importFile.addEventListener('change', function() {
        if (!importFile.files[0]) return;
        importConfig(importFile.files[0]);
      });
    }
  }

  function exportConfig() {
    var cfg = {
      version: 1,
      regions: loadRegions(),
      content: loadContent(),
      theme: localStorage.getItem(THEME_KEY) || 'light',
      exportedAt: new Date().toISOString()
    };
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aurora-config-' + Date.now() + '.json';
    a.click();
  }

  function importConfig(file) {
    var reader = new FileReader();
    reader.onload = function() {
      try {
        var cfg = JSON.parse(reader.result);
        if (cfg.regions) saveRegions(cfg.regions);
        if (cfg.content) localStorage.setItem(CONTENT_KEY, JSON.stringify(cfg.content));
        if (cfg.theme) applyTheme(cfg.theme);
        alert('Config importada! Recarregando...');
        location.reload();
      } catch(e) {
        alert('JSON invalido: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  // ─── Scene Data ───────────────────────────────────────────────────────────
  var SCENES = [
    { id: 'pano_01', label: 'Apresentação',  number: '01', description: 'Panorâmica geral' },
    { id: 'pano_02', label: 'Vista do Lago', number: '02', description: 'Frente lago · Lago Corumbá IV' },
    { id: 'pano_03', label: 'Margem',        number: '03', description: 'Margem do lago' },
    { id: 'pano_04', label: 'Hora Dourada',  number: '04', description: 'Cerrado ao entardecer' }
  ];

  // ─── Region Data ──────────────────────────────────────────────────────────
  var REGIONS = [];

  // ─── State ────────────────────────────────────────────────────────────────
  var currentSceneIdx = 1;
  var viewer = null;
  var marzipanoScenes = [];
  var flatScenes = [];
  var overviewMode = false;
  var autorotating = false;
  var autorotateCtrl = null;
  var regionVisibility = { regions: true, aurora_oasis: true, aurora_lago: true };
  var menuOpen = false;
  var scenePkrOpen = false;
  var featModalOpen = false;

  // Drift loop state (replaces mouse parallax)
  var DRIFT_AMPLITUDE = 0.012;
  var DRIFT_PERIOD_YAW = 24000;
  var DRIFT_PERIOD_PITCH = 18000;
  var driftStart = performance.now();
  var basePose = { yaw: 0, pitch: -0.05 };
  var userInteracting = false;

  // Zoom
  var FOV_MIN = 35 * Math.PI / 180;
  var FOV_MAX = 179 * Math.PI / 180;
  var FOV_DEFAULT = 175 * Math.PI / 180;
  var FOV_STEP = 5 * Math.PI / 180;
  var currentFov = FOV_DEFAULT;

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
  var menuModal      = document.getElementById('menu-modal');
  var mmCloseBtn     = document.getElementById('mm-close-btn');
  var btnFullscreen  = document.getElementById('btn-fullscreen');
  var btnAdmin       = document.getElementById('btn-admin');
  var btnCenas       = document.getElementById('btn-cenas');
  var scenePicker    = document.getElementById('scene-picker');
  var featModal      = document.getElementById('feat-modal');
  var featModalBack  = document.getElementById('feat-modal-backdrop');
  var featModalClose = document.getElementById('feat-modal-close');
  var featModalTitle = document.getElementById('feat-modal-title');
  var featModalBody  = document.getElementById('feat-modal-body');

  // ─── Modal Content Functions ──────────────────────────────────────────────

  function locationContent() {
    return [
      '<div class="modal-section">',
        '<div class="section-num">Endereço</div>',
        '<h3 class="section-title">Lago Corumbá IV</h3>',
        '<p class="section-body">Aurora Oasis fica às margens do Lago Corumbá IV, em Abadiânia, no eixo entre Anápolis, Goiânia e Brasília. Posição estratégica para quem quer refúgio sem isolamento.</p>',
        '<div class="loc-data">',
          '<div class="loc-row"><div class="loc-mini">Município</div><div class="loc-val">Abadiânia · Goiás</div></div>',
          '<div class="loc-row"><div class="loc-mini">CEP</div><div class="loc-val">72940-000</div></div>',
          '<div class="loc-row"><div class="loc-mini">Coordenadas</div><div class="loc-val loc-mono">-16.274689 · -48.464529</div></div>',
        '</div>',
      '</div>',

      '<div class="modal-section">',
        '<div class="section-num">Distâncias</div>',
        '<div class="distances-grid">',
          '<article class="dist-card reveal" data-reveal>',
            '<div class="dist-city">Anápolis</div>',
            '<div class="dist-meta">GO</div>',
            '<div class="dist-km">36 <span>km</span></div>',
            '<div class="dist-time">≈ 40 min</div>',
          '</article>',
          '<article class="dist-card reveal" data-reveal>',
            '<div class="dist-city">Brasília</div>',
            '<div class="dist-meta">DF</div>',
            '<div class="dist-km">112 <span>km</span></div>',
            '<div class="dist-time">≈ 1h 30min</div>',
          '</article>',
          '<article class="dist-card reveal" data-reveal>',
            '<div class="dist-city">Goiânia</div>',
            '<div class="dist-meta">GO</div>',
            '<div class="dist-km">96 <span>km</span></div>',
            '<div class="dist-time">≈ 1h 20min</div>',
          '</article>',
        '</div>',
      '</div>',

      '<div class="modal-section">',
        '<div class="section-num">Mapa</div>',
        '<div class="map-frame">',
          '<div id="map" class="map-canvas"></div>',
          '<div class="map-layers">',
            '<button class="map-layer-btn is-active" data-style="satellite"><div class="ml-thumb ml-sat"></div><span class="ml-label">Satélite</span></button>',
            '<button class="map-layer-btn" data-style="streets"><div class="ml-thumb ml-str"></div><span class="ml-label">Mapa</span></button>',
            '<button class="map-layer-btn" data-style="terrain"><div class="ml-thumb ml-ter"></div><span class="ml-label">Relevo</span></button>',
            '<button class="map-layer-btn" data-style="dark"><div class="ml-thumb ml-drk"></div><span class="ml-label">Noite</span></button>',
          '</div>',
          '<div class="map-cities">',
            '<button class="mc-btn is-active" data-fly="aurora">Aurora</button>',
            '<button class="mc-btn" data-fly="anapolis">Anápolis</button>',
            '<button class="mc-btn" data-fly="brasilia">Brasília</button>',
            '<button class="mc-btn" data-fly="goiania">Goiânia</button>',
            '<span class="mc-divider"></span>',
            '<button class="mc-btn mc-tour" data-fly="tour">Tour automático</button>',
            '<button class="mc-btn mc-overview" data-fly="overview">Visão geral</button>',
          '</div>',
        '</div>',
      '</div>',

      '<div class="modal-section modal-actions">',
        '<a href="https://www.google.com/maps/?q=-16.274689,-48.464529" target="_blank" rel="noopener" class="modal-link">Abrir no Google Maps</a>',
        '<a href="https://www.google.com/maps/dir/?api=1&destination=-16.274689,-48.464529" target="_blank" rel="noopener" class="modal-link">Como chegar</a>',
        '<a href="https://www.waze.com/ul?ll=-16.274689,-48.464529&navigate=yes" target="_blank" rel="noopener" class="modal-link">Abrir no Waze</a>',
      '</div>'
    ].join('');
  }

  function conceitoHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Manifesto</div>' +
      '<p class="section-lead">Aurora Oasis — um endereço para quem entendeu que o tempo é o verdadeiro luxo.</p>' +
      '<hr class="section-divider">' +
    '</div>' +

    '<div class="modal-section">' +
      '<div class="section-num">A ideia</div>' +
      '<h3 class="section-title">Um lugar feito para diminuir o ritmo.</h3>' +
      '<p class="section-body">Às margens do Lago Corumbá IV, em Abadiânia, Goiás, Aurora Oasis nasce como refúgio premium: cerrado preservado, frente lago ininterrupta e arquitetura assinada para quem busca presença, não pressa. Distante o suficiente para acolher, próximo o suficiente para integrar — entre Anápolis, Goiânia e Brasília.</p>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Os quatro pilares</div>' +
      '<h3 class="section-title">O que torna Aurora único.</h3>' +
      '<div class="pillars-grid">' +
        '<article class="pillar reveal" data-reveal>' +
          '<div class="pillar-num">01</div>' +
          '<h4 class="pillar-title">Presença</h4>' +
          '<p class="pillar-desc">O tempo desacelera para quem sabe vivê-lo. Cada construção é desenhada para favorecer a contemplação — sem pressa, sem ruído.</p>' +
        '</article>' +
        '<article class="pillar reveal" data-reveal>' +
          '<div class="pillar-num">02</div>' +
          '<h4 class="pillar-title">Exclusividade</h4>' +
          '<p class="pillar-desc">Cada nome foi escolhido. O empreendimento se relaciona com seus moradores, não com massa. Um endereço que se recusa a ser apenas mais um.</p>' +
        '</article>' +
        '<article class="pillar reveal" data-reveal>' +
          '<div class="pillar-num">03</div>' +
          '<h4 class="pillar-title">Refúgio</h4>' +
          '<p class="pillar-desc">Um refúgio silencioso onde o essencial reaparece. Distante o suficiente para acolher, próximo o suficiente para integrar.</p>' +
        '</article>' +
        '<article class="pillar reveal" data-reveal>' +
          '<div class="pillar-num">04</div>' +
          '<h4 class="pillar-title">O Primordial</h4>' +
          '<p class="pillar-desc">Conexão com o cerrado nativo, o lago, a hora dourada e o céu. O luxo aqui é o que sempre existiu e está se perdendo.</p>' +
        '</article>' +
      '</div>' +
    '</div>';
  }

  function implantacaoHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Master Plan</div>' +
      '<h3 class="section-title">Um plano desenhado para o tempo.</h3>' +
      '<p class="section-body">Volumetria suave, materiais naturais, integração com o cerrado nativo e vista privilegiada para o lago. Programa arquitetônico assinado pela <strong>FAAU · Flávio Aleixo</strong>.</p>' +
    '</div>' +

    '<div class="modal-section">' +
      '<div class="section-num">Números</div>' +
      '<div class="metrics-row">' +
        '<div class="metric reveal" data-reveal><div class="metric-num">241</div><div class="metric-label">Lotes</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">6</div><div class="metric-label">Quadras</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">~1.250</div><div class="metric-label">m² médio por lote</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">30%</div><div class="metric-label">Cerrado preservado</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Estrutura</div>' +
      '<h3 class="section-title">Vida completa, sem ostentação.</h3>' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
        '<linearGradient id="aurora-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" stop-color="#E8C97A"/>' +
          '<stop offset="50%" stop-color="#C9A84C"/>' +
          '<stop offset="100%" stop-color="#9A7E2E"/>' +
        '</linearGradient>' +
        '<linearGradient id="aurora-gold-stroke" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%" stop-color="#E8C97A"/>' +
          '<stop offset="100%" stop-color="#A7842F"/>' +
        '</linearGradient>' +
      '</defs></svg>' +
      '<div class="amenities-grid">' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-wine"><path d="M7 3h10c0 4.5-1.5 8-5 8s-5-3.5-5-8z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><line x1="12" y1="11" x2="12" y2="19" stroke="url(#aurora-gold-stroke)" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="20.5" x2="16" y2="20.5" stroke="url(#aurora-gold-stroke)" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="10.5" cy="6" rx="1.2" ry="1.6" fill="rgba(255,255,255,0.45)"/></svg></span><div class="amenity-name">Wine Bar</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-gym"><rect x="2" y="9.5" width="3" height="5" rx="0.6" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><rect x="19" y="9.5" width="3" height="5" rx="0.6" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><rect x="5" y="10.5" width="2" height="3" fill="url(#aurora-gold-grad)"/><rect x="17" y="10.5" width="2" height="3" fill="url(#aurora-gold-grad)"/><rect x="7" y="11.3" width="10" height="1.4" rx="0.4" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5"/><line x1="3" y1="10.4" x2="3" y2="13.6" stroke="rgba(255,255,255,0.4)" stroke-width="0.4"/><line x1="20" y1="10.4" x2="20" y2="13.6" stroke="rgba(255,255,255,0.4)" stroke-width="0.4"/></svg></span><div class="amenity-name">Academia</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-pool"><circle cx="17.5" cy="6" r="2.4" fill="url(#aurora-gold-grad)"/><path d="M2 14c2 0 2-1.6 4-1.6S8 14 10 14s2-1.6 4-1.6S16 14 18 14s2-1.6 4-1.6" stroke="url(#aurora-gold-stroke)" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M2 18c2 0 2-1.6 4-1.6S8 18 10 18s2-1.6 4-1.6S16 18 18 18s2-1.6 4-1.6" stroke="url(#aurora-gold-stroke)" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7"/><circle cx="17.5" cy="6" r="1" fill="rgba(255,255,255,0.5)"/></svg></span><div class="amenity-name">Piscina</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-rest"><circle cx="12" cy="13" r="6" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.5"/><path d="M5 3v6c0 0.8 0.5 1.4 1.2 1.4M7.6 3v6c0 0.8-0.5 1.4-1.2 1.4M6.4 10.4V18" stroke="url(#aurora-gold-stroke)" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M17 3c1.5 0 2.5 1 2.5 3v3c0 1-0.5 1.6-1.2 1.8V18" stroke="url(#aurora-gold-stroke)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg></span><div class="amenity-name">Restaurante</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-spa"><path d="M12 4c-2 3-2 5 0 7c2-2 2-4 0-7z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5"/><path d="M5 9c0 3 2 4 5 4c0-2-1-4-5-4z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5" opacity="0.85"/><path d="M19 9c0 3-2 4-5 4c0-2 1-4 5-4z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5" opacity="0.85"/><path d="M3 13c2 4 6 5 9 5s7-1 9-5c-3 1-5 0-9 0s-6 1-9 0z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><ellipse cx="12" cy="6.5" rx="0.5" ry="0.8" fill="rgba(255,255,255,0.5)"/></svg></span><div class="amenity-name">Spa Completo</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-track"><path d="M3 12a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.7"/><path d="M5.5 12a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 0 5H8a2.5 2.5 0 0 1-2.5-2.5z" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/><line x1="8" y1="7" x2="8" y2="17" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/><line x1="16" y1="7" x2="16" y2="17" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/></svg></span><div class="amenity-name">Track Arena</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-trail"><path d="M7 14L4.5 9 2 14h2v5h2v-5h1z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5"/><path d="M14 12L11.5 6 9 12h2v7h2v-7h1z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5"/><path d="M22 14L19.5 9 17 14h2v5h2v-5h1z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5" opacity="0.85"/><path d="M5 19h14" stroke="url(#aurora-gold-stroke)" stroke-width="0.5" stroke-dasharray="1 1.5"/></svg></span><div class="amenity-name">Trilha Cerrado</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-mirante"><path d="M2 18l5-9 4 6 3-4 5 7H2z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><circle cx="18" cy="5.5" r="2.2" fill="url(#aurora-gold-grad)" opacity="0.9"/><line x1="2" y1="20" x2="22" y2="20" stroke="url(#aurora-gold-stroke)" stroke-width="1" stroke-linecap="round"/><line x1="2" y1="21.5" x2="22" y2="21.5" stroke="url(#aurora-gold-stroke)" stroke-width="0.7" stroke-linecap="round" opacity="0.6"/><ellipse cx="6" cy="13" rx="0.8" ry="0.4" fill="rgba(255,255,255,0.5)"/></svg></span><div class="amenity-name">Mirante Lago</div></div>' +
      '</div>' +
    '</div>';
  }

  function disponibilidadesHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Visão Geral</div>' +
      '<h3 class="section-title">241 lotes · 6 quadras · 3 categorias</h3>' +
      '<p class="section-body">O empreendimento divide-se entre lotes premium frente-lago, lotes intermediários com vista parcial e lotes mata-cerrado. Status em tempo real disponível pelo Squad Hub conforme o lançamento avança.</p>' +
      '<div class="metrics-row">' +
        '<div class="metric"><div class="metric-num">241</div><div class="metric-label">Lotes totais</div></div>' +
        '<div class="metric"><div class="metric-num">6</div><div class="metric-label">Quadras</div></div>' +
        '<div class="metric"><div class="metric-num">~1.250</div><div class="metric-label">m² médio</div></div>' +
        '<div class="metric"><div class="metric-num">R$ 235k</div><div class="metric-label">Ticket médio</div></div>' +
      '</div>' +
    '</div>' +
    '<hr class="section-divider">' +
    '<div class="modal-section">' +
      '<div class="section-num">Lote em destaque · 1ª Fase</div>' +
      '<h3 class="section-title">Lote 137</h3>' +
      '<div class="metrics-row">' +
        '<div class="metric"><div class="metric-num">1.250</div><div class="metric-label">m² · Lote 137</div></div>' +
        '<div class="metric"><div class="metric-num">R$ 235k</div><div class="metric-label">Valor de referência</div></div>' +
        '<div class="metric"><div class="metric-num">60</div><div class="metric-label">Lotes · 1ª Fase</div></div>' +
        '<div class="metric"><div class="metric-num">241</div><div class="metric-label">Lotes · Total</div></div>' +
      '</div>' +
      '<hr class="section-divider">' +
      '<div class="section-num">Status</div>' +
      '<p class="section-body">Status atualizado dos lotes disponíveis. Reservas confirmadas pela equipe Silva Investimentos.</p>' +
    '</div>';
  }

  function imagensHTML() {
    var photos = [
      { src: 'img/gallery/capa-book-oasis-1.webp', label: 'Capa · Volume 1', cat: 'editorial', tag: 'Editorial' },
      { src: 'img/gallery/capa-book-oasis-2.webp', label: 'Capa · Volume 2', cat: 'editorial', tag: 'Editorial' },
      { src: 'img/gallery/capa-book-oasis-3.webp', label: 'Capa · Volume 3', cat: 'editorial', tag: 'Editorial' },
      { src: 'img/gallery/capa-book-oasis-4.webp', label: 'Capa · Volume 4', cat: 'editorial', tag: 'Editorial' },
      { src: 'img/gallery/capa-book-oasis-5.webp', label: 'Capa · Volume 5', cat: 'editorial', tag: 'Editorial' },
      { src: 'img/gallery/capa-book-oasis-6.webp', label: 'Capa · Volume 6', cat: 'editorial', tag: 'Editorial' },
      { src: 'img/gallery/capa-magazine-retro.webp',  label: 'Magazine · Edição Retro',   cat: 'magazine', tag: 'Magazine' },
      { src: 'img/gallery/capa-magazine-retro-2.webp', label: 'Magazine · Edição Retro 2', cat: 'magazine', tag: 'Magazine' }
    ];
    var cats = ['todos'];
    photos.forEach(function(p) { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    var filters = cats.map(function(c, i) {
      var label = c === 'todos' ? 'Todos' : (c.charAt(0).toUpperCase() + c.slice(1));
      return '<button class="gf-btn' + (i === 0 ? ' is-active' : '') + '" data-cat="' + c + '">' + label + '</button>';
    }).join('');
    var items = photos.map(function(p, i) {
      return '<figure class="g-item reveal" data-cat="' + p.cat + '" data-reveal style="--delay:' + (i * 60) + 'ms">' +
        '<img loading="lazy" src="' + p.src + '" alt="' + p.label + '">' +
        '<figcaption class="g-cap">' +
          '<span class="g-cat">' + p.tag + '</span>' +
          '<span class="g-label">' + p.label + '</span>' +
        '</figcaption>' +
      '</figure>';
    }).join('');
    return '<div class="modal-section">' +
      '<div class="section-num">Galeria</div>' +
      '<h3 class="section-title">Aurora em peças finais.</h3>' +
      '<p class="section-body">Capas editoriais, magazine e materiais de comunicação aprovados.</p>' +
      '<div class="gallery-filters">' + filters + '</div>' +
    '</div>' +
    '<div class="gallery-grid" id="gallery-grid">' + items + '</div>';
  }

  function bindGalleryFilters() {
    document.querySelectorAll('.gf-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.gf-btn').forEach(function(b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var cat = btn.dataset.cat;
        document.querySelectorAll('.g-item').forEach(function(item) {
          item.style.display = (cat === 'todos' || item.dataset.cat === cat) ? '' : 'none';
        });
      });
    });
  }

  function fotolivroHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Book Apresentação</div>' +
      '<h3 class="section-title">Aurora · Onde o tempo mora.</h3>' +
      '<p class="section-body">Apresentação completa do empreendimento em formato editorial. Conceito, arquitetura, paisagem e visão estratégica do Aurora Oasis para o investidor que sabe ler nas entrelinhas.</p>' +
    '</div>' +
    '<div class="modal-section">' +
      '<div class="pdf-viewer-wrap reveal" data-reveal>' +
        '<iframe class="pdf-viewer" src="pdf/aurora-oasis-fotolivro.pdf#view=FitH&toolbar=0" title="Fotolivro Aurora Oasis"></iframe>' +
      '</div>' +
      '<div class="pdf-actions">' +
        '<a href="pdf/aurora-oasis-fotolivro.pdf" download class="modal-link pdf-action">Baixar PDF</a>' +
        '<a href="pdf/aurora-oasis-fotolivro.pdf" target="_blank" rel="noopener" class="modal-link pdf-action">Abrir em tela cheia</a>' +
      '</div>' +
    '</div>';
  }

  function videosHTML() {
    var videos = [
      { src: 'video/aurora-raro-como-tempo.mp4',    poster: 'img/gallery/capa-book-oasis-1.webp', cat: 'Teaser', label: 'Raro como o tempo' },
      { src: 'video/aurora-precisa-mais-tempo.mp4', poster: 'img/gallery/capa-book-oasis-2.webp', cat: 'Teaser', label: 'Você precisa de mais tempo' },
      { src: 'video/aurora-presenca.mp4',           poster: 'img/gallery/capa-book-oasis-3.webp', cat: 'Teaser', label: 'Tempo sem presença é apenas espera' },
      { src: 'video/aurora-escritorio.mp4',         poster: 'img/gallery/capa-magazine-retro.webp', cat: 'Reveal', label: 'Próximo lançamento exclusivo' }
    ];
    var items = videos.map(function(v, i) {
      return '<div class="v-item reveal" data-reveal style="--delay:' + (i * 80) + 'ms">' +
        '<video controls preload="metadata" poster="' + v.poster + '" muted playsinline>' +
          '<source src="' + v.src + '" type="video/mp4">' +
        '</video>' +
        '<div class="v-meta"><span class="v-cat">' + v.cat + '</span><span class="v-label">' + v.label + '</span></div>' +
      '</div>';
    }).join('');
    return '<div class="modal-section">' +
      '<div class="section-num">Vídeos</div>' +
      '<h3 class="section-title">Material aprovado.</h3>' +
      '<p class="section-body">Teasers de fase conceito e reveal exclusivo do escritório Silva Investimentos.</p>' +
    '</div>' +
    '<div class="video-stack">' + items + '</div>';
  }

  function sobreHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">05 · Stack</div>' +
      '<h3 class="section-title">Tecnologia aplicada ao mercado imobiliário de alto padrão.</h3>' +
      '<p class="section-body">Toda a plataforma foi construída sobre tecnologias abertas e de alta performance, sem dependência de licenças mensais de terceiros como Matterport ou iGuide. O cliente possui o código e o deploy.</p>' +
      '<div class="layer-card"><div class="layer-num">01</div><div><div class="layer-title">Captura · Insta360 Pro 2 + DJI Matrice</div><div class="layer-desc">Câmera esférica de 8K montada em drone industrial. Cada parada é capturada em RAW esférico, processada em equiretangular e fatiada em cubemap para máxima compatibilidade mobile.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">02</div><div><div class="layer-title">Renderização · Marzipano.js + WebGL</div><div class="layer-desc">Engine open source do Google para tour 360 de alta performance. Suporte a cubemap 4K, transições suaves, gyroscópio nativo no iOS/Android e fullscreen API.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">03</div><div><div class="layer-title">Mapa · MapLibre GL + OpenFreeMap</div><div class="layer-desc">Mapa vetorial interativo sem custo por acesso. Estilo minimalista Positron, marcador personalizado com cor ouro do empreendimento.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">04</div><div><div class="layer-title">Deploy · Vercel Edge Network</div><div class="layer-desc">CDN global com latência sub-50ms no Brasil. Deploy contínuo por push no GitHub. Certificado SSL incluído. URL customizável.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">05</div><div><div class="layer-title">CMS · Squad Hub</div><div class="layer-desc">Painel web para atualizar status dos lotes, preços, demarcações e conteúdo dos modais sem acessar código. Integração via API com o tour.</div></div></div>' +
    '</div>' +

    '<hr class="section-divider">' +

    '<div class="modal-section">' +
      '<div class="section-num">06 · Investimento</div>' +
      '<h3 class="section-title">Produção completa. Produto pronto para vender.</h3>' +
      '<table class="cost-table">' +
        '<thead><tr><th>Item</th><th>Descrição</th><th class="cost-amount">Valor</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>Captura</td><td>2 dias de captação aérea e terrestre, 7 paradas</td><td class="cost-amount">R$ 4.800</td></tr>' +
          '<tr><td>Processamento</td><td>Edição esférica, color grade, cubemap export</td><td class="cost-amount">R$ 2.400</td></tr>' +
          '<tr><td>Plataforma</td><td>Desenvolvimento do tour interativo, hotspots, modais</td><td class="cost-amount">R$ 6.800</td></tr>' +
          '<tr><td>Deploy + Domínio</td><td>Hospedagem Vercel 12 meses, SSL, DNS</td><td class="cost-amount">R$ 800</td></tr>' +
          '<tr><td>Identidade Visual</td><td>Logotipo OASIS, paleta, tipografia, UI system</td><td class="cost-amount">R$ 3.200</td></tr>' +
          '<tr><td>Fotos + Reels</td><td>Pacote fotográfico + 3 Reels entregáveis</td><td class="cost-amount">R$ 4.800</td></tr>' +
          '<tr><td>Fotolivro Digital</td><td>Book editorial 20p, otimizado para mobile</td><td class="cost-amount">R$ 2.200</td></tr>' +
        '</tbody>' +
        '<tfoot><tr class="cost-total"><td colspan="2">Total</td><td class="cost-amount">R$ 25.000</td></tr></tfoot>' +
      '</table>' +
      '<p class="section-body" style="margin-top:12px;">Condição: 50% na assinatura, 50% na entrega. Parcelamento disponível. Inclui 3 meses de suporte técnico pós-entrega.</p>' +
    '</div>' +

    '<hr class="section-divider">' +

    '<div class="modal-section">' +
      '<div class="section-num">07 · Retorno</div>' +
      '<h3 class="section-title">~2,1 lotes vendidos pagam a plataforma.</h3>' +
      '<p class="section-body">Com lotes a R$ 235.000 e comissão de 5%, cada venda gera R$ 11.750 para a incorporadora (ou para a imobiliária parceira). A plataforma se paga com a segunda venda e começa a gerar margem pura da terceira em diante.</p>' +
      '<div class="metrics-row">' +
        '<div class="metric"><div class="metric-num">R$ 11.7k</div><div class="metric-label">Comissão média por lote vendido</div></div>' +
        '<div class="metric"><div class="metric-num">2,1x</div><div class="metric-label">Lotes para payback total</div></div>' +
        '<div class="metric"><div class="metric-num">12 meses</div><div class="metric-label">Hospedagem inclusa</div></div>' +
      '</div>' +
      '<div class="intangible-row">' +
        '<div class="intangible-item"><div class="intangible-title">Diferenciação de marca</div><div class="intangible-desc">Único loteamento em Lago Corumbá IV com tour cinematográfico interativo.</div></div>' +
        '<div class="intangible-item"><div class="intangible-title">Leads pré-qualificados</div><div class="intangible-desc">Quem chega à reunião já visitou o lote virtualmente e está 60% mais inclinado a fechar.</div></div>' +
        '<div class="intangible-item"><div class="intangible-title">Ativo permanente</div><div class="intangible-desc">A plataforma continua vendendo 24/7 sem custo operacional adicional após entrega.</div></div>' +
      '</div>' +
    '</div>' +

    '<hr class="section-divider">' +

    '<div class="modal-section">' +
      '<div class="section-num">08 · Execução</div>' +
      '<h3 class="section-title">6 semanas da assinatura ao ar.</h3>' +
      '<div class="timeline-step"><div class="timeline-week">Semana 1</div><div><div class="timeline-title">Briefing + Identidade Visual</div><div class="timeline-desc">Reunião de alinhamento, definição de paradas, aprovação da paleta e logotipo OASIS.</div></div></div>' +
      '<div class="timeline-step"><div class="timeline-week">Semana 2</div><div><div class="timeline-title">Captação em Campo</div><div class="timeline-desc">2 dias de captura aérea e terrestre. Drone 8K nas 7 paradas definidas, cobertura fotográfica do empreendimento e entorno.</div></div></div>' +
      '<div class="timeline-step"><div class="timeline-week">Semana 3</div><div><div class="timeline-title">Processamento + Galeria</div><div class="timeline-desc">Edição esférica, color grade, export cubemap. Entrega da galeria fotográfica em alta resolução.</div></div></div>' +
      '<div class="timeline-step"><div class="timeline-week">Semana 4</div><div><div class="timeline-title">Plataforma + Fotolivro</div><div class="timeline-desc">Desenvolvimento do tour interativo, hotspots, modais com conteúdo. Entrega do book digital editorial.</div></div></div>' +
      '<div class="timeline-step"><div class="timeline-week">Semana 5</div><div><div class="timeline-title">Reels + QA</div><div class="timeline-desc">Pós-produção dos 3 Reels entregáveis. Teste completo do tour em iOS, Android e desktop.</div></div></div>' +
      '<div class="timeline-step"><div class="timeline-week">Semana 6</div><div><div class="timeline-title">Deploy + Treinamento</div><div class="timeline-desc">Publicação em domínio definitivo, configuração de DNS, treinamento da equipe de vendas no uso da plataforma.</div></div></div>' +
    '</div>' +

    '<div class="cta-block">' +
      '<div class="cta-title">Próximo passo</div>' +
      '<p class="cta-body">Agende uma reunião de 30 minutos com a Squad Film para definir datas de captação e assinar o contrato. Disponibilidade imediata para início na semana seguinte à assinatura.</p>' +
      '<a href="https://squadfilm.com" target="_blank" rel="noopener" class="cta-link">squadfilm.com</a>' +
    '</div>';
  }

  // ─── Autorotate helpers ───────────────────────────────────────────────────
  function startAutorotate() {
    if (!autorotating) {
      autorotating = true;
      viewer.startMovement(autorotateCtrl);
    }
  }

  function stopAutorotate() {
    if (autorotating) {
      autorotating = false;
      viewer.stopMovement();
    }
  }

  // ─── Close modal helper ───────────────────────────────────────────────────
  function closeModal() {
    closeFeatModal();
  }

  // ─── Presentation ─────────────────────────────────────────────────────────
  var PRESENTATION_SEQUENCE = [
    { sceneId: 'pano_02', duration: 6000, action: null,                    caption: 'Vista do Lago' },
    { sceneId: 'pano_02', duration: 9000, action: 'modal:conceito',        caption: 'Conceito · O tempo é o novo luxo' },
    { sceneId: 'pano_03', duration: 7000, action: 'modal:localizacao',     caption: 'Localização · Lago Corumbá IV' },
    { sceneId: 'pano_01', duration: 8000, action: 'modal:implantacao',     caption: 'Implantação · 241 lotes' },
    { sceneId: 'pano_04', duration: 8000, action: 'modal:disponibilidades', caption: 'Disponibilidade · A partir de R$ 235k' },
    { sceneId: 'pano_02', duration: 6000, action: null,                    caption: 'Aurora · Raro como o tempo' }
  ];

  var presentationState = { running: false, step: 0, timeoutId: null };

  function startPresentation() {
    if (presentationState.running) {
      stopPresentation();
      return;
    }
    presentationState.running = true;
    presentationState.step = 0;
    document.getElementById('pres-overlay').classList.add('is-active');
    document.querySelector('[data-feature="apresentacao"]').classList.add('is-running');
    runStep();
  }

  function runStep() {
    if (!presentationState.running) return;
    var step = presentationState.step;
    if (step >= PRESENTATION_SEQUENCE.length) { stopPresentation(); return; }
    var cfg = PRESENTATION_SEQUENCE[step];

    var sceneIdx = SCENES.findIndex(function(s) { return s.id === cfg.sceneId; });
    if (sceneIdx >= 0) switchScene(sceneIdx, false);

    var cap = document.getElementById('pres-caption');
    if (cap) cap.textContent = cfg.caption;

    if (cfg.action === 'rotate') startAutorotate();
    else stopAutorotate();

    if (cfg.action && cfg.action.startsWith('modal:')) {
      var f = cfg.action.split(':')[1];
      if (FEATURES[f]) {
        setTimeout(function() { openFeatModal(FEATURES[f].title, FEATURES[f].content, FEATURES[f].onOpen); }, 600);
      }
    } else {
      closeModal();
    }

    var progress = ((step + 1) / PRESENTATION_SEQUENCE.length) * 100;
    var bar = document.getElementById('pres-bar');
    if (bar) bar.style.width = progress + '%';

    presentationState.step++;
    presentationState.timeoutId = setTimeout(runStep, cfg.duration);
  }

  function stopPresentation() {
    presentationState.running = false;
    if (presentationState.timeoutId) clearTimeout(presentationState.timeoutId);
    document.getElementById('pres-overlay').classList.remove('is-active');
    var presBtn = document.querySelector('[data-feature="apresentacao"]');
    if (presBtn) presBtn.classList.remove('is-running');
    var bar = document.getElementById('pres-bar');
    if (bar) bar.style.width = '0%';
    stopAutorotate();
    closeModal();
  }

  document.getElementById('btn-pres-stop').addEventListener('click', stopPresentation);

  // ─── Feature Definitions ─────────────────────────────────────────────────
  var FEATURES = {
    home: {
      handler: function() { homeAction(); }
    },
    conceito: {
      title: 'Conceito',
      content: conceitoHTML()
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
      content: implantacaoHTML()
    },
    disponibilidades: {
      title: 'Mapa de Disponibilidades',
      content: disponibilidadesHTML()
    },
    imagens: {
      title: 'Galeria de Imagens',
      content: imagensHTML()
    },
    fotolivro: {
      title: 'Book Apresentação',
      content: fotolivroHTML()
    },
    videos: {
      title: 'Vídeos',
      content: videosHTML()
    },
    sobre: {
      title: 'Sobre · Squad Film',
      content: sobreHTML()
    },
    cenas: {
      handler: function() { toggleScenePicker(); }
    },
    apresentacao: {
      title: 'Apresentação Guiada',
      handler: function() { startPresentation(); }
    }
  };

  // ─── Reset View ───────────────────────────────────────────────────────────
  function resetView() {
    closeAllOverlays();
    var s = marzipanoScenes[currentSceneIdx];
    if (s) {
      s.view.setYaw(0);
      s.view.setPitch(-0.22);
      s.view.setFov(FOV_DEFAULT);
      basePose.yaw = 0;
      basePose.pitch = -0.30;
      currentFov = FOV_DEFAULT;
      driftStart = performance.now();
    }
  }

  // ─── Overview Mode (FlatView) ─────────────────────────────────────────────
  function buildFlatScenes() {
    SCENES.forEach(function(sceneData) {
      var levels = [{ tileSize: 2048, size: { width: 2048, height: 1024 } }];
      var geom = new Marzipano.FlatGeometry(levels);
      var view = new Marzipano.FlatView(
        { mediaAspectRatio: 2 },
        Marzipano.FlatView.limit.letterbox()
      );
      var source = Marzipano.ImageUrlSource.fromString('/img/equirect/' + sceneData.id + '.jpg');
      var scene = viewer.createScene({ source: source, geometry: geom, view: view });
      flatScenes.push({ data: sceneData, scene: scene, view: view });
    });
  }

  function toggleOverviewMode() {
    overviewMode = !overviewMode;
    var arr = overviewMode ? flatScenes : marzipanoScenes;
    if (arr[currentSceneIdx]) {
      arr[currentSceneIdx].scene.switchTo({ transitionDuration: 700 });
    }
    document.body.classList.toggle('overview-mode', overviewMode);

    // Update Home button label and icon
    var btn = document.querySelector('[data-feature="home"] .bb-label');
    if (btn) btn.textContent = overviewMode ? 'Imersivo' : 'Home';

    // Hide/show hotspots in overview
    var hotspots = document.querySelectorAll('.pano-hotspot');
    hotspots.forEach(function(h) { h.style.display = overviewMode ? 'none' : ''; });
  }

  function homeAction() {
    if (overviewMode) {
      toggleOverviewMode();
      setTimeout(function() {
        var s = marzipanoScenes[currentSceneIdx];
        if (s) {
          s.view.setYaw(0);
          s.view.setPitch(-0.30);
          s.view.setFov(FOV_DEFAULT);
          basePose.yaw = 0;
          basePose.pitch = -0.30;
          currentFov = FOV_DEFAULT;
          driftStart = performance.now();
        }
      }, 750);
    } else {
      toggleOverviewMode();
    }
  }

  // ─── Feature Modal ────────────────────────────────────────────────────────
  // ─── Scroll-reveal (IntersectionObserver) ────────────────────────────────
  function initRevealObserver() {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function(el) { io.observe(el); });
  }

  // ─── Card Parallax ────────────────────────────────────────────────────────
  function bindCardParallax() {
    document.querySelectorAll('.pillar,.dist-card,.amenity').forEach(function(card) {
      if (card._parallaxBound) return;
      card._parallaxBound = true;
      card.addEventListener('mousemove', function(e) {
        var r = card.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width - 0.5) * 2;
        var py = ((e.clientY - r.top) / r.height - 0.5) * 2;
        card.style.setProperty('--rx', (-py * 3) + 'deg');
        card.style.setProperty('--ry', (px * 3) + 'deg');
        card.style.setProperty('--tx', (px * 4) + 'px');
        card.style.setProperty('--ty', (py * 4) + 'px');
      });
      card.addEventListener('mouseleave', function() {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--tx', '0px');
        card.style.setProperty('--ty', '0px');
      });
    });
  }

  function openFeatModal(title, content, onOpen) {
    featModalTitle.textContent = title;
    featModalBody.innerHTML = content;
    featModal.hidden = false;
    featModalOpen = true;
    if (onOpen) onOpen();
    setTimeout(function() {
      initRevealObserver();
      bindCardParallax();
      if (title === 'Galeria de Imagens') bindGalleryFilters();
    }, 50);
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

      document.querySelectorAll('.bb-feat').forEach(function(b) {
        b.classList.remove('is-active');
      });

      closeScenePicker();

      if (cfg.handler) {
        cfg.handler();
        return;
      }

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

  // ─── MapLibre Localização (hiper interativo) ─────────────────────────────
  var MAP_LAYER_STYLES = {
    satellite: {
      version: 8,
      sources: { src: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri · World Imagery' } },
      layers: [{ id: 'l', type: 'raster', source: 'src' }]
    },
    streets: 'https://tiles.openfreemap.org/styles/positron',
    terrain: {
      version: 8,
      sources: { src: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri · World Topo Map' } },
      layers: [{ id: 'l', type: 'raster', source: 'src' }]
    },
    dark: 'https://tiles.openfreemap.org/styles/dark'
  };

  var MAP_POINTS = {
    aurora:   { coord: [-48.464529, -16.274689], label: 'Aurora Oasis', cat: 'Empreendimento',  meta: 'Lago Corumbá IV · Abadiânia',     primary: true },
    anapolis: { coord: [-48.953200, -16.328600], label: 'Anápolis',     cat: '36 km · 40 min',  meta: 'Trajeto BR-414 · acesso direto' },
    brasilia: { coord: [-47.929500, -15.793900], label: 'Brasília',     cat: '112 km · 1h 30',  meta: 'BR-060 + GO-330 · capital federal' },
    goiania:  { coord: [-49.253800, -16.686900], label: 'Goiânia',      cat: '96 km · 1h 20',   meta: 'BR-060 · capital de Goiás' }
  };

  var mapInstance = null;
  var mapMarkers = {};
  var mapCurrentStyle = 'satellite';
  var tourTimer = null;

  function applyMapStyle(styleId) {
    if (!mapInstance) return;
    mapInstance.setStyle(MAP_LAYER_STYLES[styleId]);
    mapCurrentStyle = styleId;
    mapInstance.once('styledata', function() { rebuildMapLines(); });
    document.querySelectorAll('.map-layer-btn').forEach(function(b) {
      b.classList.toggle('is-active', b.dataset.style === styleId);
    });
  }

  function rebuildMapLines() {
    if (!mapInstance) return;
    if (mapInstance.getSource('connections')) return;
    var lines = ['anapolis', 'brasilia', 'goiania'].map(function(id) {
      return { type: 'Feature', properties: { id: id }, geometry: { type: 'LineString', coordinates: [MAP_POINTS.aurora.coord, MAP_POINTS[id].coord] } };
    });
    mapInstance.addSource('connections', { type: 'geojson', data: { type: 'FeatureCollection', features: lines } });
    mapInstance.addLayer({ id: 'conn-line', type: 'line', source: 'connections',
      paint: { 'line-color': '#C9A84C', 'line-width': 1.4, 'line-dasharray': [3, 2], 'line-opacity': 0.85 }
    });
  }

  function buildMapMarker(point, key) {
    var el = document.createElement('div');
    el.className = 'map-marker' + (point.primary ? ' is-primary' : '');
    el.innerHTML = '<div class="pin"></div>' + (point.primary ? '<div class="ring"></div>' : '');

    var popup = new maplibregl.Popup({ offset: 16, closeButton: false, anchor: 'bottom' })
      .setHTML('<div class="map-popup"><div class="mp-cat">' + point.cat + '</div><div class="mp-title">' + point.label + '</div><div class="mp-meta">' + point.meta + '</div></div>');

    var m = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(point.coord)
      .setPopup(popup)
      .addTo(mapInstance);

    el.addEventListener('click', function() { flyToMapPoint(key); });
    return m;
  }

  function flyToMapPoint(key) {
    if (!mapInstance) return;
    if (key === 'tour') { startMapTour(); return; }
    if (key === 'overview') { mapOverview(); return; }
    var p = MAP_POINTS[key];
    if (!p) return;
    mapInstance.flyTo({
      center: p.coord, zoom: key === 'aurora' ? 15 : 12,
      bearing: Math.random() * 30 - 15, pitch: 45,
      speed: 0.8, curve: 1.6, essential: true
    });
    setTimeout(function() {
      var mk = mapMarkers[key];
      if (mk && !mk.getPopup().isOpen()) mk.togglePopup();
    }, 1400);
    document.querySelectorAll('.mc-btn').forEach(function(b) {
      b.classList.toggle('is-active', b.dataset.fly === key);
    });
  }

  function mapOverview() {
    if (!mapInstance) return;
    var bounds = new maplibregl.LngLatBounds();
    Object.values(MAP_POINTS).forEach(function(p) { bounds.extend(p.coord); });
    mapInstance.fitBounds(bounds, { padding: 80, duration: 1400, pitch: 0, bearing: 0 });
    document.querySelectorAll('.mc-btn').forEach(function(b) {
      b.classList.toggle('is-active', b.dataset.fly === 'overview');
    });
    if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; }
  }

  function startMapTour() {
    var tourBtn = document.querySelector('[data-fly="tour"]');
    if (tourTimer) {
      clearTimeout(tourTimer);
      tourTimer = null;
      if (tourBtn) tourBtn.classList.remove('is-active');
      return;
    }
    if (tourBtn) tourBtn.classList.add('is-active');
    var seq = ['aurora', 'anapolis', 'brasilia', 'goiania', 'aurora'];
    var i = 0;
    var step = function() {
      if (i >= seq.length) { tourTimer = null; if (tourBtn) tourBtn.classList.remove('is-active'); return; }
      flyToMapPoint(seq[i++]);
      tourTimer = setTimeout(step, 4200);
    };
    step();
  }

  function initLocationMap() {
    if (!window.maplibregl) return;
    var el = document.getElementById('map');
    if (!el || el._inited) return;
    el._inited = true;

    mapInstance = new maplibregl.Map({
      container: 'map',
      style: MAP_LAYER_STYLES.satellite,
      center: MAP_POINTS.aurora.coord,
      zoom: 5,
      pitch: 0,
      bearing: 0,
      attributionControl: false
    });
    window._mapInstance = mapInstance;

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-left');
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    mapInstance.on('load', function() {
      rebuildMapLines();
      Object.entries(MAP_POINTS).forEach(function(entry) {
        mapMarkers[entry[0]] = buildMapMarker(entry[1], entry[0]);
      });

      // Cinematic arrival
      setTimeout(function() {
        var bounds = new maplibregl.LngLatBounds();
        Object.values(MAP_POINTS).forEach(function(p) { bounds.extend(p.coord); });
        mapInstance.fitBounds(bounds, { padding: 80, duration: 1800, pitch: 35 });
      }, 400);
      setTimeout(function() {
        mapInstance.flyTo({ center: MAP_POINTS.aurora.coord, zoom: 14, pitch: 55, bearing: -15, speed: 0.6, curve: 1.4 });
        setTimeout(function() {
          var mk = mapMarkers['aurora'];
          if (mk && !mk.getPopup().isOpen()) mk.togglePopup();
        }, 1600);
      }, 2400);
    });

    // Layer switcher bindings
    document.querySelectorAll('.map-layer-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { applyMapStyle(btn.dataset.style); });
    });
    // City fly bindings
    document.querySelectorAll('.mc-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { flyToMapPoint(btn.dataset.fly); });
    });
  }

  // ─── Theme Toggle ────────────────────────────────────────────────────────
  document.getElementById('btn-theme').addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'light' ? 'dark' : 'light');
  });

  // ─── Admin Event Listeners ────────────────────────────────────────────────
  btnAdmin.addEventListener('click', openAdmin);

  var adminExitBtn = document.getElementById('btn-admin-exit');
  if (adminExitBtn) adminExitBtn.addEventListener('click', exitAdmin);

  var adminPanelCloseBtn = document.getElementById('btn-admin-panel-close');
  if (adminPanelCloseBtn) adminPanelCloseBtn.addEventListener('click', closeAdminPanel);

  document.querySelectorAll('.admin-btn[data-admin-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = btn.dataset.adminTab;
      if (currentAdminTab === tab && !document.getElementById('admin-panel').hidden) {
        closeAdminPanel();
        currentAdminTab = null;
        document.querySelectorAll('.admin-btn[data-admin-tab]').forEach(function(b) { b.classList.remove('is-active'); });
      } else {
        openAdminPanel(tab);
      }
    });
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
      targetPitch: -0.18,
      interruptOnAction: true
    });

    buildScenes();
    buildFlatScenes();
    switchScene(1, true);
    hideLoading();
    initDriftLoop();
    initTouchGestures();
    detectFormat();
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

      var initPose = (sceneData.id === 'pano_02')
        ? { yaw: 0, pitch: -0.05, fov: 130 * Math.PI / 180 }
        : { yaw: 0, pitch: -0.30, fov: FOV_DEFAULT };
      var view = new Marzipano.RectilinearView(
        initPose,
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

    // Switch in the correct mode's array
    var arr = overviewMode ? flatScenes : marzipanoScenes;
    var s = arr[idx];

    if (!s) return;

    try { if (!overviewMode) currentFov = s.view.fov(); } catch(e) {}

    if (immediate) {
      s.scene.switchTo({ transitionDuration: 0 });
    } else {
      s.scene.switchTo({ transitionDuration: 800 });
    }

    var s_data = SCENES[idx];
    if (s_data && s_data.id === 'pano_02') {
      var s_mz = marzipanoScenes[idx];
      if (s_mz) {
        s_mz.view.setYaw(0);
        s_mz.view.setPitch(-0.05);
        s_mz.view.setFov(130 * Math.PI / 180);
        currentFov = 130 * Math.PI / 180;
      }
      basePose.yaw = 0;
      basePose.pitch = -0.05;
    } else {
      basePose.yaw = 0;
      basePose.pitch = -0.30;
    }
    driftStart = performance.now();
    userInteracting = false;

    var mzS = marzipanoScenes[idx];
    hdrNumber.textContent = mzS ? mzS.data.number : '';
    hdrLabel.textContent = mzS ? mzS.data.label : '';

    updateScenePickerActive();
    updateSceneMinimap();
    setTimeout(updateRegionOverlay, 50);
    var sceneData = SCENES[idx];
    if (sceneData && mzS) {
      setTimeout(function() { buildHotspotsForScene(sceneData.id, mzS.scene); }, 100);
    }
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

  // ─── Drift Loop (replaces mouse parallax) ────────────────────────────────
  function initDriftLoop() {
    var container = viewerEl;
    ['pointerdown', 'wheel', 'touchstart'].forEach(function(ev) {
      container.addEventListener(ev, function() { userInteracting = true; }, { passive: true });
    });
    ['pointerup', 'touchend', 'touchcancel'].forEach(function(ev) {
      container.addEventListener(ev, function() {
        setTimeout(function() {
          var s = marzipanoScenes[currentSceneIdx];
          if (s) {
            basePose.yaw = s.view.yaw();
            basePose.pitch = s.view.pitch();
          }
          driftStart = performance.now();
          userInteracting = false;
        }, 250);
      }, { passive: true });
    });
    requestAnimationFrame(driftTick);
  }

  function driftTick() {
    if (!userInteracting && viewer && marzipanoScenes.length > 0) {
      var t = performance.now() - driftStart;
      var dy = Math.sin(t / DRIFT_PERIOD_YAW * Math.PI * 2) * DRIFT_AMPLITUDE;
      var dp = Math.sin(t / DRIFT_PERIOD_PITCH * Math.PI * 2 + Math.PI / 3) * DRIFT_AMPLITUDE * 0.6;
      var s = marzipanoScenes[currentSceneIdx];
      if (s && !autorotating) {
        try {
          s.view.setYaw(basePose.yaw + dy);
          s.view.setPitch(basePose.pitch + dp);
        } catch(e) {}
      }
    }
    requestAnimationFrame(driftTick);
  }

  // ─── Zoom Controls (via scroll/pinch — no UI) ─────────────────────────────
  function setFov(fovRad) {
    fovRad = Math.max(FOV_MIN, Math.min(FOV_MAX, fovRad));
    currentFov = fovRad;
    var s = marzipanoScenes[currentSceneIdx];
    if (s) s.view.setFov(fovRad);
  }

  function onViewChange() {
    var s = marzipanoScenes[currentSceneIdx];
    if (!s) return;
    try {
      var fov = s.view.fov();
      currentFov = fov;
    } catch(e) {}
    updateRegionOverlay();
  }

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
      // Drift loop is always on — toggle is kept for UI compatibility
      return;
    }
    if (key === 'dof') { return; } // DoF removed
    if (key === 'hotspots') {
      hotspotsVisible = nowActive;
      var sceneData = SCENES[currentSceneIdx];
      var mzS = marzipanoScenes[currentSceneIdx];
      if (sceneData && mzS) buildHotspotsForScene(sceneData.id, mzS.scene);
      return;
    }

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
      if (presentationState.running) { stopPresentation(); return; }
      if (drawingState.active) { cleanupDrawing(); openAdminPanel('manual'); return; }
      if (featModalOpen) { closeFeatModal(); return; }
      if (scenePkrOpen)  { closeScenePicker(); return; }
      if (!infoModal.hidden) { infoModal.hidden = true; return; }
      if (menuOpen) { closeMenu(); return; }
    }
    if (e.key === 'Enter' && drawingState.active) { finishDrawing(); return; }
    if (e.key === 'ArrowLeft')  { switchScene(currentSceneIdx - 1, false); return; }
    if (e.key === 'ArrowRight') { switchScene(currentSceneIdx + 1, false); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
    if (e.key === '+' || e.key === '=') { setFov(currentFov - FOV_STEP); return; }
    if (e.key === '-' || e.key === '_') { setFov(currentFov + FOV_STEP); return; }
    if (e.key === 'm' || e.key === 'M') { menuOpen ? closeMenu() : openMenu(); return; }
  });

  // ─── Region Overlay ───────────────────────────────────────────────────────
  function updateRegionOverlay() {
    if (!viewer) return;
    var svg = regionOverlay;
    // Preserve drawing preview
    var previewEl = document.getElementById('drawing-preview');
    while (svg.firstChild) {
      if (svg.firstChild === previewEl) { svg.appendChild(previewEl); break; }
      svg.removeChild(svg.firstChild);
    }

    var w = window.innerWidth;
    var h = window.innerHeight;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    if (!regionVisibility.regions) return;

    var scene = marzipanoScenes[currentSceneIdx];
    if (!scene) return;
    var view = scene.view;

    // Merge built-in + localStorage regions
    var allRegions = REGIONS.concat(loadRegions());

    allRegions.forEach(function(region) {
      if (!regionVisibility[region.id]) return;

      var vertices = region.vertices || region.polygon;
      if (!vertices || vertices.length < 3) return;

      // For built-in regions, check appearsIn
      if (region.appearsIn && region.appearsIn.indexOf(SCENES[currentSceneIdx].id) < 0) return;

      var pts = vertices.map(function(v) {
        return view.coordinatesToScreen({ yaw: v.yaw, pitch: v.pitch });
      });
      var validPts = pts.filter(function(p) { return p !== null; });
      if (validPts.length < 3) return;

      var ptsStr = validPts.map(function(p) { return p.x + ',' + p.y; }).join(' ');

      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', ptsStr);
      poly.setAttribute('fill', region.fillColor || 'rgba(201,168,76,0.18)');
      poly.setAttribute('stroke', region.strokeColor || region.color || '#C9A84C');
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

  // ─── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(function() { t.classList.remove('is-visible'); }, 2400);
  }

  // ─── Share Button ─────────────────────────────────────────────────────────
  var btnShare = document.getElementById('btn-share');
  if (btnShare) {
    btnShare.addEventListener('click', function() {
      var url = location.href;
      var title = 'Aurora Oasis · Tour Virtual';
      var text = 'Cinema esférico interativo · Lago Corumbá IV · Abadiânia, GO';
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function() {});
      } else {
        navigator.clipboard.writeText(url).then(function() {
          showToast('Link copiado pra área de transferência');
        }).catch(function() {
          showToast('Link copiado pra área de transferência');
        });
      }
    });
  }

  // ─── Scene Mini-map ───────────────────────────────────────────────────────
  function updateSceneMinimap() {
    var sceneId = SCENES[currentSceneIdx] ? SCENES[currentSceneIdx].id : null;
    document.querySelectorAll('.sm-thumb').forEach(function(btn) {
      btn.classList.toggle('is-active', btn.dataset.scene === sceneId);
    });
  }

  document.querySelectorAll('.sm-thumb').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var sceneId = btn.dataset.scene;
      var idx = SCENES.findIndex(function(s) { return s.id === sceneId; });
      if (idx >= 0) switchScene(idx, false);
    });
  });

  // ─── Panorama Hotspots ────────────────────────────────────────────────────
  var SCENE_HOTSPOTS = {
    pano_01: [
      { yaw:  0.1,  pitch: -0.05, label: 'Lago Corumbá IV', desc: 'Espelho d\'água que delimita o empreendimento ao norte e leste.' },
      { yaw: -0.5,  pitch:  0.1,  label: 'Quadras Aurora',   desc: 'Setor principal do loteamento.' },
      { yaw:  0.8,  pitch:  0.05, label: 'Mata Cerrado',     desc: 'Reserva nativa preservada.' }
    ],
    pano_02: [
      { yaw:  0,    pitch: -0.05, label: 'Vista frente lago', desc: 'O lago como vizinho permanente. Frente d\'água que pertence ao empreendimento.' }
    ],
    pano_03: [
      { yaw:  0,    pitch: -0.08, label: 'Margem do lago',   desc: 'Frente d\'água ininterrupta de aproximadamente 1,2 km.' }
    ],
    pano_04: [
      { yaw:  0.2,  pitch: -0.1,  label: 'Pôr do sol',       desc: 'Hora dourada característica do cerrado goiano.' }
    ]
  };

  var hotspotsVisible = true;

  function buildHotspotsForScene(sceneId, mzScene) {
    if (!mzScene || !SCENE_HOTSPOTS[sceneId]) return;
    var container = mzScene.hotspotContainer();
    container.listHotspots().forEach(function(h) { container.destroyHotspot(h); });
    if (!hotspotsVisible) return;

    SCENE_HOTSPOTS[sceneId].forEach(function(h) {
      var el = document.createElement('div');
      el.className = 'pano-hotspot';
      el.innerHTML =
        '<div class="ph-dot"></div>' +
        '<div class="ph-card">' +
          '<div class="ph-cat">Ponto de interesse</div>' +
          '<div class="ph-label">' + h.label + '</div>' +
          '<div class="ph-desc">' + h.desc + '</div>' +
        '</div>';
      container.createHotspot(el, { yaw: h.yaw, pitch: h.pitch });
    });
  }

  // ─── Touch Gestures ───────────────────────────────────────────────────────
  function initTouchGestures() {
    var container = viewerEl;

    // Double-tap zoom in/out
    var lastTapTime = 0;
    container.addEventListener('touchend', function(e) {
      var now = Date.now();
      if (now - lastTapTime < 300 && e.touches.length === 0) {
        var s = marzipanoScenes[currentSceneIdx];
        if (!s) return;
        var curFov = s.view.fov();
        var midFov = (FOV_MIN + FOV_DEFAULT) / 2;
        s.view.setFov(curFov > midFov ? FOV_MIN + 0.3 : FOV_DEFAULT);
      }
      lastTapTime = now;
    }, { passive: true });

    // 2-finger swipe horizontal = change scene
    var twoFingerStart = null;
    container.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        twoFingerStart = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          time: Date.now()
        };
      }
    }, { passive: true });
    container.addEventListener('touchend', function(e) {
      if (!twoFingerStart) return;
      if (e.changedTouches.length === 0) { twoFingerStart = null; return; }
      var t = e.changedTouches[0];
      var dx = t.clientX - twoFingerStart.x;
      var dy = t.clientY - twoFingerStart.y;
      var dt = Date.now() - twoFingerStart.time;
      if (dt < 600 && Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) switchScene(currentSceneIdx - 1, false);
        else switchScene(currentSceneIdx + 1, false);
      }
      twoFingerStart = null;
    }, { passive: true });

    // Dragging class for user-select disable
    container.addEventListener('pointerdown', function() {
      document.body.classList.add('dragging');
    });
    container.addEventListener('pointerup', function() {
      document.body.classList.remove('dragging');
    });
    container.addEventListener('pointercancel', function() {
      document.body.classList.remove('dragging');
    });
  }

  // ─── Format Detection ─────────────────────────────────────────────────────
  function detectFormat() {
    var w = window.innerWidth, h = window.innerHeight;
    document.body.classList.toggle('totem-vertical', h > w * 1.5 && w >= 768);
    document.body.classList.toggle('totem-horizontal', w > h * 1.7 && h <= 900 && w >= 1280);
    document.body.classList.toggle('is-mobile-portrait', w <= 480);
  }
  window.addEventListener('resize', detectFormat);
  window.addEventListener('orientationchange', detectFormat);

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() {
      initViewer();
      attachViewChangeListeners();
    });
  } else {
    window.addEventListener('load', function() {
      initViewer();
      attachViewChangeListeners();
    });
  }

})();
