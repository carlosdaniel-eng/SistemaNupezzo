# Sistema Nupezzo

Sistema simples de gestão para empresa de salgados, com foco em:

- Cadastro de produtos
- Controle de estoque mínimo
- Registro de vendas com baixa automática no estoque
- Registro de despesas
- Relatórios e cálculo de lucro líquido

## Requisitos

- Python 3.10+

## Como executar

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Abra no navegador o endereço informado pelo Streamlit (normalmente `http://localhost:8501`).

## Banco de dados

- SQLite local em `nupezzo.db`
- O banco é criado automaticamente na primeira execução.
