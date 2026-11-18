# Móveis Sob Medida

Site (e app instalável no Android) para projetar móveis planejados, gerar a lista de peças de MDF e exportar a planilha no modelo de importação da Cofel Laminados.

- Abra `index.html` por um servidor (ex.: `python3 -m http.server`).
- No Android com Chrome, o botão "Medir com a câmera" usa WebXR/ARCore (precisa de HTTPS).
- `engine.js`: regras de construção dos móveis e layout da planilha Cofel.
- `app.js`: telas, desenho 3D e exportação. `ar.js`: medição com a câmera.
- `vendor/`: three.js r128 e SheetJS 0.18.5.
