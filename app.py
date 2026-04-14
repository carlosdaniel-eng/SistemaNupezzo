import os
from datetime import date

import pandas as pd
import requests
import streamlit as st

API_URL = os.getenv("NUPEZZO_API_URL", "http://127.0.0.1:8000")


def api_get(path: str, params: dict | None = None):
    response = requests.get(f"{API_URL}{path}", params=params, timeout=15)
    response.raise_for_status()
    return response.json()


def api_post(path: str, payload: dict):
    response = requests.post(f"{API_URL}{path}", json=payload, timeout=15)
    response.raise_for_status()
    return response.json()


def aba_produtos() -> None:
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
        if preco < custo:
            st.warning("Preço abaixo do custo. Confirme se isso é intencional.")
        try:
            api_post(
                "/produtos",
                {
                    "nome": nome,
                    "categoria": categoria,
                    "custo": custo,
                    "preco": preco,
                    "estoque": estoque,
                    "estoque_minimo": estoque_min,
                },
            )
            st.success("Produto cadastrado com sucesso.")
        except requests.RequestException as exc:
            st.error(f"Erro ao cadastrar produto: {exc}")


def aba_vendas() -> None:
    st.subheader("Registro de venda")
    try:
        produtos = pd.DataFrame(api_get("/produtos/ativos"))
    except requests.RequestException as exc:
        st.error(f"Erro ao carregar produtos: {exc}")
        return

    if produtos.empty:
        st.info("Cadastre produtos antes de lançar vendas.")
        return

    opcoes = {f"{row['nome']} (estoque: {row['estoque']})": int(row["id"]) for _, row in produtos.iterrows()}
    with st.form("nova_venda"):
        escolhido = st.selectbox("Produto", list(opcoes.keys()))
        produto_id = opcoes[escolhido]
        qtd = st.number_input("Quantidade", min_value=1.0, step=1.0)
        desconto = st.number_input("Desconto (R$)", min_value=0.0, step=0.1)
        forma = st.selectbox("Forma de pagamento", ["Dinheiro", "PIX", "Cartão", "Fiado"])
        salvar = st.form_submit_button("Registrar venda")

    if salvar:
        try:
            resposta = api_post(
                "/vendas",
                {
                    "produto_id": produto_id,
                    "quantidade": qtd,
                    "desconto": desconto,
                    "forma_pagamento": forma,
                },
            )
            st.success(resposta.get("mensagem", "Venda registrada."))
        except requests.RequestException as exc:
            st.error(f"Erro ao registrar venda: {exc}")


def aba_despesas() -> None:
    st.subheader("Registro de despesas")
    with st.form("nova_despesa"):
        categoria = st.text_input("Categoria", value="Insumos")
        descricao = st.text_input("Descrição")
        valor = st.number_input("Valor (R$)", min_value=0.0, step=0.1)
        salvar = st.form_submit_button("Salvar despesa")

    if salvar:
        try:
            api_post("/despesas", {"categoria": categoria, "descricao": descricao, "valor": valor})
            st.success("Despesa registrada.")
        except requests.RequestException as exc:
            st.error(f"Erro ao registrar despesa: {exc}")


def aba_relatorios() -> None:
    st.subheader("Relatórios")
    c1, c2 = st.columns(2)
    inicio = c1.date_input("Data inicial", value=date.today().replace(day=1))
    fim = c2.date_input("Data final", value=date.today())
    if fim < inicio:
        st.error("A data final não pode ser menor que a inicial.")
        return

    inicio_str = f"{inicio.isoformat()} 00:00:00"
    fim_str = f"{fim.isoformat()} 23:59:59"

    try:
        vendas = pd.DataFrame(api_get("/relatorios/vendas", {"inicio": inicio_str, "fim": fim_str}))
        despesas = pd.DataFrame(api_get("/relatorios/despesas", {"inicio": inicio_str, "fim": fim_str}))
        estoque_baixo = pd.DataFrame(api_get("/relatorios/estoque-baixo"))
    except requests.RequestException as exc:
        st.error(f"Erro ao carregar relatórios: {exc}")
        return

    st.write("### Vendas")
    st.dataframe(vendas, use_container_width=True)
    st.download_button("Baixar vendas CSV", vendas.to_csv(index=False).encode("utf-8"), "vendas.csv", "text/csv")

    st.write("### Despesas")
    st.dataframe(despesas, use_container_width=True)
    st.download_button(
        "Baixar despesas CSV", despesas.to_csv(index=False).encode("utf-8"), "despesas.csv", "text/csv"
    )

    st.write("### Alerta de estoque baixo")
    st.dataframe(estoque_baixo, use_container_width=True)


def main() -> None:
    st.set_page_config(page_title="Nupezzo Gestão", page_icon="🥟", layout="wide")

    st.title("🥟 Nupezzo • Sistema de Gestão")
    st.caption("Frontend Streamlit + Backend FastAPI (HTTP).")
    st.code("Backend: uvicorn api:app --reload --port 8000\nFrontend: streamlit run app.py")

    try:
        api_get("/health")
    except requests.RequestException:
        st.error("Backend indisponível. Inicie a API FastAPI antes de usar o sistema.")
        st.stop()

    if st.button("Inserir dados de exemplo"):
        try:
            result = api_post("/seed", {})
            if result.get("inserted"):
                st.success("Dados de exemplo inseridos com sucesso.")
            else:
                st.info("Dados de exemplo já existem. Nenhuma ação feita.")
        except requests.RequestException as exc:
            st.error(f"Erro ao inserir dados: {exc}")

    try:
        m = api_get("/metricas")
    except requests.RequestException as exc:
        st.error(f"Erro ao carregar métricas: {exc}")
        st.stop()

    c1, c2, c3 = st.columns(3)
    c1.metric("Receita acumulada", f"R$ {m['receita']:,.2f}")
    c2.metric("Custos + despesas", f"R$ {m['custos']:,.2f}")
    c3.metric("Lucro líquido", f"R$ {m['lucro']:,.2f}")

    abas = st.tabs(["Produtos", "Vendas", "Despesas", "Relatórios"])
    with abas[0]:
        aba_produtos()
    with abas[1]:
        aba_vendas()
    with abas[2]:
        aba_despesas()
    with abas[3]:
        aba_relatorios()


if __name__ == "__main__":
    main()
