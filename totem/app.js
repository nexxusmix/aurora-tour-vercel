(function () {
  'use strict';

  var page = document.body.dataset.page;

  /* ── Standby: qualquer toque navega pro menu ── */
  if (page === 'standby') {
    var go = function () { location.href = 'menu.html'; };
    document.body.addEventListener('click', go);
    document.body.addEventListener('touchend', go, { passive: true });
    return;
  }

  /* ── Detecção de orientação ── */
  function detectOrientation() {
    var w = window.innerWidth, h = window.innerHeight;
    document.body.classList.toggle('is-vertical',  h > w);
    document.body.classList.toggle('is-landscape', w >= h);
  }
  detectOrientation();
  window.addEventListener('resize',            detectOrientation);
  window.addEventListener('orientationchange', detectOrientation);

  /* ── Idle timeout: 90s sem interação → volta ao standby ── */
  var idleTimer;
  var resetIdle = function () {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { location.href = 'index.html'; }, 90000);
  };
  ['click', 'touchstart', 'mousemove', 'keydown', 'scroll'].forEach(function (ev) {
    document.addEventListener(ev, resetIdle, { passive: true });
  });
  resetIdle();

  /* ── Menu: stagger reveal + burger ── */
  if (page === 'menu') {
    document.querySelectorAll('.card').forEach(function (c, i) {
      c.style.opacity   = '0';
      c.style.transform = 'translateY(14px)';
      c.style.transition =
        'opacity 720ms cubic-bezier(0.16,1,0.3,1) ' + (i * 44) + 'ms, ' +
        'transform 720ms cubic-bezier(0.16,1,0.3,1) ' + (i * 44) + 'ms, ' +
        'border-color var(--t), box-shadow var(--t)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          c.style.opacity   = '1';
          c.style.transform = 'translateY(0)';
        });
      });
    });

    var burger = document.getElementById('totem-burger');
    if (burger) burger.addEventListener('click', function () { location.href = 'index.html'; });
  }

  /* ── Seção ── */
  if (page === 'secao') {
    var back = document.querySelector('.secao-back');
    if (back) back.addEventListener('click', function () { location.href = 'menu.html'; });

    var params = new URLSearchParams(location.search);
    var id = params.get('id') || 'aurora';
    renderSection(id);
  }

  /* ── Conteúdo das seções ── */
  function renderSection(id) {
    var sections = {
      jornada: {
        mini:  'Minha Jornada',
        title: 'Criando Meu Oásis',
        lead:  'Personalize sua jornada. Defina o estilo de vida que combina com você e descubra como o Aurora Oasis se conecta às suas preferências.',
        body:  '<p>A experiência interativa começa por você. Imagine, escolha e visualize o seu refúgio.</p>',
        bg:    'card-01.jpg'
      },
      silva: {
        mini:  'Silva Investimentos',
        title: 'Tradição que entrega.',
        lead:  'Empreendedora com DNA de disciplina de longo prazo, respeito pelo entorno e compromisso com legado.',
        body:  '<p>Aurora Oasis é o projeto-âncora do portfólio em Lago Corumbá IV. Credibilidade, segurança e compromisso com o legado.</p>',
        bg:    'card-02.jpg'
      },
      lago: {
        mini:  'O Lugar',
        title: 'Lago Corumbá IV.',
        lead:  'O paraíso natural ao redor do empreendimento. Espelho d\'água, cerrado e céu aberto.',
        body:  '<p>Frente d\'água ininterrupta. Margens preservadas. O cerrado nativo como pano de fundo da vida.</p>',
        bg:    'card-03.jpg'
      },
      aurora: {
        mini:  'Aurora Oasis',
        title: 'Onde o tempo mora.',
        lead:  'Um endereço para quem entendeu que o tempo é o verdadeiro luxo.',
        body:  '<p>Cerrado preservado, frente para o lago e arquitetura assinada. Urbanismo de baixa densidade. Privacidade real com vistas amplas.</p><h2>Quatro pilares</h2><p><strong>Presença.</strong> O tempo desacelera para quem sabe vivê-lo.</p><p><strong>Exclusividade.</strong> Cada nome foi escolhido.</p><p><strong>Refúgio.</strong> Um silêncio onde o essencial reaparece.</p><p><strong>O Primordial.</strong> Conexão com o cerrado, o lago, a hora dourada e o céu.</p>',
        bg:    'card-04.jpg'
      },
      imagens: {
        mini:  'Galeria',
        title: 'Aurora em peças finais.',
        lead:  'Capas editoriais, magazine e materiais de comunicação aprovados.',
        body:  '<p>Galeria interativa. Toque em qualquer imagem para ver em tela cheia.</p>',
        bg:    'card-05.jpg'
      },
      videos: {
        mini:  'Vídeos',
        title: 'Aurora em movimento.',
        lead:  'Captações aéreas e manifesto editorial. Aurora visto pelo céu, em ritmo cinematográfico.',
        body:  '<p>Toque em qualquer vídeo abaixo para reproduzir em tela cheia.</p>',
        bg:    'card-06.jpg'
      },
      tour: {
        mini:     'Tour Virtual 360°',
        title:    'Explore Aurora pessoalmente.',
        lead:     'Cinema esférico interativo. Cada cena é uma porta aberta.',
        body:     '<p>Você será redirecionado para o tour 360° em alguns segundos...</p>',
        bg:       'card-07.jpg',
        redirect: '/'
      },
      estilo: {
        mini:  'Estilo de Vida Aurora',
        title: 'A vida que se sente.',
        lead:  'Imagine, crie desejo e visualize o sonho.',
        body:  '<p>Apresentação cinematográfica do estilo de vida Aurora Oasis. Mais vida, menos espera.</p>',
        bg:    'card-08.jpg'
      },
      investimento: {
        mini:  'Investimento & Rentabilidade',
        title: 'Retorno financeiro e valorização.',
        lead:  'Aurora Oasis combina segunda residência premium com potencial de valorização real.',
        body:  '<p>Análise comparativa com gráficos interativos. Lotes amplos a partir de 500m². Valores e condições especiais sob consulta.</p>',
        bg:    'card-09.jpg'
      },
      disponibilidade: {
        mini:  'Disponibilidade, Lotes e Condições',
        title: 'Tabela em tempo real.',
        lead:  'Lotes disponíveis, valores e condições especiais de compra. Atualizado pela equipe Silva Investimentos.',
        body:  '<p>Frente-lago · Vista parcial · Mata cerrado. Filtros dinâmicos por categoria.</p>',
        bg:    'card-10.jpg'
      },
      localizacao: {
        mini:  'Localização',
        title: 'Lago Corumbá IV.',
        lead:  'Abadiânia · Goiás. 1h de Anápolis · 1h40 de Goiânia · 2h20 de Brasília.',
        body:  '<p>Coordenadas: -16.274689 · -48.464529. Posição estratégica entre os três centros.</p>',
        bg:    'card-11.jpg'
      }
    };

    var s = sections[id] || sections.aurora;

    var heroBg   = document.querySelector('.secao-hero-bg');
    var miniEl   = document.querySelector('.secao-mini');
    var titleEl  = document.querySelector('.secao-title');
    var leadEl   = document.querySelector('.secao-lead');
    var bodyEl   = document.querySelector('.secao-body');

    if (heroBg)  heroBg.style.backgroundImage = 'url(img/' + s.bg + ')';
    if (miniEl)  miniEl.textContent  = s.mini;
    if (titleEl) titleEl.textContent = s.title;
    if (leadEl)  leadEl.textContent  = s.lead;
    if (bodyEl)  bodyEl.innerHTML    = s.body;

    document.title = 'Aurora Oasis · ' + s.mini;

    if (s.redirect) {
      setTimeout(function () { location.href = s.redirect; }, 2400);
    }
  }
})();
