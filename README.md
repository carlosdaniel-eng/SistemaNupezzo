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

## Como acessar

- **Frontend (sistema):** `http://localhost:8501`
- **Backend API (documentação interativa):** `http://localhost:8000/docs`
- **Health check da API:** `http://localhost:8000/health`

> Opcional: para mudar o endereço da API, use a variável de ambiente `NUPEZZO_API_URL`.

## Como verificar se está funcionando

### 1) Verificar backend

```bash
curl http://localhost:8000/health
```

Resposta esperada:

```json
{"status":"ok"}
```

### 2) Ver métricas atuais

```bash
curl http://localhost:8000/metricas
```

### 3) Ver produtos ativos

```bash
curl http://localhost:8000/produtos/ativos
```

### 4) Usar interface web

Acesse `http://localhost:8501` e confira:

1. botão **Inserir dados de exemplo**;
2. aba **Produtos** para cadastro;
3. aba **Vendas** para registrar venda;
4. aba **Despesas** para registrar gastos;
5. aba **Relatórios** para filtrar período e exportar CSV.

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
