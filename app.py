import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st

DB_PATH = Path("nupezzo.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                categoria TEXT NOT NULL,
                custo REAL NOT NULL,
                preco REAL NOT NULL,
                estoque REAL NOT NULL DEFAULT 0,
                estoque_minimo REAL NOT NULL DEFAULT 5,
                ativo INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS vendas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                produto_id INTEGER NOT NULL,
                quantidade REAL NOT NULL,
                preco_unit REAL NOT NULL,
                desconto REAL NOT NULL DEFAULT 0,
                forma_pagamento TEXT NOT NULL,
                FOREIGN KEY (produto_id) REFERENCES produtos(id)
            );

            CREATE TABLE IF NOT EXISTS despesas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                categoria TEXT NOT NULL,
                descricao TEXT,
                valor REAL NOT NULL
            );
            """
        )


def query_df(sql: str, params: tuple = ()) -> pd.DataFrame:
    with get_conn() as conn:
        return pd.read_sql_query(sql, conn, params=params)


def metricas() -> tuple[float, float, float]:
    receita = query_df(
        "SELECT COALESCE(SUM((quantidade * preco_unit) - desconto), 0) AS total FROM vendas"
    ).iloc[0]["total"]
    custos = query_df(
        """
        SELECT COALESCE(SUM(v.quantidade * p.custo), 0) AS total
        FROM vendas v
        JOIN produtos p ON p.id = v.produto_id
        """
    ).iloc[0]["total"]
    despesas = query_df("SELECT COALESCE(SUM(valor), 0) AS total FROM despesas").iloc[0]["total"]
    lucro = receita - custos - despesas
    return float(receita), float(custos + despesas), float(lucro)


def cadastrar_produto() -> None:
    st.subheader("Cadastro de produtos")
    with st.form("novo_produto"):
        nome = st.text_input("Nome")
        categoria = st.text_input("Categoria", value="Salgado")
        c1, c2, c3, c4 = st.columns(4)
        custo = c1.number_input("Custo (R$)", min_value=0.0, step=0.1)
        preco = c2.number_input("Preço (R$)", min_value=0.0, step=0.1)
        estoque = c3.number_input("Estoque", min_value=0.0, step=1.0)
        estoque_min = c4.number_input("Mínimo", min_value=0.0, step=1.0, value=5.0)
        enviar = st.form_submit_button("Salvar produto")

    if enviar:
        if not nome.strip():
            st.error("Informe o nome do produto.")
            return
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO produtos (nome, categoria, custo, preco, estoque, estoque_minimo)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (nome.strip(), categoria.strip() or "Salgado", custo, preco, estoque, estoque_min),
            )
            conn.commit()
        st.success("Produto cadastrado com sucesso.")


def registrar_venda() -> None:
    st.subheader("Registro de venda")
    produtos = query_df("SELECT id, nome, preco, estoque FROM produtos WHERE ativo = 1 ORDER BY nome")
    if produtos.empty:
        st.info("Cadastre produtos antes de lançar vendas.")
        return

    opcoes = {f"{row['nome']} (estoque: {row['estoque']})": int(row["id"]) for _, row in produtos.iterrows()}
    with st.form("nova_venda"):
        escolhido = st.selectbox("Produto", list(opcoes.keys()))
        produto_id = opcoes[escolhido]
        produto = produtos[produtos["id"] == produto_id].iloc[0]
        qtd = st.number_input("Quantidade", min_value=1.0, step=1.0)
        desconto = st.number_input("Desconto (R$)", min_value=0.0, step=0.1)
        forma = st.selectbox("Forma de pagamento", ["Dinheiro", "PIX", "Cartão", "Fiado"])
        salvar = st.form_submit_button("Registrar venda")

    if salvar:
        if qtd > float(produto["estoque"]):
            st.error("Estoque insuficiente para essa venda.")
            return
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO vendas (data, produto_id, quantidade, preco_unit, desconto, forma_pagamento)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (now, produto_id, qtd, float(produto["preco"]), desconto, forma),
            )
            conn.execute(
                "UPDATE produtos SET estoque = estoque - ? WHERE id = ?",
                (qtd, produto_id),
            )
            conn.commit()
        st.success("Venda registrada.")


def registrar_despesa() -> None:
    st.subheader("Registro de despesas")
    with st.form("nova_despesa"):
        categoria = st.text_input("Categoria", value="Insumos")
        descricao = st.text_input("Descrição")
        valor = st.number_input("Valor (R$)", min_value=0.0, step=0.1)
        salvar = st.form_submit_button("Salvar despesa")

    if salvar:
        data = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO despesas (data, categoria, descricao, valor) VALUES (?, ?, ?, ?)",
                (data, categoria.strip() or "Outros", descricao.strip(), valor),
            )
            conn.commit()
        st.success("Despesa registrada.")


def exibir_relatorios() -> None:
    st.subheader("Relatórios")
    vendas = query_df(
        """
        SELECT v.data, p.nome AS produto, v.quantidade,
               v.preco_unit, v.desconto,
               (v.quantidade * v.preco_unit) - v.desconto AS total
        FROM vendas v
        JOIN produtos p ON p.id = v.produto_id
        ORDER BY v.data DESC
        """
    )
    despesas = query_df("SELECT data, categoria, descricao, valor FROM despesas ORDER BY data DESC")
    estoque_baixo = query_df(
        """
        SELECT nome, estoque, estoque_minimo
        FROM produtos
        WHERE ativo = 1 AND estoque <= estoque_minimo
        ORDER BY estoque ASC
        """
    )

    st.write("### Vendas")
    st.dataframe(vendas, use_container_width=True)
    st.write("### Despesas")
    st.dataframe(despesas, use_container_width=True)
    st.write("### Alerta de estoque baixo")
    st.dataframe(estoque_baixo, use_container_width=True)


def main() -> None:
    st.set_page_config(page_title="Nupezzo Gestão", page_icon="🥟", layout="wide")
    init_db()

    st.title("🥟 Nupezzo • Sistema de Gestão")
    receita, custos, lucro = metricas()
    c1, c2, c3 = st.columns(3)
    c1.metric("Receita acumulada", f"R$ {receita:,.2f}")
    c2.metric("Custos + despesas", f"R$ {custos:,.2f}")
    c3.metric("Lucro líquido", f"R$ {lucro:,.2f}")

    abas = st.tabs(["Produtos", "Vendas", "Despesas", "Relatórios"])
    with abas[0]:
        cadastrar_produto()
    with abas[1]:
        registrar_venda()
    with abas[2]:
        registrar_despesa()
    with abas[3]:
        exibir_relatorios()


if __name__ == "__main__":
    main()
