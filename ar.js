/*
 * Medição com a câmera usando WebXR (Chrome no Android com ARCore).
 * O usuário mira, toca para marcar o ponto 1 e o ponto 2, e o app mostra a distância em mm.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  function disponivel() {
    if (!navigator.xr || !navigator.xr.isSessionSupported) return Promise.resolve(false);
    return navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
  }

  async function iniciar(aoUsar) {
    const overlay = $('ar-overlay');
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: overlay }
    });
    overlay.hidden = false;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { xrCompatible: true });
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true });
    renderer.autoClear = false;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const mira = new THREE.Mesh(
      new THREE.RingGeometry(0.015, 0.022, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x6fb39f })
    );
    mira.matrixAutoUpdate = false;
    mira.visible = false;
    scene.add(mira);

    const pontos = [];
    const bolas = [];
    let linha = null;
    let ultimaMm = 0;

    const refSpace = await session.requestReferenceSpace('local');
    const viewerSpace = await session.requestReferenceSpace('viewer');
    const hitSource = await session.requestHitTestSource({ space: viewerSpace });

    function msg(t) { $('arMsg').textContent = t; }
    function limpar() {
      pontos.length = 0;
      bolas.forEach((b) => scene.remove(b)); bolas.length = 0;
      if (linha) { scene.remove(linha); linha = null; }
      ultimaMm = 0;
      $('arDist').textContent = '—';
      msg('Aponte para a parede e toque no primeiro ponto.');
    }

    function marcar() {
      if (!mira.visible) { msg('Ainda procurando a superfície. Mova o celular devagar.'); return; }
      if (pontos.length >= 2) limpar();
      const p = new THREE.Vector3().setFromMatrixPosition(mira.matrix);
      pontos.push(p);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      b.position.copy(p);
      scene.add(b); bolas.push(b);
      if (pontos.length === 2) {
        const g = new THREE.BufferGeometry().setFromPoints(pontos);
        linha = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff }));
        scene.add(linha);
        ultimaMm = Math.round(pontos[0].distanceTo(pontos[1]) * 1000);
        $('arDist').textContent = ultimaMm + ' mm';
        msg('Medida pronta. Escolha onde usar ou toque de novo para recomeçar.');
      } else {
        msg('Agora toque no segundo ponto.');
      }
    }

    // Toques na tela (fora dos botões) marcam pontos
    session.addEventListener('select', marcar);

    function usar(campo) {
      if (!ultimaMm) { msg('Marque os dois pontos primeiro.'); return; }
      aoUsar(campo, ultimaMm);
      msg('Usado: ' + ultimaMm + ' mm. Meça outra coisa ou toque em Sair.');
    }
    const botoes = {
      arUseL: () => usar('L'), arUseA: () => usar('A'), arUseP: () => usar('P'),
      arReset: limpar, arExit: () => session.end()
    };
    const handlers = {};
    for (const id in botoes) {
      handlers[id] = (e) => { e.stopPropagation(); botoes[id](); };
      $(id).addEventListener('click', handlers[id]);
      // impede que o toque no botão vire "select" na cena
      $(id).addEventListener('beforexrselect', (e) => e.preventDefault());
    }

    session.addEventListener('end', () => {
      overlay.hidden = true;
      for (const id in handlers) $(id).removeEventListener('click', handlers[id]);
      hitSource.cancel();
      renderer.setAnimationLoop(null);
      renderer.dispose();
    });

    renderer.setAnimationLoop((t, frame) => {
      if (!frame) return;
      const hits = frame.getHitTestResults(hitSource);
      if (hits.length) {
        const pose = hits[0].getPose(refSpace);
        mira.visible = true;
        mira.matrix.fromArray(pose.transform.matrix);
        if (pontos.length === 1) {
          const atual = new THREE.Vector3().setFromMatrixPosition(mira.matrix);
          $('arDist').textContent = Math.round(pontos[0].distanceTo(atual) * 1000) + ' mm';
        }
      } else {
        mira.visible = false;
      }
      renderer.render(scene, camera);
    });
    limpar();
  }

  window.MedidorAR = { disponivel, iniciar };
})();
