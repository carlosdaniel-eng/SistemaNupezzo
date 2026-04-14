# Sistema Nupezzo

Sistema de gestão para empresa de salgados com foco em operação diária:

- Cadastro de produtos com custo, preço e estoque mínimo
- Controle de estoque com baixa automática ao vender
- Registro de despesas por categoria
- Relatórios por período com exportação CSV
- Métricas de receita, custos e lucro líquido

## Requisitos

- Python 3.10+

## Instalação

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Executando frontend e backend separados

Terminal 1 (backend FastAPI):

```bash
uvicorn api:app --reload --port 8000
```

Terminal 2 (frontend Streamlit):

```bash
streamlit run app.py
```

Abra `http://localhost:8501` no navegador.

> Opcional: para mudar o endereço da API, use a variável de ambiente `NUPEZZO_API_URL`.

## Primeiro uso (passo a passo)

1. Inicie backend e frontend.
2. Clique em **Inserir dados de exemplo** (opcional).
3. Cadastre produtos na aba **Produtos**.
4. Registre vendas na aba **Vendas**.
5. Registre despesas na aba **Despesas**.
6. Analise resultados na aba **Relatórios**.

## Arquitetura

- `api.py`: backend REST com FastAPI + SQLite.
- `app.py`: frontend Streamlit consumindo a API via HTTP.
- `nupezzo.db`: banco local SQLite (criado automaticamente).
