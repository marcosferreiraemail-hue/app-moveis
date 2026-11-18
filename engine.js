/*
 * Motor de móveis planejados.
 * Recebe um módulo (tipo + medidas) e devolve as peças de MDF, as ferragens
 * e a posição de cada peça para o desenho 3D.
 * Todas as medidas em milímetros.
 */
(function (root) {
  'use strict';

  const TIPOS = {
    aereo: { nome: 'Armário aéreo', L: 800, A: 700, P: 330, portas: 2, prateleiras: 1, gavetas: 0 },
    balcao: { nome: 'Balcão de cozinha', L: 800, A: 820, P: 560, portas: 2, prateleiras: 1, gavetas: 0 },
    guardaRoupa: { nome: 'Guarda-roupa', L: 1200, A: 2300, P: 580, portas: 2, prateleiras: 1, gavetas: 0 }
  };

  const FOLGA_PORTA = 3; // mm entre portas e nas bordas
  const ESP_FUNDO = 6;
  const RODAPE = 100; // altura do rodapé (balcão e guarda-roupa)
  const TRAVESSA = 100; // largura das travessas do balcão
  const ALT_GAVETA_FRENTE = 180;

  function r(n) { return Math.round(n); }

  function dobradicasPorPorta(alturaPorta) {
    if (alturaPorta <= 900) return 2;
    if (alturaPorta <= 1600) return 3;
    if (alturaPorta <= 2000) return 4;
    return 5;
  }

  /**
   * peça: { cod, nome, qtd, comp, larg, esp, chapa, naoGirar, fitaC (0-2), fitaL (0-2), box: [{x,y,z,w,h,d}] }
   * comp = medida no sentido do veio.
   */
  function gerarModulo(mod, idx) {
    const e = Number(mod.esp) || 18;
    const L = Number(mod.L), A = Number(mod.A), P = Number(mod.P);
    const veio = !!mod.veio;
    const chapa = mod.chapa || ('MDF Branco TX ' + e + ' mm');
    const chapaFundo = mod.chapaFundo || ('MDF Branco ' + ESP_FUNDO + ' mm');
    const pref = String.fromCharCode(65 + (idx % 26));
    const pecas = [];
    const ferragens = {};
    const avisos = [];
    let n = 0;
    const add = (nome, qtd, comp, larg, opts) => {
      opts = opts || {};
      n += 1;
      pecas.push({
        cod: pref + n,
        modulo: mod.nome || TIPOS[mod.tipo].nome,
        nome, qtd, comp: r(comp), larg: r(larg),
        esp: opts.esp || e,
        chapa: opts.chapa || chapa,
        naoGirar: opts.naoGirar !== undefined ? opts.naoGirar : veio,
        fitaC: opts.fitaC || 0,
        fitaL: opts.fitaL || 0,
        box: opts.box || []
      });
    };
    const fer = (nome, qtd) => { ferragens[nome] = (ferragens[nome] || 0) + qtd; };

    const temRodape = mod.tipo !== 'aereo';
    const yBase = temRodape ? RODAPE : 0; // altura onde começa a caixa
    const Lint = L - 2 * e;
    const Pfrente = P - ESP_FUNDO; // fundo sobreposto atrás

    if (L < 150 || A < 150 || P < 100) avisos.push('Medidas muito pequenas para este móvel.');

    // Laterais (vão do chão ao topo)
    add('Lateral', 2, A, Pfrente, {
      fitaC: 1,
      box: [
        { x: 0, y: 0, z: 0, w: e, h: A, d: Pfrente },
        { x: L - e, y: 0, z: 0, w: e, h: A, d: Pfrente }
      ]
    });

    // Base
    add('Base', 1, Lint, Pfrente, { fitaC: 1, box: [{ x: e, y: yBase, z: 0, w: Lint, h: e, d: Pfrente }] });

    // Topo ou travessas
    if (mod.tipo === 'balcao') {
      add('Travessa superior', 2, Lint, TRAVESSA, {
        box: [
          { x: e, y: A - e, z: Pfrente - TRAVESSA, w: Lint, h: e, d: TRAVESSA },
          { x: e, y: A - e, z: 0, w: Lint, h: e, d: TRAVESSA }
        ]
      });
    } else {
      add('Topo', 1, Lint, Pfrente, { fitaC: 1, box: [{ x: e, y: A - e, z: 0, w: Lint, h: e, d: Pfrente }] });
    }

    // Rodapé
    if (temRodape) {
      add('Rodapé', 1, Lint, RODAPE, { fitaC: 1, box: [{ x: e, y: 0, z: Pfrente - 50 - e, w: Lint, h: RODAPE, d: e }] });
    }

    // Fundo
    const altFundo = A - yBase - 4;
    add('Fundo', 1, altFundo, L - 4, {
      esp: ESP_FUNDO, chapa: chapaFundo, naoGirar: false,
      box: [{ x: 2, y: yBase + 2, z: -ESP_FUNDO, w: L - 4, h: altFundo, d: ESP_FUNDO }]
    });
    fer('Prego/grampo para fundo (un.)', Math.ceil(2 * (L + altFundo) / 150));

    // Gavetas (só balcão)
    const nGav = mod.tipo === 'balcao' ? Math.max(0, Math.min(4, Number(mod.gavetas) || 0)) : 0;
    const altInterna = A - yBase - e - (mod.tipo === 'balcao' ? e : e);
    let altGavetas = 0;
    if (nGav > 0) {
      altGavetas = nGav * ALT_GAVETA_FRENTE;
      const compCorr = Math.max(250, Math.floor((Pfrente - 30) / 50) * 50);
      const caixaW = Lint - 26; // 12,7 mm de corrediça de cada lado
      const caixaH = ALT_GAVETA_FRENTE - 60;
      const frenteW = L - FOLGA_PORTA;
      const boxes = [];
      for (let i = 0; i < nGav; i++) {
        const y = A - (i + 1) * ALT_GAVETA_FRENTE;
        boxes.push({ x: FOLGA_PORTA / 2, y: y + FOLGA_PORTA / 2, z: P - ESP_FUNDO, w: frenteW, h: ALT_GAVETA_FRENTE - FOLGA_PORTA, d: e });
      }
      add('Frente de gaveta', nGav, frenteW, ALT_GAVETA_FRENTE - FOLGA_PORTA, { fitaC: 2, fitaL: 2, box: boxes });
      add('Lateral de gaveta', 2 * nGav, compCorr, caixaH, { esp: 15, chapa: 'MDF Branco 15 mm', naoGirar: false, fitaC: 1 });
      add('Contra-frente e traseira de gaveta', 2 * nGav, caixaW - 30, caixaH, { esp: 15, chapa: 'MDF Branco 15 mm', naoGirar: false, fitaC: 1 });
      add('Fundo de gaveta', nGav, compCorr - 2, caixaW - 2, { esp: ESP_FUNDO, chapa: chapaFundo, naoGirar: false });
      fer('Corrediça telescópica ' + compCorr + ' mm (par)', nGav);
      fer('Puxador', nGav);
    }

    // Prateleiras (no espaço abaixo das gavetas)
    const nPrat = Math.max(0, Math.min(8, Number(mod.prateleiras) || 0));
    if (nPrat > 0) {
      const topoLivre = A - e - altGavetas;
      const baseLivre = yBase + e;
      const passo = (topoLivre - baseLivre) / (nPrat + 1);
      const boxes = [];
      for (let i = 1; i <= nPrat; i++) boxes.push({ x: e + 1, y: baseLivre + passo * i, z: 0, w: Lint - 2, h: e, d: Pfrente - 20 });
      add('Prateleira', nPrat, Lint - 2, Pfrente - 20, { fitaC: 1, box: boxes });
      fer('Suporte de prateleira', 4 * nPrat);
      if (Lint > 900) avisos.push('Prateleira com mais de 90 cm pode envergar: considere uma divisória no meio.');
    }

    // Cabideiro
    if (mod.tipo === 'guardaRoupa') fer('Tubo cabideiro ' + r(Lint) + ' mm com 2 suportes', 1);

    // Portas (sobrepostas, cobrindo as laterais)
    const nPortas = Math.max(0, Math.min(6, Number(mod.portas) || 0));
    if (nPortas > 0) {
      const altPortas = A - yBase - altGavetas - FOLGA_PORTA;
      const wPorta = (L - FOLGA_PORTA - FOLGA_PORTA * (nPortas - 1)) / nPortas;
      const boxes = [];
      for (let i = 0; i < nPortas; i++) {
        boxes.push({ x: FOLGA_PORTA / 2 + i * (wPorta + FOLGA_PORTA), y: yBase + FOLGA_PORTA / 2, z: P - ESP_FUNDO, w: wPorta, h: altPortas, d: e });
      }
      add('Porta', nPortas, altPortas, wPorta, { fitaC: 2, fitaL: 2, box: boxes });
      fer('Dobradiça 35 mm com amortecedor', nPortas * dobradicasPorPorta(altPortas));
      fer('Puxador', nPortas);
      if (wPorta > 600) avisos.push('Porta com mais de 60 cm de largura: considere mais portas.');
    }

    // Uniões caixa: laterais x base/topo/travessas/rodapé
    const unioes = (mod.tipo === 'balcao' ? 4 : 2) + (temRodape ? 2 : 0) + 2;
    fer('Minifix ou cavilha (un.)', unioes * 2);
    fer('Parafuso 4,0 x 40 mm (un.)', unioes * 2);
    if (mod.tipo === 'aereo') fer('Suporte para pendurar armário aéreo (par)', 1);
    if (mod.tipo !== 'aereo') fer('Pé regulável ou sapata (un.)', 4);

    // Ajuste em L/A/P do módulo para o desenho: z do desenho cresce para a frente
    for (const p of pecas) for (const b of p.box) b.z += ESP_FUNDO;

    return { pecas, ferragens, avisos };
  }

  /** Regras da Cofel Laminados: corte mínimo 50 mm; não lamina lado < 100 mm. */
  function validarCofel(peca) {
    const avisos = [];
    const p = Object.assign({}, peca);
    if (p.comp < 50 || p.larg < 50) avisos.push(p.cod + ' ' + p.nome + ': menor que 50 mm, a Cofel não corta.');
    if (p.fitaC > 0 && p.comp < 100) { p.fitaC = 0; avisos.push(p.cod + ' ' + p.nome + ': lado de ' + p.comp + ' mm é menor que 100 mm, fita removida.'); }
    if (p.fitaL > 0 && p.larg < 100) { p.fitaL = 0; avisos.push(p.cod + ' ' + p.nome + ': lado de ' + p.larg + ' mm é menor que 100 mm, fita removida.'); }
    return { peca: p, avisos };
  }

  function gerarProjeto(projeto) {
    const pecas = [];
    const ferragens = {};
    const avisos = [];
    projeto.modulos.forEach((m, i) => {
      const res = gerarModulo(m, i);
      res.avisos.forEach((a) => avisos.push((m.nome || TIPOS[m.tipo].nome) + ': ' + a));
      res.pecas.forEach((p) => {
        const v = validarCofel(p);
        v.avisos.forEach((a) => avisos.push(a));
        pecas.push(v.peca);
      });
      for (const k in res.ferragens) ferragens[k] = (ferragens[k] || 0) + res.ferragens[k];
    });
    return { pecas, ferragens, avisos };
  }

  /** Agrupa as peças por chapa (uma aba por chapa na planilha da Cofel). */
  function porChapa(pecas) {
    const g = {};
    for (const p of pecas) (g[p.chapa] = g[p.chapa] || []).push(p);
    return g;
  }

  /** Área total de MDF por chapa, em m². */
  function areaPorChapa(pecas) {
    const g = {};
    for (const p of pecas) g[p.chapa] = (g[p.chapa] || 0) + (p.qtd * p.comp * p.larg) / 1e6;
    return g;
  }

  /** Linhas no layout da planilha "modelo-lista-de-medidas" da Cofel. */
  const COFEL_INSTRUCOES = [
    'LISTAGEM DE PEÇAS PARA CORTE',
    'LEIA AS INSTRUÇÕES ABAIXO ANTES DE PREENCHER A PLANILHA:',
    '* Informar as medidas em milímetros.',
    '* Devem ser informadas as medidas finais, com ou sem borda de acabamento.',
    '* Para orçamento com variedade de chapas (espessuras ou cores diferentes), utilizar uma planilha (abas) para cada uma delas.',
    '* Preencha nos campos abaixo o nome do CLIENTE e especifique qual CHAPA é para o respectivo projeto.',
    '* Assinalar com um "X" no campo NÃO GIRAR quando for necessário que o sentido do veio fique na direção do comprimento da peça (válido apenas para chapas de MDF padrões madeirados ou chapas de compensado).',
    '* Não laminamos laterais inferiores a 100mm; medida mínima para corte 50mm.',
    '* Pela ação natural de fatores externos, as peças cortadas tendem a empenar dependendo da sua aplicação no projeto. Consulte a opinião de um especialista e a necessidade de instalação de dispositivos anti-empenamento.'
  ];

  function linhasCofel(cliente, chapa, pecas) {
    const rows = [];
    // linhas 1 a 10 (índices 0-9): instruções
    rows.push([COFEL_INSTRUCOES[0]]);
    rows.push([COFEL_INSTRUCOES[1]]);
    rows.push([COFEL_INSTRUCOES[2]]);
    rows.push([]);
    for (let i = 3; i < COFEL_INSTRUCOES.length; i++) rows.push([COFEL_INSTRUCOES[i]]);
    while (rows.length < 11) rows.push([]);
    // linha 12: cliente e chapa
    rows.push(['CLIENTE:', cliente || '', '', ' CHAPA                             (cor e espessura):   ', chapa]);
    // linhas 13-16: cabeçalho
    rows.push(['QUANT. PEÇAS', 'COMPRIMENTO (milímetros)', 'LARGURA      (milímetros)', 'NÃO GIRAR?           (vide instruções)', 'LAMINAÇÃO                           (marcar c/ X)', '', '', '', 'DESCRIÇÃO DA PEÇA NO PROJETO (opcional)']);
    rows.push([]);
    rows.push(['', '', '', '', 'comprimento', '', 'largura', '']);
    rows.push([]);
    // linha 17 em diante: peças
    for (const p of pecas) {
      rows.push([
        p.qtd, p.comp, p.larg,
        p.naoGirar ? 'X' : '',
        p.fitaC >= 1 ? 'X' : '', p.fitaC >= 2 ? 'X' : '',
        p.fitaL >= 1 ? 'X' : '', p.fitaL >= 2 ? 'X' : '',
        p.cod + ' ' + p.nome + ' (' + p.modulo + ')'
      ]);
    }
    return rows;
  }

  const COFEL_MERGES = [
    [0, 0, 0, 8], [1, 1, 0, 8], [2, 3, 0, 8], [4, 4, 0, 8], [5, 5, 0, 8], [6, 6, 0, 8], [7, 7, 0, 8], [8, 8, 0, 8], [9, 10, 0, 8],
    [11, 11, 1, 2], [11, 11, 4, 8],
    [12, 15, 0, 0], [12, 15, 1, 1], [12, 15, 2, 2], [12, 15, 3, 3], [12, 13, 4, 7], [14, 14, 4, 5], [14, 14, 6, 7], [12, 15, 8, 8]
  ];

  const api = { TIPOS, gerarModulo, gerarProjeto, validarCofel, porChapa, areaPorChapa, linhasCofel, COFEL_MERGES, dobradicasPorPorta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Moveis = api;
})(typeof window !== 'undefined' ? window : globalThis);
