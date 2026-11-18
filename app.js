/* Tela principal: projeto, móveis, desenho 3D, plano de corte e exportação. */
(function () {
  'use strict';
  const M = window.Moveis;
  const $ = (id) => document.getElementById(id);
  const CHAVE = 'moveis-projeto-v1';

  // ---------- Estado ----------
  function novoModulo(tipo) {
    const t = M.TIPOS[tipo];
    return { tipo, nome: t.nome, L: t.L, A: t.A, P: t.P, portas: t.portas, prateleiras: t.prateleiras, gavetas: tipo === 'balcao' ? 1 : 0, esp: 18, cor: 'MDF Branco TX', veio: false };
  }
  function exemplo() {
    return { cliente: 'Cliente exemplo', ambiente: 'Cozinha', vao: { L: 1610, A: 2600, P: 600 }, modulos: [novoModulo('aereo'), novoModulo('balcao')], sel: 0 };
  }
  let st;
  try { st = JSON.parse(localStorage.getItem(CHAVE)) || exemplo(); } catch (e) { st = exemplo(); }
  if (!st.modulos || !st.modulos.length) st = exemplo();
  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) { /* sem armazenamento */ } }

  function moduloParaMotor(m) {
    return Object.assign({}, m, { chapa: m.cor + ' ' + m.esp + ' mm' });
  }
  function calcular() { return M.gerarProjeto({ modulos: st.modulos.map(moduloParaMotor) }); }

  // ---------- Formulários ----------
  const campos = ['nome', 'L', 'A', 'P', 'portas', 'prateleiras', 'gavetas', 'esp', 'cor', 'veio'];
  const numericos = { L: 1, A: 1, P: 1, portas: 1, prateleiras: 1, gavetas: 1, esp: 1 };

  function preencherEditor() {
    const m = st.modulos[st.sel];
    $('editor').hidden = !m;
    if (!m) return;
    for (const c of campos) {
      const el = $('m_' + c);
      if (c === 'veio') el.checked = !!m.veio; else el.value = m[c];
    }
    $('lblGav').hidden = m.tipo !== 'balcao';
  }

  for (const c of campos) {
    $('m_' + c).addEventListener('input', (ev) => {
      const m = st.modulos[st.sel];
      if (!m) return;
      if (c === 'veio') m.veio = ev.target.checked;
      else m[c] = numericos[c] ? Number(ev.target.value) || 0 : ev.target.value;
      atualizar(false);
    });
  }

  $('cliente').value = st.cliente || '';
  $('ambiente').value = st.ambiente || '';
  $('cliente').addEventListener('input', (e) => { st.cliente = e.target.value; salvar(); });
  $('ambiente').addEventListener('input', (e) => { st.ambiente = e.target.value; salvar(); });

  for (const k of ['L', 'A', 'P']) {
    $('vao' + k).value = st.vao[k] || '';
    $('vao' + k).addEventListener('input', (e) => { st.vao[k] = Number(e.target.value) || 0; salvar(); });
  }

  $('btnAdd').addEventListener('click', () => {
    st.modulos.push(novoModulo($('novoTipo').value));
    st.sel = st.modulos.length - 1;
    atualizar(true);
  });
  $('btnDel').addEventListener('click', () => {
    st.modulos.splice(st.sel, 1);
    st.sel = Math.max(0, st.sel - 1);
    atualizar(true);
  });
  $('btnEncaixar').addEventListener('click', () => {
    const m = st.modulos[st.sel];
    if (!m) return;
    const folga = 5; // mm de cada lado
    if (st.vao.L) m.L = st.vao.L - 2 * folga;
    if (st.vao.P) m.P = Math.min(st.vao.P, M.TIPOS[m.tipo].P);
    if (st.vao.A && m.tipo === 'guardaRoupa') m.A = st.vao.A - 2 * folga;
    atualizar(true);
  });

  // ---------- Lista de móveis ----------
  function desenharLista() {
    const box = $('mods');
    box.innerHTML = '';
    st.modulos.forEach((m, i) => {
      const d = document.createElement('div');
      d.className = 'mod' + (i === st.sel ? ' sel' : '');
      d.tabIndex = 0;
      d.innerHTML = '<span class="n"></span><span class="dim"></span>';
      d.querySelector('.n').textContent = String.fromCharCode(65 + (i % 26)) + ' · ' + m.nome;
      d.querySelector('.dim').textContent = m.L + ' × ' + m.A + ' × ' + m.P;
      const go = () => { st.sel = i; atualizar(true); };
      d.addEventListener('click', go);
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      box.appendChild(d);
    });
  }

  // ---------- Tabelas ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function desenharPecas(res) {
    const grupos = M.porChapa(res.pecas);
    const areas = M.areaPorChapa(res.pecas);
    let h = '<div class="scroll"><table><thead><tr><th>Cód.</th><th>Peça</th><th>Qtd</th><th>Comp.</th><th>Larg.</th><th>Não girar</th><th>Fita comp.</th><th>Fita larg.</th></tr></thead><tbody>';
    for (const chapa in grupos) {
      h += '<tr class="chapa"><td colspan="8">' + esc(chapa) + ' · ' + areas[chapa].toFixed(2).replace('.', ',') + ' m²</td></tr>';
      for (const p of grupos[chapa]) {
        h += '<tr><td>' + p.cod + '</td><td>' + esc(p.nome) + ' <span class="ok">(' + esc(p.modulo) + ')</span></td><td class="num">' + p.qtd + '</td><td class="num">' + p.comp + '</td><td class="num">' + p.larg + '</td><td class="x">' + (p.naoGirar ? 'X' : '') + '</td><td class="num">' + p.fitaC + '</td><td class="num">' + p.fitaL + '</td></tr>';
      }
    }
    h += '</tbody></table></div><p class="hint">Medidas finais em mm, já com a fita. "Fita" = quantos lados levam fita de borda.</p>';
    $('tab_pecas').innerHTML = h;
  }

  function desenharFerragens(res) {
    let h = '<table><thead><tr><th>Ferragem</th><th>Qtd</th></tr></thead><tbody>';
    Object.keys(res.ferragens).sort().forEach((k) => { h += '<tr><td>' + esc(k) + '</td><td class="num">' + res.ferragens[k] + '</td></tr>'; });
    $('tab_ferragens').innerHTML = h + '</tbody></table>';
  }

  function desenharMontagem(res) {
    const passos = [
      'Confira as etiquetas: cada peça tem um código (A1, A2...). A letra é o móvel.',
      'Fure as laterais para minifix/cavilha e para os suportes de prateleira.',
      'Monte a caixa: base e topo (ou travessas) entre as laterais. Confira o esquadro medindo as duas diagonais: devem ser iguais.',
      'Pregue o fundo de 6 mm por trás. Ele trava o esquadro.',
      'Instale o rodapé e os pés (balcão e guarda-roupa) ou os suportes de pendurar (aéreo).',
      'Fixe o móvel na parede e nivele.',
      'Monte as gavetas e instale as corrediças.',
      'Instale dobradiças e portas, regule as folgas (3 mm) e coloque os puxadores.',
      'Coloque prateleiras e cabideiro.'
    ];
    let h = '<ol class="steps">' + passos.map((p) => '<li>' + esc(p) + '</li>').join('') + '</ol>';
    h += '<h2 style="margin-top:16px">Etiquetas das peças</h2><div class="labels">';
    for (const p of res.pecas) {
      for (let i = 1; i <= p.qtd; i++) {
        h += '<div class="label"><b>' + p.cod + (p.qtd > 1 ? '-' + i : '') + '</b>' + esc(p.nome) + '<br>' + esc(p.modulo) + '<br><span class="ok">' + p.comp + ' × ' + p.larg + ' × ' + p.esp + ' mm</span></div>';
      }
    }
    $('tab_montagem').innerHTML = h + '</div>';
  }

  function desenharAvisos(res) {
    $('avisos').innerHTML = res.avisos.length
      ? '<div class="warn"><b>Confira antes de cortar</b><ul>' + res.avisos.map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul></div>'
      : '';
    $('avisos').style.marginBottom = res.avisos.length ? '10px' : '0';
  }

  document.querySelectorAll('.tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
      ['pecas', 'ferragens', 'montagem'].forEach((t) => { $('tab_' + t).hidden = t !== b.dataset.tab; });
    });
  });

  // ---------- Exportação ----------
  function nomeArquivo(ext) {
    const base = ((st.cliente || 'projeto') + '-' + (st.ambiente || '')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return 'plano-de-corte-' + base + '.' + ext;
  }

  $('btnXlsx').addEventListener('click', () => {
    const res = calcular();
    const wb = XLSX.utils.book_new();
    const grupos = M.porChapa(res.pecas);
    let i = 1;
    for (const chapa in grupos) {
      const ws = XLSX.utils.aoa_to_sheet(M.linhasCofel(st.cliente, chapa, grupos[chapa]));
      ws['!merges'] = M.COFEL_MERGES.map((m) => ({ s: { r: m[0], c: m[2] }, e: { r: m[1], c: m[3] } }));
      ws['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 46 }];
      XLSX.utils.book_append_sheet(wb, ws, 'PLANO DE CORTE' + i);
      i += 1;
    }
    XLSX.writeFile(wb, nomeArquivo('xlsx'));
  });

  $('btnCsv').addEventListener('click', () => {
    const res = calcular();
    const linhas = [['chapa', 'codigo', 'peca', 'modulo', 'quantidade', 'comprimento_mm', 'largura_mm', 'espessura_mm', 'nao_girar', 'fita_lados_comprimento', 'fita_lados_largura']];
    for (const p of res.pecas) linhas.push([p.chapa, p.cod, p.nome, p.modulo, p.qtd, p.comp, p.larg, p.esp, p.naoGirar ? 'X' : '', p.fitaC, p.fitaL]);
    const csv = linhas.map((l) => l.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo('csv');
    document.body.appendChild(a); a.click(); a.remove();
  });

  // ---------- Desenho 3D ----------
  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 10, 50000);
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sol = new THREE.DirectionalLight(0xffffff, 0.6);
  sol.position.set(1, 2, 3);
  scene.add(sol);
  const grupo = new THREE.Group();
  scene.add(grupo);
  let rotY = -0.5, rotX = 0.25, dist = 3000, centro = new THREE.Vector3();

  const cores = { Porta: 0xe8dcc6, 'Frente de gaveta': 0xe8dcc6, Fundo: 0xb9b2a5 };
  function corPeca(nome) { return cores[nome] || 0xd8c4a0; }

  function desenhar3D() {
    while (grupo.children.length) grupo.remove(grupo.children[0]);
    const m = st.modulos[st.sel];
    $('viewTitle').textContent = m ? 'Desenho · ' + m.nome : 'Desenho';
    if (!m) { renderizar(); return; }
    const res = M.gerarModulo(moduloParaMotor(m), st.sel);
    for (const p of res.pecas) {
      for (const b of p.box) {
        const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
        const mat = new THREE.MeshLambertMaterial({ color: corPeca(p.nome), transparent: p.nome === 'Porta' || p.nome === 'Frente de gaveta', opacity: 0.55 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2);
        grupo.add(mesh);
        const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x5a4a32 }));
        ed.position.copy(mesh.position);
        grupo.add(ed);
      }
    }
    centro.set(m.L / 2, m.A / 2, m.P / 2);
    dist = Math.max(m.L, m.A, m.P) * 2.4;
    renderizar();
  }

  function renderizar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      centro.x + dist * Math.sin(rotY) * Math.cos(rotX),
      centro.y + dist * Math.sin(rotX),
      centro.z + dist * Math.cos(rotY) * Math.cos(rotX)
    );
    camera.lookAt(centro);
    renderer.render(scene, camera);
  }

  let arrastando = null;
  canvas.addEventListener('pointerdown', (e) => { arrastando = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    rotY -= (e.clientX - arrastando.x) * 0.01;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - arrastando.y) * 0.01));
    arrastando = { x: e.clientX, y: e.clientY };
    renderizar();
  });
  canvas.addEventListener('pointerup', () => { arrastando = null; });
  window.addEventListener('resize', renderizar);

  // ---------- Medição com câmera (Android/Chrome) ----------
  if (window.MedidorAR) {
    window.MedidorAR.disponivel().then((ok) => {
      $('btnAR').hidden = !ok;
      if (ok) $('arHint').textContent = 'Toque em "Medir com a câmera" e marque dois pontos. A câmera erra alguns centímetros: confira com a trena antes de cortar.';
    });
    $('btnAR').addEventListener('click', () => {
      window.MedidorAR.iniciar((campo, mm) => {
        st.vao[campo] = mm;
        $('vao' + campo).value = mm;
        salvar();
      });
    });
  }

  // ---------- Atualização ----------
  function atualizar(trocouModulo) {
    salvar();
    desenharLista();
    if (trocouModulo) preencherEditor();
    const res = calcular();
    desenharAvisos(res);
    desenharPecas(res);
    desenharFerragens(res);
    desenharMontagem(res);
    desenhar3D();
  }
  atualizar(true);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
