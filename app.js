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
    return '<div class="admin-section">' +
        '<div class="admin-section-title">Detecção automática de áreas</div>' +
        '<p style="font-size:12px;color:var(--ink-soft);line-height:1.6;margin-bottom:12px;">A IA analisa a cena atual do tour e propõe demarcações de áreas distintas (lote, lago, mata, edificação).</p>' +
        '<p style="font-size:11px;color:var(--ink-muted);line-height:1.5;">Detecção automática via Google Gemini Vision.<br>Modelo: gemini-2.0-flash (free tier 15 req/min).</p>' +
      '</div>' +
      '<div class="admin-divider"></div>' +
      '<div class="admin-section">' +
        '<button class="admin-action primary" id="btn-detect-ia">Detectar regiões na cena atual</button>' +
        '<div id="admin-ia-status" style="margin-top:12px;font-size:11px;color:var(--ink-muted);line-height:1.5;"></div>' +
      '</div>' +
      '<div class="admin-divider"></div>' +
      '<div class="admin-note" style="font-size:10px;">Setup: configure GEMINI_API_KEY no Vercel Dashboard.<br>Token gratuito: aistudio.google.com/apikey</div>';
  }

  function bindIAPanel() {
    var detectBtn = document.getElementById('btn-detect-ia');
    if (detectBtn) {
      detectBtn.addEventListener('click', detectIA);
    }
  }

  // ─── detectIA — integração Google Gemini Vision via /api/segment (síncrono) ─
  async function detectIA() {
    var statusEl = document.getElementById('admin-ia-status');
    var setStatus = function(msg) { if (statusEl) statusEl.textContent = msg; };

    setStatus('Capturando cena atual...');
    var dataUrl = await captureSnapshot();
    if (!dataUrl) { setStatus('Erro: não foi possível capturar snapshot.'); return; }

    setStatus('Enviando pra IA Gemini...');
    var res;
    try {
      res = await fetch('/api/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          prompt: 'lotes de loteamento, lago, áreas de mata, edificações, vias'
        })
      });
    } catch (e) {
      setStatus('Erro de rede: ' + e.message);
      return;
    }

    var data = await res.json();
    if (!res.ok) {
      setStatus('Erro do servidor: ' + (data.error || res.status) + (data.details ? ' · ' + JSON.stringify(data.details).slice(0, 240) : ''));
      return;
    }

    var detections = data.detections || [];
    if (detections.length === 0) {
      setStatus('IA não detectou regiões. Tente uma cena com mais elementos.');
      return;
    }

    setStatus('Importando ' + detections.length + ' regiões detectadas...');
    var added = importIAResults(detections);
    setStatus('IA: ' + added + ' região(ões) adicionada(s). Ajuste manualmente se necessário.');
    if (typeof refreshRegionsList === 'function') refreshRegionsList();
    if (typeof rebuildRegionsOverlay === 'function') rebuildRegionsOverlay();
  }

  // Captura snapshot do viewer Marzipano como data URL JPEG
  async function captureSnapshot() {
    try {
      var stage = viewer && viewer.stage ? viewer.stage() : null;
      var dom = stage && stage.domElement ? stage.domElement() : null;
      var canvas = dom && dom.querySelector ? dom.querySelector('canvas') : null;
      if (!canvas && dom && dom.tagName === 'CANVAS') canvas = dom;

      if (canvas) {
        return canvas.toDataURL('image/jpeg', 0.85);
      }

      // Fallback: busca face frontal do panorama atual via fetch
      var s = SCENES[currentSceneIdx];
      if (!s) return null;
      var url = '/media/panorama_' + s.id + '_0/f/0/0_0.jpg';
      var response = await fetch(url);
      if (!response.ok) return null;
      var blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch (e) {
      return null;
    }
  }

  function blobToDataUrl(blob) {
    return new Promise(function(resolve) {
      var fr = new FileReader();
      fr.onloadend = function() { resolve(fr.result); };
      fr.readAsDataURL(blob);
    });
  }

  // Importa detecções Gemini como regiões no painel de demarcações
  function importIAResults(detections) {
    var regions = (typeof loadRegions === 'function') ? loadRegions() : [];
    var added = 0;

    detections.forEach(function(det, i) {
      if (!det.box_2d || det.box_2d.length !== 4) return;

      var vertices = convertGeminiBoxToYawPitch(det.box_2d);
      if (!vertices || vertices.length === 0) return;

      regions.push({
        id: 'ia_' + Date.now() + '_' + i,
        label: det.label || ('IA · região ' + (i + 1)),
        color: '#C9A84C',
        vertices: vertices,
        createdAt: new Date().toISOString(),
        source: 'gemini',
        score: det.score || null
      });
      added++;
    });

    if (typeof saveRegions === 'function') saveRegions(regions);
    return added;
  }

  // Converte bounding box Gemini [ymin, xmin, ymax, xmax] (escala 0-1000) para yaw/pitch via Marzipano
  function convertGeminiBoxToYawPitch(box) {
    // box = [ymin, xmin, ymax, xmax] em escala 0-1000
    var s = marzipanoScenes[currentSceneIdx];
    if (!s || !s.view) return [];

    var canvas = document.querySelector('#viewer canvas');
    if (!canvas) return [];

    var w = canvas.clientWidth;
    var h = canvas.clientHeight;

    // Normalizar 0-1000 → pixels do canvas
    var x0 = (box[1] / 1000) * w;
    var y0 = (box[0] / 1000) * h;
    var x1 = (box[3] / 1000) * w;
    var y1 = (box[2] / 1000) * h;

    var corners = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 }
    ];

    return corners.map(function(pt) {
      try {
        return s.view.screenToCoordinates(pt);
      } catch (e) {
        return { yaw: 0, pitch: 0 };
      }
    });
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
  // Polígono do empreendimento Aurora Oasis na cena 02 (península)
  // Vértices em (yaw, pitch) · ancorado no hotspot validado yaw=+0.03, pitch=+0.15
  var REGIONS = [{
    id: 'aurora_oasis_pano02',
    label: 'AURORA OASIS',
    appearsIn: ['pano_02'],
    fillColor: 'rgba(201,168,76,0.28)',
    strokeColor: '#C9A84C',
    vertices: [
      { yaw: -0.10, pitch: +0.40 },
      { yaw: +0.00, pitch: +0.38 },
      { yaw: +0.10, pitch: +0.40 },
      { yaw: +0.16, pitch: +0.45 },
      { yaw: +0.18, pitch: +0.52 },
      { yaw: +0.13, pitch: +0.58 },
      { yaw: +0.05, pitch: +0.60 },
      { yaw: -0.04, pitch: +0.59 },
      { yaw: -0.11, pitch: +0.55 },
      { yaw: -0.13, pitch: +0.48 },
      { yaw: -0.12, pitch: +0.43 }
    ]
  }];

  // ─── State ────────────────────────────────────────────────────────────────
  var currentSceneIdx = 1;
  var viewer = null;
  var marzipanoScenes = [];
  var flatScenes = [];
  var overviewMode = false;
  var autorotating = false;
  var autorotateCtrl = null;
  var regionVisibility = { regions: true, aurora_oasis: true, aurora_lago: true, aurora_oasis_pano02: true };
  var menuOpen = false;
  var scenePkrOpen = false;
  var featModalOpen = false;

  // Drift loop state — cinematic 3D parallax (yaw, pitch, FOV breathing)
  var DRIFT_AMPLITUDE = 0.022;          // ~1.3° yaw drift
  var DRIFT_PERIOD_YAW = 32000;         // 32s base period (slow)
  var DRIFT_PERIOD_YAW_2 = 11000;       // 2nd harmonic for organic feel
  var DRIFT_PERIOD_PITCH = 22000;
  var DRIFT_PERIOD_FOV = 16000;         // FOV breathing — sense of breathing/depth
  var DRIFT_FOV_AMPLITUDE = 0.018;      // ±1.0° FOV
  var driftStart = performance.now();
  var basePose = { yaw: 0, pitch: -0.05, fov: null };
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
        '<p class="section-body">Aurora Oasis fica às margens do Lago Corumbá IV, em Abadiânia, Goiás. 10 minutos de estrada de chão do centro. Refúgio sem isolamento — perto o suficiente para integrar, distante o suficiente para acolher.</p>',
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
            '<div class="dist-km">1h</div>',
            '<div class="dist-time">de Anápolis</div>',
          '</article>',
          '<article class="dist-card reveal" data-reveal>',
            '<div class="dist-city">Goiânia</div>',
            '<div class="dist-meta">GO</div>',
            '<div class="dist-km">1h40</div>',
            '<div class="dist-time">de Goiânia</div>',
          '</article>',
          '<article class="dist-card reveal" data-reveal>',
            '<div class="dist-city">Brasília</div>',
            '<div class="dist-meta">DF</div>',
            '<div class="dist-km">2h20</div>',
            '<div class="dist-time">de Brasília</div>',
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
      '<p class="section-lead" data-reveal-words>O luxo de viver no tempo certo.</p>' +
      '<hr class="section-divider">' +
    '</div>' +

    '<div class="modal-section">' +
      '<div class="section-num">A ideia</div>' +
      '<h3 class="section-title">Um lugar convida a parar.</h3>' +
      '<p class="section-body" data-reveal-words>Aqui o tempo não se mede em ponteiros, mas em pausas. Em silêncios. Aurora Oasis é um novo ritmo. Um convite ao que realmente importa.</p>' +
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
      '<p class="section-body">Urbanismo de baixa densidade, natureza como protagonista e privacidade real com vistas abertas. Programa arquitetônico assinado pela <strong>FAAU · Flávio Aleixo</strong>.</p>' +
    '</div>' +

    '<div class="modal-section">' +
      '<div class="section-num">Lotes</div>' +
      '<div class="metrics-row">' +
        '<div class="metric reveal" data-reveal><div class="metric-num">500</div><div class="metric-label">m² — a partir de</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">FAAU</div><div class="metric-label">Projeto arquitetônico</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">4km</div><div class="metric-label">Calçadão à beira lago</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Amenidades</div>' +
      '<h3 class="section-title">Estrutura completa, sem ostentação.</h3>' +
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
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-marina"><path d="M3 17h18M12 3v10M6 13l6-4 6 4" stroke="url(#aurora-gold-stroke)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="2" y="17" width="20" height="2.5" rx="0.5" fill="url(#aurora-gold-grad)" opacity="0.4"/><path d="M5 13H3l3-6h12l3 6H5z" fill="url(#aurora-gold-grad)" opacity="0.3"/></svg></span><div class="amenity-name">Marina e praia particular</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-pool"><circle cx="17.5" cy="6" r="2.4" fill="url(#aurora-gold-grad)"/><path d="M2 14c2 0 2-1.6 4-1.6S8 14 10 14s2-1.6 4-1.6S16 14 18 14s2-1.6 4-1.6" stroke="url(#aurora-gold-stroke)" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M2 18c2 0 2-1.6 4-1.6S8 18 10 18s2-1.6 4-1.6S16 18 18 18s2-1.6 4-1.6" stroke="url(#aurora-gold-stroke)" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7"/><circle cx="17.5" cy="6" r="1" fill="rgba(255,255,255,0.5)"/></svg></span><div class="amenity-name">Piscina voltada para o lago</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-spa"><path d="M12 4c-2 3-2 5 0 7c2-2 2-4 0-7z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5"/><path d="M5 9c0 3 2 4 5 4c0-2-1-4-5-4z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5" opacity="0.85"/><path d="M19 9c0 3-2 4-5 4c0-2 1-4 5-4z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5" opacity="0.85"/><path d="M3 13c2 4 6 5 9 5s7-1 9-5c-3 1-5 0-9 0s-6 1-9 0z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><ellipse cx="12" cy="6.5" rx="0.5" ry="0.8" fill="rgba(255,255,255,0.5)"/></svg></span><div class="amenity-name">Spa e fitness center</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-wine"><path d="M7 3h10c0 4.5-1.5 8-5 8s-5-3.5-5-8z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><line x1="12" y1="11" x2="12" y2="19" stroke="url(#aurora-gold-stroke)" stroke-width="1.4" stroke-linecap="round"/><line x1="8" y1="20.5" x2="16" y2="20.5" stroke="url(#aurora-gold-stroke)" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="10.5" cy="6" rx="1.2" ry="1.6" fill="rgba(255,255,255,0.45)"/></svg></span><div class="amenity-name">Wine bar</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-rest"><circle cx="12" cy="13" r="6" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.5"/><path d="M5 3v6c0 0.8 0.5 1.4 1.2 1.4M7.6 3v6c0 0.8-0.5 1.4-1.2 1.4M6.4 10.4V18" stroke="url(#aurora-gold-stroke)" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M17 3c1.5 0 2.5 1 2.5 3v3c0 1-0.5 1.6-1.2 1.8V18" stroke="url(#aurora-gold-stroke)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg></span><div class="amenity-name">Restaurante com vista</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-gym"><rect x="2" y="9.5" width="3" height="5" rx="0.6" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><rect x="19" y="9.5" width="3" height="5" rx="0.6" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><rect x="5" y="10.5" width="2" height="3" fill="url(#aurora-gold-grad)"/><rect x="17" y="10.5" width="2" height="3" fill="url(#aurora-gold-grad)"/><rect x="7" y="11.3" width="10" height="1.4" rx="0.4" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.5"/></svg></span><div class="amenity-name">Academia com horizonte aberto</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-track"><path d="M3 12a5 5 0 0 1 5-5h8a5 5 0 0 1 0 10H8a5 5 0 0 1-5-5z" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.7"/><path d="M5.5 12a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 0 5H8a2.5 2.5 0 0 1-2.5-2.5z" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/></svg></span><div class="amenity-name">Calçadão de aproximadamente 4 km</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon"><svg viewBox="0 0 24 24" class="amen-icon ai-security"><rect x="5" y="3" width="14" height="14" rx="1.5" fill="url(#aurora-gold-grad)" stroke="url(#aurora-gold-stroke)" stroke-width="0.6"/><path d="M12 7v4M12 13v.5" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round"/><path d="M8 19h8M9 21h6" stroke="url(#aurora-gold-stroke)" stroke-width="1" stroke-linecap="round" opacity="0.6"/></svg></span><div class="amenity-name">Portaria e segurança 24h</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Arquitetura</div>' +
      '<h3 class="section-title">Assinada pela FAAU.</h3>' +
      '<p class="section-body">Flávio Aleixo conduz o desenho urbanístico e arquitetônico do Aurora Oasis. Materiais naturais, volumetria que respeita a topografia e a integração com o cerrado nativo são princípios não-negociáveis do projeto.</p>' +
    '</div>';
  }

  function disponibilidadesHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Lotes</div>' +
      '<h3 class="section-title">Lotes amplos a partir de 500 m².</h3>' +
      '<p class="section-body" data-reveal-words>Tipologias com vista, frente lago e mata. Urbanismo de baixa densidade com estatuto e governança fortes para manter o conceito do empreendimento íntegro ao longo do tempo.</p>' +
      '<div class="metrics-row">' +
        '<div class="metric reveal" data-reveal><div class="metric-num">500</div><div class="metric-label">m² — a partir de</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">Lago</div><div class="metric-label">Frente d\'água disponível</div></div>' +
        '<div class="metric reveal" data-reveal><div class="metric-num">FAAU</div><div class="metric-label">Arquitetura assinada</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Disponibilidade</div>' +
      '<div class="lote-card reveal" data-reveal>' +
        '<div class="lote-header">' +
          '<span class="lote-mini">Tipologias disponíveis</span>' +
          '<span class="lote-status">Sob consulta</span>' +
        '</div>' +
        '<h4 class="lote-title">Vista lago · Frente d\'água · Mata cerrado</h4>' +
        '<div class="lote-grid">' +
          '<div><div class="lote-mini">Área</div><div class="lote-val">A partir de 500 m²</div></div>' +
          '<div><div class="lote-mini">Localização</div><div class="lote-val">Lago Corumbá IV</div></div>' +
          '<div><div class="lote-mini">Valores</div><div class="lote-val">Sob consulta</div></div>' +
          '<div><div class="lote-mini">Arquitetura</div><div class="lote-val">FAAU · Flávio Aleixo</div></div>' +
        '</div>' +
        '<div class="lote-actions">' +
          '<a href="https://wa.me/5562995661461?text=Ol%C3%A1%2C%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20os%20lotes%20do%20Aurora%20Oasis" target="_blank" rel="noopener" class="modal-link">Consultar disponibilidade</a>' +
          '<a href="https://wa.me/5562995661461?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20visita%20ao%20Aurora%20Oasis" target="_blank" rel="noopener" class="modal-link">Agendar visita</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  var GALLERY_PHOTOS = [
    { src: 'img/gallery/oficial/aurora-01.jpg', cat: 'arquitetura', label: 'Portaria · Aurora Oasis',        tag: 'Arquitetura' },
    { src: 'img/gallery/oficial/aurora-02.jpg', cat: 'lifestyle',   label: 'Piscina com deck',               tag: 'Lifestyle' },
    { src: 'img/gallery/oficial/aurora-03.jpg', cat: 'lago',        label: 'Calçadão beira lago',            tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-04.jpg', cat: 'vista',       label: 'Marina e praia particular',      tag: 'Vistas' },
    { src: 'img/gallery/oficial/aurora-05.jpg', cat: 'lifestyle',   label: 'Espaço aquático kids',           tag: 'Lifestyle' },
    { src: 'img/gallery/oficial/aurora-06.jpg', cat: 'arquitetura', label: 'Escadaria e volumetria',         tag: 'Arquitetura' },
    { src: 'img/gallery/oficial/aurora-07.jpg', cat: 'lago',        label: 'Playground frente lago',         tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-08.jpg', cat: 'lifestyle',   label: 'Praça e espelho d\'água',        tag: 'Lifestyle' },
    { src: 'img/gallery/oficial/aurora-09.jpg', cat: 'arquitetura', label: 'Pórtico de entrada',             tag: 'Arquitetura' },
    { src: 'img/gallery/oficial/aurora-10.jpg', cat: 'lifestyle',   label: 'Restaurante com vista ao lago',  tag: 'Lifestyle' },
    { src: 'img/gallery/oficial/aurora-11.jpg', cat: 'lago',        label: 'Orla e palmeiras',               tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-12.jpg', cat: 'arquitetura', label: 'Render arquitetônico',           tag: 'Arquitetura' },
    { src: 'img/gallery/oficial/aurora-13.jpg', cat: 'vista',       label: 'Arara sobre o cerrado',          tag: 'Vistas' },
    { src: 'img/gallery/oficial/aurora-14.jpg', cat: 'lago',        label: 'Pôr do sol · Lago Corumbá IV',  tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-15.jpg', cat: 'lago',        label: 'Aurora · Onde o tempo mora',     tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-16.jpg', cat: 'lifestyle',   label: 'Quadra de tênis com vista lago', tag: 'Lifestyle' },
    { src: 'img/gallery/oficial/aurora-17.jpg', cat: 'lago',        label: 'Piscina infinity · Vista lago',  tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-18.jpg', cat: 'vista',       label: 'Reflexo dourado no lago',        tag: 'Vistas' },
    { src: 'img/gallery/oficial/aurora-19.jpg', cat: 'lago',        label: 'Entardecer · Lago Corumbá IV',  tag: 'Lago' },
    { src: 'img/gallery/oficial/aurora-20.jpg', cat: 'lifestyle',   label: 'Club house e piscina',           tag: 'Lifestyle' }
  ];

  function imagensHTML() {
    var items = GALLERY_PHOTOS.map(function(p, i) {
      return '<figure class="g-item reveal" data-cat="' + p.cat + '" data-idx="' + i + '" data-reveal style="--delay:' + (i * 50) + 'ms">' +
        '<img loading="lazy" src="' + p.src + '" alt="' + p.label + '">' +
        '<figcaption class="g-cap">' +
          '<span class="g-cat">' + p.tag + '</span>' +
          '<span class="g-label">' + p.label + '</span>' +
        '</figcaption>' +
      '</figure>';
    }).join('');
    return '<div class="modal-section">' +
      '<div class="section-num">O Lugar</div>' +
      '<h3 class="section-title">Aurora em imagens oficiais.</h3>' +
      '<p class="section-body">Imagens do site oficial do empreendimento. Arquitetura, lago, lifestyle e vistas do Aurora Oasis.</p>' +
      '<div class="gallery-filters">' +
        '<button class="gf-btn is-active" data-cat="todos">Todos</button>' +
        '<button class="gf-btn" data-cat="vista">Vistas</button>' +
        '<button class="gf-btn" data-cat="arquitetura">Arquitetura</button>' +
        '<button class="gf-btn" data-cat="lifestyle">Lifestyle</button>' +
      '</div>' +
    '</div>' +
    '<div class="gallery-grid" id="gallery-grid">' + items + '</div>';
  }

  function bindGalleryFilters() {
    window.galleryFiltered = GALLERY_PHOTOS.slice();
    document.querySelectorAll('.gf-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.gf-btn').forEach(function(b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var cat = btn.dataset.cat;
        window.galleryFiltered = (cat === 'todos') ? GALLERY_PHOTOS.slice() : GALLERY_PHOTOS.filter(function(p) { return p.cat === cat; });
        document.querySelectorAll('.g-item').forEach(function(item) {
          var match = cat === 'todos' || item.dataset.cat === cat;
          item.style.display = match ? '' : 'none';
        });
      });
    });
  }

  // ─── Lightbox ─────────────────────────────────────────────────────────────
  var lightboxState = { open: false, idx: 0, photos: [] };

  function openLightbox(photos, startIdx) {
    lightboxState.open = true;
    lightboxState.idx = startIdx || 0;
    lightboxState.photos = photos;

    var lb = document.getElementById('lightbox');
    var track = document.getElementById('lb-track');
    var thumbs = document.getElementById('lb-thumbs');

    track.innerHTML = photos.map(function(p, i) {
      return '<div class="lb-slide" data-idx="' + i + '"><img src="' + p.src + '" alt="' + p.label + '" loading="eager"></div>';
    }).join('');

    thumbs.innerHTML = photos.map(function(p, i) {
      return '<button class="lb-thumb" data-idx="' + i + '" style="background-image:url(' + p.src + ')"></button>';
    }).join('');

    document.getElementById('lb-total').textContent = String(photos.length).padStart(2, '0');

    lb.hidden = false;
    requestAnimationFrame(function() { lb.classList.add('is-open'); });
    setLightboxIdx(lightboxState.idx);
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var lb = document.getElementById('lightbox');
    lb.classList.remove('is-open');
    setTimeout(function() { lb.hidden = true; }, 480);
    lightboxState.open = false;
    document.body.style.overflow = '';
  }

  function setLightboxIdx(i) {
    if (i < 0) i = lightboxState.photos.length - 1;
    if (i >= lightboxState.photos.length) i = 0;
    lightboxState.idx = i;
    var p = lightboxState.photos[i];
    document.getElementById('lb-cat').textContent = (p.tag || p.cat || '').toString();
    document.getElementById('lb-label').textContent = p.label;
    document.getElementById('lb-pos').textContent = String(i + 1).padStart(2, '0');
    document.querySelectorAll('.lb-slide').forEach(function(s) {
      var idx = parseInt(s.dataset.idx, 10);
      s.classList.remove('is-active', 'is-prev', 'is-next');
      if (idx === i) s.classList.add('is-active');
      else if (idx === i - 1 || (i === 0 && idx === lightboxState.photos.length - 1)) s.classList.add('is-prev');
      else if (idx === i + 1 || (i === lightboxState.photos.length - 1 && idx === 0)) s.classList.add('is-next');
    });
    document.querySelectorAll('.lb-thumb').forEach(function(t) {
      t.classList.toggle('is-active', parseInt(t.dataset.idx, 10) === i);
    });
    var activeThumb = document.querySelector('.lb-thumb.is-active');
    if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Lightbox click delegation (gallery items + controls)
  document.addEventListener('click', function(e) {
    var item = e.target.closest('.g-item');
    if (item && item.dataset.idx !== undefined) {
      var visiblePhotos = (window.galleryFiltered || GALLERY_PHOTOS);
      var idx = parseInt(item.dataset.idx, 10);
      // Find the position within visiblePhotos
      var posInVisible = visiblePhotos.findIndex(function(p) { return p.src === GALLERY_PHOTOS[idx].src; });
      if (posInVisible < 0) posInVisible = 0;
      openLightbox(visiblePhotos, posInVisible);
    }
    if (e.target.closest('#lb-close, .lb-backdrop')) closeLightbox();
    if (e.target.closest('.lb-prev')) setLightboxIdx(lightboxState.idx - 1);
    if (e.target.closest('.lb-next')) setLightboxIdx(lightboxState.idx + 1);
    var thumbBtn = e.target.closest('.lb-thumb');
    if (thumbBtn) setLightboxIdx(parseInt(thumbBtn.dataset.idx, 10));
  });

  window.addEventListener('keydown', function(e) {
    if (!lightboxState.open) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') setLightboxIdx(lightboxState.idx - 1);
    if (e.key === 'ArrowRight') setLightboxIdx(lightboxState.idx + 1);
  });

  (function() {
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    var startX = 0, startY = 0, dragging = false;
    lb.addEventListener('pointerdown', function(e) {
      if (!e.target.closest('.lb-slide.is-active')) return;
      startX = e.clientX; startY = e.clientY; dragging = true;
    });
    lb.addEventListener('pointerup', function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        setLightboxIdx(lightboxState.idx + (dx < 0 ? 1 : -1));
      }
      dragging = false;
    });
  })();

  function fotolivroHTML() {
    var pages = [
      {
        bg: 'img/capas/02-aurora.webp',
        mini: 'Aurora Oasis · Book Apresentação',
        title: 'Onde o tempo mora.',
        sub: 'Lago Corumbá IV · Abadiânia, Goiás',
        tone: 'cover'
      },
      {
        bg: 'img/capas/01-silva.webp',
        mini: 'Silva Investimentos',
        title: 'Quem assina o projeto.',
        body: 'Silva Investimentos conduz o Aurora Oasis com curadoria e visão de longo prazo. Empreendimentos que respeitam o entorno e mantêm valor ao longo do tempo. O cuidado com a marca começa antes do primeiro lote.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/03-jornada.webp',
        mini: 'Capítulo 01',
        title: 'Minha jornada criando meu Oasis.',
        body: 'Aurora não é um produto pronto. É uma jornada que começa pela escolha do lote, segue pelo projeto da casa e culmina no momento em que você senta no deck e o lago fica parado. Aqui o tempo não se mede em ponteiros, mas em pausas.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/04-tour.webp',
        mini: 'Capítulo 02',
        title: 'Tour virtual 360°.',
        body: 'Quatro pontos de vista, capturados em alta resolução, te colocam dentro do empreendimento antes da primeira visita. Frente lago, vista panorâmica, margem e hora dourada. O Aurora à sua frente, antes de você chegar.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/08-lago.webp',
        mini: 'Capítulo 03',
        title: 'Lago Corumbá IV.',
        body: 'Espelho d\'água de aproximadamente 700 km², barragem CELG. Frente d\'água ininterrupta de 1,2 km pertencente ao empreendimento. O lago como vizinho permanente — paisagem que define o ritmo do dia.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/11-localizacao.webp',
        mini: 'Capítulo 04',
        title: 'Localização que liberta.',
        body: 'A apenas 1 hora de Anápolis, 1h40 de Goiânia e 2h20 de Brasília. 10 minutos de estrada de chão do centro de Abadiânia. Refúgio sem isolamento — perto o suficiente para integrar, distante o suficiente para acolher.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/07-estilo.webp',
        mini: 'Capítulo 05',
        title: 'Estilo de vida Aurora.',
        body: 'Marina e praia particular. Piscina voltada para o lago. Espaços gourmet e lounge contemplativo. Spa, fitness center e academia com horizonte aberto. Wine bar e restaurante com vista. Calçadão de aproximadamente 4 km. Portaria e segurança 24h.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/06-disponibilidade.webp',
        mini: 'Capítulo 06',
        title: 'Disponibilidade, lotes e condições.',
        body: '241 lotes a partir de 500 m². Tipologias que privilegiam vista, topografia e privacidade. Estatuto e governança fortes garantem que o conceito do empreendimento se mantenha íntegro ao longo do tempo. Disponibilidade atualizada em tempo real.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/09-imagens.webp',
        mini: 'Capítulo 07',
        title: 'Aurora em imagens oficiais.',
        body: 'Fotografia de arquitetura, lifestyle e paisagem. Cerrado preservado, lago, marina, deck, calçadão, piscinas e infraestrutura. Cada quadro é um pedaço da experiência Aurora.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/10-videos.webp',
        mini: 'Capítulo 08',
        title: 'Aurora em movimento.',
        body: 'Vídeos institucionais, drone aéreo, depoimentos e entregas. A força da paisagem mostrada pelo lente cinematográfica. O luxo aqui também é o tempo que se dedica a contar bem cada história.',
        tone: 'editorial'
      },
      {
        bg: 'img/capas/05-investimento.webp',
        mini: 'Próximo passo',
        title: 'Investimento e rentabilidade.',
        body: 'Aurora Oasis é endereço e ativo. Localização escassa, governança forte e curadoria de longo prazo sustentam o valor do lote ao longo do tempo. Reserve sua visita e conheça as condições.',
        cta: { wpp: 'https://wa.me/5562995661461?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20visita%20ao%20Aurora%20Oasis', site: 'https://auroraoasis.com.br' },
        tone: 'closing'
      }
    ];

    var pagesHTML = pages.map(function(p, i) {
      return '<article class="book-page tone-' + p.tone + '" data-page="' + i + '"' + (i === 0 ? ' data-active="true"' : '') + '>' +
        '<div class="book-bg" style="background-image:url(\'' + p.bg + '\');"></div>' +
        '<div class="book-tint"></div>' +
        '<div class="book-content">' +
          '<div class="book-mini">' + p.mini + '</div>' +
          '<h2 class="book-title">' + p.title + '</h2>' +
          (p.sub ? '<div class="book-sub">' + p.sub + '</div>' : '') +
          (p.body ? '<p class="book-body">' + p.body + '</p>' : '') +
          (p.cta ? '<div class="book-cta">' +
            '<a href="' + p.cta.wpp + '" target="_blank" rel="noopener" class="modal-link">Agendar visita por WhatsApp</a>' +
            '<a href="' + p.cta.site + '" target="_blank" rel="noopener" class="modal-link">Acessar site oficial</a>' +
          '</div>' : '') +
        '</div>' +
      '</article>';
    }).join('');

    var dotsHTML = pages.map(function(_, i) {
      return '<button class="book-dot' + (i === 0 ? ' is-active' : '') + '" data-page="' + i + '" aria-label="Página ' + (i + 1) + '"></button>';
    }).join('');

    return '<div class="modal-section">' +
      '<div class="section-num">Book Apresentação</div>' +
      '<h3 class="section-title">Aurora · Onde o tempo mora.</h3>' +
      '<p class="section-body">8 capítulos editoriais com imagens oficiais do empreendimento. Use as setas ou deslize para navegar.</p>' +
    '</div>' +
    '<div class="book-viewer" id="book-viewer">' +
      '<div class="book-stage">' + pagesHTML + '</div>' +
      '<nav class="book-nav">' +
        '<button class="book-prev" id="book-prev" aria-label="Página anterior">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<div class="book-dots" id="book-dots">' + dotsHTML + '</div>' +
        '<button class="book-next" id="book-next" aria-label="Próxima página">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>' +
      '</nav>' +
    '</div>';
  }

  function bindBookViewer() {
    var stage = document.querySelector('#book-viewer .book-stage');
    if (!stage) return;
    var pages = stage.querySelectorAll('.book-page');
    var dots = document.querySelectorAll('#book-dots .book-dot');
    var idx = 0;
    function setIdx(i) {
      if (i < 0) i = pages.length - 1;
      if (i >= pages.length) i = 0;
      pages.forEach(function(p, n) {
        p.removeAttribute('data-active');
        p.classList.remove('is-prev');
        if (n === i) p.setAttribute('data-active', 'true');
        else if (n === i - 1 || (i === 0 && n === pages.length - 1)) p.classList.add('is-prev');
      });
      dots.forEach(function(d, n) { d.classList.toggle('is-active', n === i); });
      idx = i;
    }
    document.getElementById('book-prev').addEventListener('click', function() { setIdx(idx - 1); });
    document.getElementById('book-next').addEventListener('click', function() { setIdx(idx + 1); });
    dots.forEach(function(d, n) { d.addEventListener('click', function() { setIdx(n); }); });
    var sx = 0;
    stage.addEventListener('pointerdown', function(e) { sx = e.clientX; });
    stage.addEventListener('pointerup', function(e) {
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 60) setIdx(idx + (dx < 0 ? 1 : -1));
    });
    function onKey(e) {
      if (!stage.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'ArrowLeft') setIdx(idx - 1);
      if (e.key === 'ArrowRight') setIdx(idx + 1);
    }
    document.addEventListener('keydown', onKey);
  }

  function videosHTML() {
    var videos = [
      { src: 'video/aurora-raro-como-tempo.mp4',    poster: 'img/gallery/aurora-aerea-01.jpg', cat: 'Manifesto',    label: 'Raro como o tempo' },
      { src: 'video/aurora-precisa-mais-tempo.mp4', poster: 'img/gallery/aurora-aerea-03.jpg', cat: 'Manifesto',    label: 'Você precisa de mais tempo' },
      { src: 'video/aurora-presenca.mp4',           poster: 'img/gallery/aurora-aerea-05.jpg', cat: 'Manifesto',    label: 'Tempo sem presença é apenas espera' },
      { src: 'video/aurora-escritorio.mp4',         poster: 'img/gallery/aurora-aerea-02.jpg', cat: 'Apresentação', label: 'O lugar onde o tempo mora' }
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
      '<h3 class="section-title">Aurora em movimento.</h3>' +
      '<p class="section-body">Capturas aéreas e manifesto editorial. Aurora visto pelo céu, em ritmo cinematográfico.</p>' +
    '</div>' +
    '<div class="video-stack">' + items + '</div>';
  }

  function sobreHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Sobre o Aurora</div>' +
      '<h3 class="section-title">Aurora Oasis.</h3>' +
      '<p class="section-lead">Um endereço para quem entendeu que o tempo é o verdadeiro luxo.</p>' +
      '<p class="section-body">Lago Corumbá IV · Abadiânia · Goiás. Lotes amplos a partir de 500 m² em meio ao cerrado nativo, com frente para o lago e arquitetura assinada pela FAAU. 1h de Anápolis · 1h40 de Goiânia · 2h20 de Brasília.</p>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Realização</div>' +
      '<h3 class="section-title">Silva Investimentos.</h3>' +
      '<p class="section-body">Empreendedora com DNA de disciplina de longo prazo, respeito pelo entorno e compromisso com legado. Aurora Oasis é o projeto-âncora do portfólio em Lago Corumbá IV.</p>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Arquitetura</div>' +
      '<h3 class="section-title">FAAU · Flávio Aleixo.</h3>' +
      '<p class="section-body">Escritório responsável pelo desenho urbanístico e arquitetônico do Aurora Oasis. Volumetria suave, materiais naturais e integração com a topografia e o cerrado nativo são princípios não-negociáveis do projeto.</p>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Próximo passo</div>' +
      '<h3 class="section-title">Conheça Aurora pessoalmente.</h3>' +
      '<p class="section-body">Reserve sua visita ao empreendimento. Equipe Silva Investimentos coordena o agendamento e oferece tour completo das tipologias e amenidades.</p>' +
      '<div class="modal-actions" style="margin-top:20px;">' +
        '<a href="https://wa.me/5562995661461?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20visita%20ao%20Aurora%20Oasis" target="_blank" rel="noopener" class="modal-link">Agendar visita por WhatsApp</a>' +
        '<a href="mailto:contato@aurora-oasis.com.br?subject=Aurora%20Oasis%20-%20Interesse%20em%20visita" class="modal-link">Solicitar contato por e-mail</a>' +
      '</div>' +
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
    { sceneId: 'pano_01', duration: 8000, action: 'modal:implantacao',     caption: 'Implantação · Lotes a partir de 500 m²' },
    { sceneId: 'pano_04', duration: 8000, action: 'modal:disponibilidades', caption: 'Disponibilidade · Lago Corumbá IV' },
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
          if (e.target.matches('[data-reveal-words]')) {
            var spans = e.target.querySelectorAll('span');
            spans.forEach(function(s, i) { s.style.transitionDelay = (i * 22) + 'ms'; });
          }
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('[data-reveal], [data-reveal-x], [data-reveal-scale], [data-reveal-words]').forEach(function(el) { io.observe(el); });
  }

  function splitWords(selector) {
    document.querySelectorAll(selector).forEach(function(el) {
      if (el.dataset.split === '1') return;
      el.dataset.split = '1';
      var html = el.textContent.split(/(\s+)/).map(function(w) {
        return /\s+/.test(w) ? w : '<span>' + w + '</span>';
      }).join('');
      el.innerHTML = html;
    });
  }

  function bindModalScrollProgress() {
    var panel = document.querySelector('.modal-panel');
    var bar = document.getElementById('modal-progress');
    if (!panel || !bar) return;
    panel.addEventListener('scroll', function() {
      var max = panel.scrollHeight - panel.clientHeight;
      var pct = max > 0 ? (panel.scrollTop / max) * 100 : 0;
      bar.style.width = pct + '%';
    });
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
      splitWords('[data-reveal-words]');
      initRevealObserver();
      bindCardParallax();
      bindModalScrollProgress();
      if (title === 'Galeria de Imagens') bindGalleryFilters();
      if (title === 'Book Apresentação') bindBookViewer();
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
        ? { yaw: 0, pitch: -0.55, fov: 95 * Math.PI / 180 }
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
      // Cinematic transition: DOF blur + 3D zoom + fade overlay sequence
      runSceneTransitionFX();
      s.scene.switchTo({ transitionDuration: 1400 });
    }

    var s_data = SCENES[idx];
    if (s_data && s_data.id === 'pano_02') {
      var s_mz = marzipanoScenes[idx];
      if (s_mz) {
        s_mz.view.setYaw(0);
        s_mz.view.setPitch(-0.55);
        s_mz.view.setFov(95 * Math.PI / 180);
        currentFov = 95 * Math.PI / 180;
      }
      basePose.yaw = 0;
      basePose.pitch = -0.55;
      basePose.fov = 95 * Math.PI / 180;
    } else {
      basePose.yaw = 0;
      basePose.pitch = -0.30;
      basePose.fov = FOV_DEFAULT;
    }
    driftStart = performance.now();
    userInteracting = false;
    // Reset reveal animation only for region(s) NOT in this scene
    if (window._regionRevealed) {
      var sid = SCENES[idx] && SCENES[idx].id;
      Object.keys(window._regionRevealed).forEach(function(k) {
        if (k.indexOf('@' + sid) < 0) delete window._regionRevealed[k];
      });
    }
    // Stagger UI reveal (header + scene picker + minimap)
    triggerUIReveal();

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
      setTimeout(function() {
        loadScreen.style.display = 'none';
        // Reveal floating hourglass brand mark with overshoot delay
        var mark = document.getElementById('hourglass-mark');
        if (mark) setTimeout(function() { mark.classList.add('is-visible'); }, 250);
      }, 700);
    }, 400);
  }

  // Hourglass brand mark click → open Conceito modal (o tempo é o novo luxo)
  (function() {
    var mark = document.getElementById('hourglass-mark');
    if (!mark) return;
    mark.addEventListener('click', function() {
      // Try existing menu/conceito triggers
      var btn = document.querySelector('[data-feat-key="conceito"], [data-action="conceito"], .nav-conceito');
      if (btn) { btn.click(); return; }
      // Fallback: open menu modal
      var menuBtn = document.getElementById('menu-btn') || document.querySelector('.menu-trigger');
      if (menuBtn) menuBtn.click();
    });
  })();

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
  // ─── Staggered UI reveal on scene change ──────────────────────────────────
  function triggerUIReveal() {
    var targets = [
      { sel: '#header', delay: 0 },
      { sel: '#bottom-bar, .bottom-bar, #footer', delay: 80 },
      { sel: '#scene-picker, .scene-picker', delay: 140 },
      { sel: '#scene-minimap, .scene-minimap', delay: 200 },
      { sel: '.pano-hotspot', delay: 380 }
    ];
    targets.forEach(function(t) {
      document.querySelectorAll(t.sel).forEach(function(el) {
        el.classList.remove('ui-reveal');
        // re-flow then add class to retrigger animation
        // eslint-disable-next-line no-unused-expressions
        void el.offsetWidth;
        setTimeout(function() { el.classList.add('ui-reveal'); }, t.delay);
      });
    });
  }

  // ─── Scene Transition FX (DOF + 3D zoom + fade overlay) ────────────────────
  function runSceneTransitionFX() {
    var pano = document.getElementById('pano') || viewerEl;
    if (!pano) return;
    // Phase 1 — exit (defocus + zoom-in + brightness drop): 0–520ms
    pano.classList.add('scene-fx-exit');
    // Phase 2 — black flash bridge: 280–660ms
    var flash = document.getElementById('scene-fx-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'scene-fx-flash';
      document.body.appendChild(flash);
    }
    flash.classList.add('is-flashing');
    setTimeout(function() {
      // Phase 3 — enter (defocus from blur, zoom-out from 1.06→1, brightness back): 660–1400ms
      pano.classList.remove('scene-fx-exit');
      pano.classList.add('scene-fx-enter');
      flash.classList.remove('is-flashing');
    }, 620);
    setTimeout(function() {
      pano.classList.remove('scene-fx-enter');
    }, 1700);
  }

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

  // Pause drift when tab hidden — saves battery + prevents jump on visibility return
  var tabVisible = !document.hidden;
  document.addEventListener('visibilitychange', function() {
    tabVisible = !document.hidden;
    if (tabVisible) driftStart = performance.now();
  });

  // Respect user motion preferences
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function driftTick() {
    if (tabVisible && !reduceMotion && !userInteracting && viewer && marzipanoScenes.length > 0) {
      var t = performance.now() - driftStart;
      // Yaw: dual-harmonic Lissajous-like for organic motion (not pure sinusoid)
      var dy = Math.sin(t / DRIFT_PERIOD_YAW * Math.PI * 2) * DRIFT_AMPLITUDE
             + Math.sin(t / DRIFT_PERIOD_YAW_2 * Math.PI * 2 + 1.3) * DRIFT_AMPLITUDE * 0.35;
      // Pitch: out of phase, smaller amplitude
      var dp = Math.sin(t / DRIFT_PERIOD_PITCH * Math.PI * 2 + Math.PI / 3) * DRIFT_AMPLITUDE * 0.55;
      // FOV breathing — depth-of-field illusion (zoom subtly in/out)
      var df = Math.sin(t / DRIFT_PERIOD_FOV * Math.PI * 2 + Math.PI / 5) * DRIFT_FOV_AMPLITUDE;
      var s = marzipanoScenes[currentSceneIdx];
      if (s && !autorotating) {
        try {
          s.view.setYaw(basePose.yaw + dy);
          s.view.setPitch(basePose.pitch + dp);
          if (basePose.fov !== null && typeof s.view.setFov === 'function') {
            s.view.setFov(basePose.fov + df);
          }
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

  function applyZoomStep(deltaRad) {
    var s = (typeof overviewMode !== 'undefined' && overviewMode && typeof flatScenes !== 'undefined' && flatScenes[currentSceneIdx])
      ? flatScenes[currentSceneIdx]
      : marzipanoScenes[currentSceneIdx];
    if (!s || !s.view || typeof s.view.fov !== 'function') return;
    var cur = s.view.fov();
    var next = cur + deltaRad;
    next = Math.max(FOV_MIN, Math.min(FOV_MAX, next));
    s.view.setFov(next);
    currentFov = next;
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

  // ─── Zoom Buttons ─────────────────────────────────────────────────────────
  var btnZoomIn  = document.getElementById('btn-zoom-in');
  var btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      applyZoomStep(-FOV_STEP * 2);
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var s = marzipanoScenes[currentSceneIdx];
      if (s && !overviewMode) {
        var cur = s.view.fov();
        if (cur >= FOV_MAX - 0.05) {
          if (typeof toggleOverviewMode === 'function') toggleOverviewMode();
          return;
        }
      }
      applyZoomStep(+FOV_STEP * 2);
    });
  }

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

    // Force regions visible (bypass any toggle that might have disabled it)
    regionVisibility.regions = true;
    regionVisibility.aurora_oasis_pano02 = true;
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

      // Group with reveal + hover. Animate ONLY first time we see this region in this scene.
      // Subsequent updateRegionOverlay calls (view drift) just update points, no reset.
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      var revealKey = region.id + '@' + SCENES[currentSceneIdx].id;
      var alreadyRevealed = window._regionRevealed && window._regionRevealed[revealKey];
      g.setAttribute('class', 'region-group region-' + region.id + (alreadyRevealed ? '' : ' is-revealing'));
      g.setAttribute('data-region', region.id);
      if (!alreadyRevealed) {
        window._regionRevealed = window._regionRevealed || {};
        window._regionRevealed[revealKey] = true;
      }

      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('class', 'region-poly');
      poly.setAttribute('points', ptsStr);
      poly.setAttribute('fill', region.fillColor || 'rgba(201,168,76,0.18)');
      poly.setAttribute('stroke', region.strokeColor || region.color || '#C9A84C');
      poly.setAttribute('stroke-linejoin', 'round');
      g.appendChild(poly);

      var cx = 0, cy = 0;
      validPts.forEach(function(p) { cx += p.x; cy += p.y; });
      cx /= validPts.length; cy /= validPts.length;

      var labelPad = 12;
      var labelH = 26;
      var labelW = region.label.length * 8.5 + labelPad * 2;

      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', 'region-label-bg');
      rect.setAttribute('x', cx - labelW / 2);
      rect.setAttribute('y', cy - labelH / 2);
      rect.setAttribute('width', labelW);
      rect.setAttribute('height', labelH);
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', 'rgba(239,237,226,0.96)');
      rect.setAttribute('stroke', '#C9A84C');
      rect.setAttribute('stroke-width', '1');
      g.appendChild(rect);

      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'region-label-text');
      text.setAttribute('x', cx);
      text.setAttribute('y', cy + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', "'Britti Sans', sans-serif");
      text.setAttribute('font-weight', '500');
      text.setAttribute('font-size', '11');
      text.setAttribute('letter-spacing', '0.22em');
      text.setAttribute('fill', '#1A1A1A');
      text.textContent = region.label;
      g.appendChild(text);

      svg.appendChild(g);
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
  // Hotspots individuais desativados — região poligonal Aurora Oasis em pano_02 cobre o empreendimento.
  // Mantido como referência futura; não é renderizado.
  // eslint-disable-next-line no-unused-vars
  var _SCENE_HOTSPOTS_REFERENCE = {
    pano_01: [
      { yaw:  0.0000, pitch: +0.05, label: 'Lago Corumbá IV',     desc: 'Espelho d\'água principal · barragem CELG · 700 km².' },
      { yaw: -0.2500, pitch: +0.40, label: 'Loteamento Aurora',   desc: 'Quadras Aurora Oasis · ruas pavimentadas e lotes demarcados.' },
      { yaw: +0.3500, pitch: +0.10, label: 'Ilha do Lago',        desc: 'Ilhota natural no espelho d\'água · paisagem preservada.' },
      { yaw: -0.7000, pitch: +0.05, label: 'Abadiânia',           desc: 'Núcleo urbano vizinho · acesso pela GO-437.' },
      { yaw: +0.7000, pitch: +0.05, label: 'Mata cerrado',        desc: 'Reserva nativa · vegetação preservada do bioma cerrado.' },
      { yaw: -0.0500, pitch: +0.25, label: 'Frente d\'água',      desc: 'Margem do empreendimento com vista direta ao lago.' }
    ],
    pano_02: [
      { yaw: +0.0312, pitch: +0.15, label: 'Loteamento Aurora',   desc: 'Aurora Oasis · 241 lotes · ruas e quadras demarcadas.' },
      { yaw: -0.0500, pitch: +0.55, label: 'Lago Corumbá IV',     desc: 'Água em primeiro plano · frente exclusiva do empreendimento.' },
      { yaw: -0.5500, pitch: +0.10, label: 'Península de mata',   desc: 'Cinturão verde de cerrado preservado · barreira natural.' },
      { yaw: -0.6500, pitch: +0.20, label: 'Abadiânia',           desc: 'Centro urbano · 18 km do empreendimento.' },
      { yaw: +0.2000, pitch: +0.45, label: 'Frente lago Aurora',  desc: 'Linha d\'água permanente · 1,2 km de margem.' },
      { yaw: +0.7000, pitch: +0.05, label: 'Cerrado distante',    desc: 'Horizonte cerrado · vegetação típica goiana.' }
    ],
    pano_03: [
      { yaw: -0.3000, pitch: +0.30, label: 'Lago Corumbá IV',     desc: 'Água doce · profundidade média 18 m.' },
      { yaw: -0.6000, pitch: +0.55, label: 'Ilha das chácaras',   desc: 'Ilha vizinha com edificações · paisagem viva.' },
      { yaw: +0.3500, pitch: +0.20, label: 'Loteamento Aurora',   desc: 'Quadras Aurora Oasis · vista lateral do empreendimento.' },
      { yaw:  0.0000, pitch: +0.15, label: 'Margem habitada',     desc: 'Pequenas edificações · ocupação consolidada.' },
      { yaw: +0.7500, pitch: +0.10, label: 'Mata ciliar',         desc: 'Vegetação ciliar protegida · APP da barragem.' },
      { yaw:  0.0000, pitch: -0.05, label: 'Horizonte cerrado',   desc: 'Linha de horizonte · biombo natural distante.' }
    ],
    pano_04: [
      { yaw: +0.4500, pitch: +0.25, label: 'Aurora Oasis',        desc: 'Empreendimento · ruas e lotes demarcados.' },
      { yaw: -0.6500, pitch: +0.30, label: 'Lago Corumbá IV',     desc: 'Água em primeiro plano · frente lago Aurora.' },
      { yaw: -0.3500, pitch: +0.10, label: 'Abadiânia',           desc: 'Núcleo urbano · acessos asfaltados.' },
      { yaw: -0.6500, pitch: -0.20, label: 'Pôr do sol oeste',    desc: 'Hora dourada · luz característica do cerrado.' },
      { yaw: +0.5500, pitch: +0.40, label: 'Quadras Aurora',      desc: 'Lotes residenciais · pé na grama, vista ao lago.' },
      { yaw: +0.2500, pitch: -0.05, label: 'Horizonte cerrado',   desc: 'Linha de horizonte · vegetação típica goiana.' }
    ]
  };

  var hotspotsVisible = true;

  function buildHotspotsForScene(sceneId, mzScene) {
    if (!mzScene) return;
    var container = mzScene.hotspotContainer();
    container.listHotspots().forEach(function(h) { container.destroyHotspot(h); });
    // Hotspots individuais desabilitados; região poligonal cobre o empreendimento
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
