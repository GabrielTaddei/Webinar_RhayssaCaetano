# From Retraction to Cementation — webinar Kulzer

Apresentação da Rhayssa (22 slides) em duas versões geradas do mesmo código:

- **Dinâmica:** `index.html`, para publicar no GitHub Pages.
- **Estática:** o PDF, gerado pela impressão do navegador a partir do mesmo `index.html`.

## Publicar no GitHub Pages

1. Suba **todo o conteúdo desta pasta** (`index.html`, `assets/`, `.nojekyll`) na raiz de um repositório.
2. Em *Settings → Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. A página fica disponível em `https://<usuario>.github.io/<repositorio>/`.

Cada slide tem endereço próprio: `.../#7` abre direto no slide 7.

## Durante o webinário

| Tecla | Ação |
|---|---|
| → / Espaço / clique | Próximo slide |
| ← | Slide anterior |
| F | Tela cheia |
| N | Mostra as falas (speaker notes) |
| P | Abre a janela do apresentador: falas, próximo slide e cronômetro. As duas janelas andam juntas. |
| G | Mostra todos os slides; clique em um para ir até ele |
| ? | Lista de atalhos |

Dica para o webinário: compartilhe só a janela da apresentação e deixe a janela do apresentador (P) no outro monitor.

No slide 13, a Rhayssa pode **arrastar a bolinha da linha do tempo** para mostrar que o tempo em boca continua sendo de 2:30.

## Trocar os textos pendentes

Os trechos marcados em laranja no slide estão no `index.html` como
`<span class="ph">[Your name]</span>`. Para trocar, escreva o texto real e apague o `<span class="ph">` em volta.

## Inserir as fotos

1. Coloque as fotos em `assets/photos/`. Use JPG com cerca de 1600 px no lado maior.
2. No `index.html`, troque cada moldura vazia, por exemplo:

```html
<figure class="photo empty"><figcaption class="ph-label">Photo: …</figcaption></figure>
```

por:

```html
<figure class="photo"><img src="assets/photos/retraxil-aplicacao.jpg" alt="RetraXil blue being applied"></figure>
```

Para escolher o enquadramento, adicione `style="object-position: 50% 30%"` no `<img>`.

## Gerar o PDF

1. Abra `index.html?print` no Chrome. Todos os slides aparecem em sequência.
2. Pressione Ctrl+P (ou Cmd+P) e escolha *Salvar como PDF*.
3. Em *Mais definições*, deixe as margens em *Nenhuma* e ative os *Gráficos de fundo*.

Cada slide sai em uma página 16:9, sem animações.

## Estrutura

- `assets/deck.css`: design system (cores, tipografia, layouts e transições).
- `assets/deck.js`: navegação, transições de capítulo, contadores, linha do tempo, notas e modo apresentador.
- `assets/*.svg`: logos vetorizados (Kulzer, RetraXil e iCEM) e o padrão isométrico do iCEM.
- `assets/fonts/`: Archivo, uma fonte livre (OFL) usada no lugar da Trade Gothic, que é a fonte corporativa da Kulzer e é licenciada.
