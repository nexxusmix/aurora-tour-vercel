/* Aurora Oasis Tour Virtual v5 — Feature Bottom Bar | MapLibre | Admin | Rich Modals | Zero Italic */

(function () {
  'use strict';

  // ─── Theme ────────────────────────────────────────────────────────────────
  var THEME_KEY = 'aurora-tour-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (window._mapInstance) {
      var style = theme === 'dark'
        ? 'https://tiles.openfreemap.org/styles/dark'
        : 'https://tiles.openfreemap.org/styles/positron';
      window._mapInstance.setStyle(style);
    }
  }

  var savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);

  // ─── Admin ────────────────────────────────────────────────────────────────
  var ADMIN_PASSWORD = '827336';

  function showAdminBar() {
    // already toggled via admin-mode class
  }

  function openAdmin() {
    var pw = prompt('Senha admin:');
    if (pw === null) return;
    if (pw !== ADMIN_PASSWORD) {
      alert('Senha inválida.');
      return;
    }
    document.body.classList.add('admin-mode');
    showAdminBar();
  }

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
        '<div id="map" style="height:420px;width:100%;border:1px solid var(--hairline);"></div>',
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
      '<p class="section-lead">Não é um tour. É um filme esférico onde o investidor decide o roteiro, em AURORA Track &amp; Field.</p>' +
      '<hr class="section-divider">' +
    '</div>' +

    '<div class="modal-section">' +
      '<div class="section-num">01 · Por que</div>' +
      '<h3 class="section-title">O loteamento de luxo vende mal porque se mostra mal.</h3>' +
      '<p class="section-body">99% dos empreendimentos premium continuam apresentando o produto com fotos aéreas estáticas, planta em PDF e visita presencial obrigatória. O investidor de Goiânia que quer entender Lago Corumbá IV em uma quinta à noite não tem para onde olhar. A decisão fica congelada por dias até a próxima viagem.</p>' +
      '<div class="compare-grid">' +
        '<div class="compare-col">' +
          '<div class="compare-mini">Hoje · Apresentação convencional</div>' +
          '<ul class="compare-list">' +
            '<li>Fotos aéreas estáticas, sem contexto humano</li>' +
            '<li>Planta técnica que ninguém entende sozinho</li>' +
            '<li>Visita presencial obrigatória para fechar venda</li>' +
            '<li>Material que o investidor não consegue compartilhar</li>' +
            '<li>Produto idêntico ao concorrente nos olhos do cliente</li>' +
            '<li>Janela de decisão limitada ao horário comercial</li>' +
          '</ul>' +
        '</div>' +
        '<div class="compare-col col-future">' +
          '<div class="compare-mini">Com o tour AURORA · Filme esférico interativo</div>' +
          '<ul class="compare-list">' +
            '<li>Cenas cinematográficas em 8K esférico, com áudio real do local</li>' +
            '<li>Dados do produto (m², preço, ROI) embutidos em cada hotspot</li>' +
            '<li>Pré-qualificação do lead antes da visita presencial</li>' +
            '<li>Compartilhável por link, com snapshot do ponto de vista</li>' +
            '<li>Diferencial premium percebido em 6 segundos</li>' +
            '<li>Disponível 24/7, no celular, com gyro e fullscreen</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<hr class="section-divider">' +
    '</div>' +

    '<div class="modal-section">' +
      '<div class="section-num">02 · Conceito</div>' +
      '<h3 class="section-title">Cinema esférico com camada de dados e gatilho de venda.</h3>' +
      '<p class="section-body">Não é Matterport. Não é Google Street View. É captura cinematográfica em 360, narrativa guiada por sete paradas, dados ao vivo do produto sobre cada cena e CTA de reserva embutido. O lead entra pelo Instagram, sai com lote favorito marcado e horário de visita agendado.</p>' +
      '<div class="metrics-row">' +
        '<div class="metric"><div class="metric-num">8K</div><div class="metric-label">Captura esférica cinematográfica</div></div>' +
        '<div class="metric"><div class="metric-num">07</div><div class="metric-label">Cenas narrativas com hotspots</div></div>' +
        '<div class="metric"><div class="metric-num">24/7</div><div class="metric-label">Acessível do sofá às 23h, no celular</div></div>' +
        '<div class="metric"><div class="metric-num">~2.1</div><div class="metric-label">Lotes vendidos pagam a plataforma</div></div>' +
      '</div>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Os quatro pilares</div>' +
      '<h3 class="section-title">O tempo é o novo luxo.</h3>' +
      '<p class="section-body">Aurora Oasis é um endereço para quem entendeu que viver bem deixou de ser sobre o que se acumula. É sobre o que se preserva: silêncio, presença, lentidão, profundidade. Cada pilar do projeto materializa essa filosofia.</p>' +
      '<div class="pillars-grid">' +
        '<article class="pillar reveal" data-reveal>' +
          '<div class="pillar-num">01</div>' +
          '<h4 class="pillar-title">Presença</h4>' +
          '<p class="pillar-desc">O tempo desacelera para quem sabe vivê-lo. Cada construção é desenhada para favorecer a contemplação, sem pressa, sem ruído.</p>' +
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
      '<div class="section-num">03 · Roteiro</div>' +
      '<h3 class="section-title">Sete paradas. Uma narrativa de venda.</h3>' +
      '<p class="section-body">Cada cena foi planejada para conduzir o lead por uma jornada emocional e racional: primeiro o espanto visual, depois o contexto geográfico, depois o produto, depois o número.</p>' +
      '<div class="stop-card"><div class="stop-num">01</div><div><div class="stop-label">Vista de Apresentação</div><div class="stop-desc">Panorâmica geral do empreendimento. Impacto visual imediato — skyline do lago ao fundo, lotes demarcados, infraestrutura aparente. Hotspot: área total + número de lotes.</div></div></div>' +
      '<div class="stop-card"><div class="stop-num">02</div><div><div class="stop-label">Drone Norte</div><div class="stop-desc">Vista aérea do vetor norte. Mostra a relação do projeto com a malha viária e a reserva de Mata Atlântica. Hotspot: distância de Brasília + tempo de carro.</div></div></div>' +
      '<div class="stop-card"><div class="stop-num">03</div><div><div class="stop-label">Drone Lago</div><div class="stop-desc">Sobre o espelho d\'água do Lago Corumbá IV. Contexto emocional máximo — a razão principal de compra. Hotspot: área do lago + altitude.</div></div></div>' +
      '<div class="stop-card"><div class="stop-num">04</div><div><div class="stop-label">Pôr do Sol</div><div class="stop-desc">Golden hour capturada na última hora do dia. Enquadramento cinematográfico com silhueta do lago. Hotspot: link para galeria completa.</div></div></div>' +
      '<div class="stop-card"><div class="stop-num">05</div><div><div class="stop-label">Acesso Principal</div><div class="stop-desc">Portaria e via de acesso pavimentada. Transmite segurança e maturidade da obra. Hotspot: infraestrutura entregue.</div></div></div>' +
      '<div class="stop-card"><div class="stop-num">06</div><div><div class="stop-label">Lote Destaque</div><div class="stop-desc">Walk-through do Lote 137, com marcações de divisa e vista direta para o lago. Hotspot: 1.250 m² · R$ 235.000 · disponível.</div></div></div>' +
      '<div class="stop-card"><div class="stop-num">07</div><div><div class="stop-label">Área de Lazer</div><div class="stop-desc">Estrutura de lazer e convivência. Ancora a percepção de comunidade e lifestyle premium. Hotspot: CTA de agendamento de visita.</div></div></div>' +
    '</div>' +

    '<hr class="section-divider">' +

    '<div class="modal-section">' +
      '<div class="section-num">04 · Camadas</div>' +
      '<h3 class="section-title">Seis camadas sobre cada cena.</h3>' +
      '<p class="section-body">O tour não é uma foto 360 passiva. Cada cena carrega dados ao vivo, ações de venda e identidade visual do empreendimento.</p>' +
      '<div class="layer-card"><div class="layer-num">01</div><div><div class="layer-title">Hotspots de Produto</div><div class="layer-desc">Área do lote, preço, status (disponível / reservado / vendido) e metragem. Dados atualizáveis via painel admin sem novo deploy.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">02</div><div><div class="layer-title">Demarcações Visuais</div><div class="layer-desc">Polígonos SVG sobrepostos na esfera indicando zonas do empreendimento: Zona Oasis (ouro) e Zona Lago (verde). Editáveis manualmente ou via IA no modo admin.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">03</div><div><div class="layer-title">Navegação Entre Cenas</div><div class="layer-desc">Setas e miniaturas para transição fluida entre as 7 paradas. Transição com 800ms de crossfade suave.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">04</div><div><div class="layer-title">CTA de Reserva</div><div class="layer-desc">Botão embutido na cena do Lote Destaque que abre formulário de contato ou redireciona para WhatsApp do corretor. Rastreável por UTM.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">05</div><div><div class="layer-title">Identidade Visual AURORA</div><div class="layer-desc">Logotipo, paleta ouro + areia, tipografia Britti Sans e sistema de hairlines aplicados a todos os elementos de interface.</div></div></div>' +
      '<div class="layer-card"><div class="layer-num">06</div><div><div class="layer-title">Compartilhamento com Snapshot</div><div class="layer-desc">Botão de share que gera link com yaw/pitch atual — o receptor abre o tour no exato ângulo que o corretor recomendou.</div></div></div>' +
    '</div>' +

    '<div class="modal-section">' +
      '<hr class="section-divider">' +
      '<div class="section-num">Amenidades</div>' +
      '<h3 class="section-title">Estrutura completa, sem ostentação.</h3>' +
      '<p class="section-body">Programa arquitetônico assinado pela <strong>FAAU · Flávio Aleixo</strong>. Volumetria suave, materiais naturais, integração com o cerrado e vista privilegiada para o lago.</p>' +
      '<div class="amenities-grid">' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#9225;</span><div class="amenity-name">Wine Bar</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#8801;</span><div class="amenity-name">Academia</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#9675;</span><div class="amenity-name">Piscina</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#9645;</span><div class="amenity-name">Restaurante</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#9671;</span><div class="amenity-name">Spa Completo</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#9651;</span><div class="amenity-name">Track Arena</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#8766;</span><div class="amenity-name">Trilha Cerrado</div></div>' +
        '<div class="amenity reveal" data-reveal><span class="amenity-icon">&#9680;</span><div class="amenity-name">Mirante Lago</div></div>' +
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
      '<p class="section-body">Integração com Squad Hub em desenvolvimento — status em tempo real disponível na próxima sprint. A plataforma permitirá visualizar disponibilidade por lote, marcar interesse diretamente no mapa e notificar o corretor responsável em tempo real.</p>' +
    '</div>';
  }

  function imagensHTML() {
    var photos = [
      { src: '/img/gallery/aurora-drone-01.jpg', label: 'Vista aérea · 30/09/2025',    cat: 'Drone' },
      { src: '/img/gallery/aurora-drone-02.jpg', label: 'Lago Corumbá IV',              cat: 'Drone' },
      { src: '/img/gallery/aurora-drone-03.jpg', label: 'Mata nativa · entrada',        cat: 'Drone' },
      { src: '/img/gallery/aurora-drone-04.jpg', label: 'Sol da manhã sobre o lago',    cat: 'Drone' },
      { src: '/img/gallery/aurora-drone-05.jpg', label: 'Amplitude · cerrado',          cat: 'Drone' },
      { src: '/img/gallery/aurora-drone-06.jpg', label: 'Margem do lago',               cat: 'Drone' },
      { src: '/img/faau/faau-01.jpg',            label: 'Volumetria suave',             cat: 'Arquitetura · FAAU' },
      { src: '/img/faau/faau-02.jpg',            label: 'Materiais naturais',           cat: 'Arquitetura · FAAU' },
      { src: '/img/faau/faau-03.jpg',            label: 'Integração interior-exterior', cat: 'Arquitetura · FAAU' },
      { src: '/img/faau/faau-04.jpg',            label: 'Detalhe construtivo',          cat: 'Arquitetura · FAAU' }
    ];
    var items = photos.map(function(p, i) {
      return '<figure class="g-item reveal" data-reveal style="--delay:' + (i * 60) + 'ms">' +
        '<img loading="lazy" src="' + p.src + '" alt="' + p.label + '">' +
        '<figcaption class="g-cap">' +
          '<span class="g-cat">' + p.cat + '</span>' +
          '<span class="g-label">' + p.label + '</span>' +
        '</figcaption>' +
      '</figure>';
    }).join('');
    return '<div class="modal-section">' +
      '<div class="section-num">Galeria</div>' +
      '<h3 class="section-title">Aurora em detalhes.</h3>' +
      '<p class="section-body">Imagens reais do empreendimento (drone, setembro 2025) e referências arquitetônicas do escritório FAAU, autor do projeto.</p>' +
    '</div>' +
    '<div class="gallery-grid">' + items + '</div>';
  }

  function fotolivroHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Book Digital</div>' +
      '<h3 class="section-title">Aurora · edição completa.</h3>' +
      '<p class="section-body">Compilação editorial em formato fotolivro digital, navegável página a página. Lançamento previsto para a semana 4 do cronograma.</p>' +
      '<div class="book-mockup reveal" data-reveal>' +
        '<div class="book-cover">' +
          '<img src="/img/oasis-logo-black-aa.png" class="book-logo brand-logo-dark" alt="OASIS">' +
          '<img src="/img/oasis-logo-white-aa.png" class="book-logo brand-logo-light" alt="OASIS">' +
          '<div class="book-title">Aurora · Lago Corumbá IV</div>' +
          '<div class="book-mini">Book digital · 2026</div>' +
        '</div>' +
        '<div class="book-status">Em produção</div>' +
      '</div>' +
    '</div>';
  }

  function videosHTML() {
    return '<div class="modal-section">' +
      '<div class="section-num">Vídeos</div>' +
      '<h3 class="section-title">Movimento sobre o lago.</h3>' +
      '<p class="section-body">Captação aérea drone setembro 2025. Versão estendida e teaser de 60 segundos em pós-produção.</p>' +
    '</div>' +
    '<div class="video-stack">' +
      '<div class="v-item reveal" data-reveal>' +
        '<video controls preload="metadata" poster="/img/gallery/aurora-drone-01.jpg" muted playsinline>' +
          '<source src="/video/aurora-drone-01.mp4" type="video/mp4">' +
        '</video>' +
        '<div class="v-meta"><span class="v-cat">Drone aéreo</span><span class="v-label">Aurora · panorâmica norte</span></div>' +
      '</div>' +
      '<div class="v-item reveal" data-reveal>' +
        '<video controls preload="metadata" poster="/img/gallery/aurora-drone-04.jpg" muted playsinline>' +
          '<source src="/video/aurora-drone-02.mp4" type="video/mp4">' +
        '</video>' +
        '<div class="v-meta"><span class="v-cat">Drone aéreo</span><span class="v-label">Aurora · espelho d\'água</span></div>' +
      '</div>' +
    '</div>';
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
      '<div class="layer-card"><div class="layer-num">05</div><div><div class="layer-title">CMS · Squad Hub (próxima sprint)</div><div class="layer-desc">Painel web para atualizar status dos lotes, preços, demarcações e conteúdo dos modais sem acessar código. Integração via API com o tour.</div></div></div>' +
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
      btnAutorotate.setAttribute('aria-pressed', 'true');
      btnAutorotate.classList.add('is-active');
      viewer.startMovement(autorotateCtrl);
    }
  }

  function stopAutorotate() {
    if (autorotating) {
      autorotating = false;
      btnAutorotate.setAttribute('aria-pressed', 'false');
      btnAutorotate.classList.remove('is-active');
      viewer.stopMovement();
    }
  }

  // ─── Close modal helper ───────────────────────────────────────────────────
  function closeModal() {
    closeFeatModal();
  }

  // ─── Presentation ─────────────────────────────────────────────────────────
  var PRESENTATION_SEQUENCE = [
    { sceneId: 'pano_01', duration: 6000, action: null,                caption: 'Vista de Apresentação' },
    { sceneId: 'pano_01', duration: 8000, action: 'modal:conceito',    caption: 'Conceito' },
    { sceneId: 'pano_02', duration: 6000, action: 'rotate',            caption: 'Drone Norte · Track Arena' },
    { sceneId: 'pano_03', duration: 8000, action: 'modal:implantacao', caption: 'Implantação' },
    { sceneId: 'pano_04', duration: 6000, action: 'rotate',            caption: 'Pôr do Sol' },
    { sceneId: 'pano_01', duration: 6000, action: 'modal:sobre',       caption: 'Sobre o projeto' }
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
      handler: function() { resetView(); }
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
      title: 'Fotolivro · Book Digital',
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
      s.view.setPitch(0);
      basePose.yaw = 0;
      basePose.pitch = 0;
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

  // ─── MapLibre Localização ─────────────────────────────────────────────────
  function initLocationMap() {
    if (!window.maplibregl) return;
    var el = document.getElementById('map');
    if (!el || el._inited) return;
    el._inited = true;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var map = new maplibregl.Map({
      container: 'map',
      style: isDark
        ? 'https://tiles.openfreemap.org/styles/dark'
        : 'https://tiles.openfreemap.org/styles/positron',
      center: [-48.46, -16.50],
      zoom: 8,
      attributionControl: false
    });
    window._mapInstance = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    var points = [
      { id: 'aurora',   coord: [-48.464529, -16.274689], label: 'Aurora Oasis', mini: 'Abadiânia · GO', primary: true },
      { id: 'anapolis', coord: [-48.953200, -16.328600], label: 'Anápolis',      mini: '36 km · 40 min' },
      { id: 'goiania',  coord: [-49.253800, -16.686900], label: 'Goiânia',       mini: '96 km · 1h 20min' },
      { id: 'brasilia', coord: [-47.929500, -15.793900], label: 'Brasília',      mini: '112 km · 1h 30min' }
    ];

    map.on('load', function() {
      var features = points.slice(1).map(function(p) {
        return {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [points[0].coord, p.coord] }
        };
      });
      map.addSource('connections', { type: 'geojson', data: { type: 'FeatureCollection', features: features } });
      map.addLayer({
        id: 'connections',
        type: 'line',
        source: 'connections',
        paint: { 'line-color': '#C9A84C', 'line-width': 1, 'line-dasharray': [2, 2], 'line-opacity': 0.7 }
      });
    });

    points.forEach(function(p) {
      var markerEl = document.createElement('div');
      markerEl.className = 'map-marker' + (p.primary ? ' is-primary' : '');
      markerEl.innerHTML = '<div class="map-pin"></div><div class="map-tag"><span class="map-tag-label">' + p.label + '</span><span class="map-tag-mini">' + p.mini + '</span></div>';
      new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
        .setLngLat(p.coord)
        .addTo(map);
    });

    var bounds = new maplibregl.LngLatBounds();
    points.forEach(function(p) { bounds.extend(p.coord); });
    map.fitBounds(bounds, { padding: 60, duration: 0 });
  }

  // ─── Theme Toggle ────────────────────────────────────────────────────────
  document.getElementById('btn-theme').addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'light' ? 'dark' : 'light');
  });

  // ─── Admin ────────────────────────────────────────────────────────────────
  btnAdmin.addEventListener('click', openAdmin);

  var adminBtnExit = document.getElementById('admin-btn-exit');
  if (adminBtnExit) {
    adminBtnExit.addEventListener('click', function() {
      document.body.classList.remove('admin-mode');
    });
  }

  var adminBtnManual = document.getElementById('admin-btn-manual');
  var adminBtnIa = document.getElementById('admin-btn-ia');
  var adminBtnContent = document.getElementById('admin-btn-content');
  if (adminBtnManual) adminBtnManual.addEventListener('click', function() { alert('Demarcações Manual · Em desenvolvimento.'); });
  if (adminBtnIa) adminBtnIa.addEventListener('click', function() { alert('Demarcações IA · Em desenvolvimento.'); });
  if (adminBtnContent) adminBtnContent.addEventListener('click', function() { alert('Editar Conteúdo · Em desenvolvimento.'); });

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
    if (autorotating) stopAutorotate();
    else startAutorotate();
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
      if (presentationState.running) { stopPresentation(); return; }
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
