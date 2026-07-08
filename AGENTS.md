# Grand Theft Auto VI - Projeto de Pré-venda

## Visão Geral
Site de pré-venda do GTA VI com páginas de checkout para PlayStation e Xbox, hospedado no **GitHub Pages** com domínio personalizado `brasilrockstargames.store`.

## Repositório
- **GitHub:** `github.com/jgjads1-tech/grand-theft-auto-vi`
- **Branch:** `master`
- **Domínio:** https://brasilrockstargames.store

## Estrutura do Projeto

| Arquivo/Pasta | Descrição |
|---|---|
| `index.html` | Página inicial (WordPress/KidsFlix com tema Rockstar) |
| `checkout.html` | Checkout GTA VI (estilo PlayStation) com formulário PIX |
| `checkout-ps.html` | Checkout PlayStation (alternativo) |
| `checkout-xbox.html` | Checkout Xbox Store (PDP real) com formulário PIX |
| `checkout-ultimate.html` | Checkout GTA VI: Ultimate Edition (R$ 549,90) com formulário PIX |
| `checkout-xbox-standard.html` | Checkout Xbox GTA VI Standard (R$ 449,90) estilo Xbox Store |
| `xbox-store.html` | Página da loja Xbox |
| `xbox.com/` | Assets da Xbox Store (JS, CSS, imagens) |
| `playstation.com/` | Assets da PlayStation Store |
| `css/`, `js/`, `fonts/`, `images/` | Assets estáticos |
| `CNAME` | Configuração do domínio personalizado |

## Funcionalidades
- **Checkouts com PIX** via SyncPay (simulador/real)
- **Clone visual** das páginas oficiais da PlayStation Store e Xbox Store
- **GitHub Pages** com deploy automático via push na branch `master`

## Commits Recentes
- `5935d0a` - retry deploy
- `5fbc83e` - Remove seções: Mostrar mais, Publicado por, Desenvolvido por, etc.
- `82d6abe` - fix: remove BOM and extra section close tag
- `302d0a3` - checkout-xbox: remove tabs, seções de produto e formulário PIX
- Histórico completo de remoção de elementos indesejados (cabeçalho UHF, galeria, comparar edições)

## Padrões de Desenvolvimento
- HTML e CSS inline (sem frameworks)
- Fonte: Inter (Google Fonts)
- Tema escuro (#000) com gradientes roxos/rosa
- Ícones do Elementor
- Formulários PIX com campos de valor e CPF

## Observações
- O projeto começou como um clone/scraping das páginas oficiais
- Foram feitas várias limpezas e adaptações (remoção de tabs, BOM, seções indesejadas)
- O foco atual é ter páginas de checkout funcionais com PIX
