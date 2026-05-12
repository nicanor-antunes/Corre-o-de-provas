# CorrigeProvas SESI

Prototipo de plataforma para correcao de cartoes-resposta por gabarito, com importacao de alunos, geracao de cartoes imprimiveis, captura por camera/upload e exportacao de notas.

## Como usar localmente

Abra `index.html` diretamente no navegador ou rode:

```bash
node server.js
```

Depois acesse:

```text
http://127.0.0.1:4173
```

## Publicacao no GitHub Pages

Este projeto e estatico. Para publicar:

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para a raiz do repositorio.
3. No GitHub, entre em `Settings > Pages`.
4. Em `Build and deployment`, escolha `Deploy from a branch`.
5. Selecione a branch `main` e a pasta `/root`.
6. Salve e aguarde o link do GitHub Pages.

## Arquivos principais

- `index.html`: estrutura da interface.
- `styles.css`: design da plataforma e do cartao-resposta.
- `app.js`: logica de alunos, gabarito, camera, correcao simulada e exportacao.
- `logo-sesi.png`: logo usado na interface e no cartao-resposta.
- `server.js`: servidor local simples para testar camera via localhost.

## Observacao

A leitura das marcacoes ainda esta simulada. O proximo passo tecnico e implementar o reconhecimento real das bolhas e do identificador do aluno no cartao.
