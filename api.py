import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DB_PATH = Path("nupezzo.db")
app = FastAPI(title="Nupezzo API", version="1.0.0")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                categoria TEXT NOT NULL,
                custo REAL NOT NULL CHECK(custo >= 0),
                preco REAL NOT NULL CHECK(preco >= 0),
                estoque REAL NOT NULL DEFAULT 0 CHECK(estoque >= 0),
                estoque_minimo REAL NOT NULL DEFAULT 5 CHECK(estoque_minimo >= 0),
                ativo INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS vendas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                produto_id INTEGER NOT NULL,
                quantidade REAL NOT NULL CHECK(quantidade > 0),
                preco_unit REAL NOT NULL CHECK(preco_unit >= 0),
                desconto REAL NOT NULL DEFAULT 0 CHECK(desconto >= 0),
                forma_pagamento TEXT NOT NULL,
                FOREIGN KEY (produto_id) REFERENCES produtos(id)
            );

            CREATE TABLE IF NOT EXISTS despesas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                categoria TEXT NOT NULL,
                descricao TEXT,
                valor REAL NOT NULL CHECK(valor >= 0)
            );
            """
        )


def query_df(sql: str, params: tuple = ()) -> pd.DataFrame:
    with get_conn() as conn:
        return pd.read_sql_query(sql, conn, params=params)


class ProdutoIn(BaseModel):
    nome: str
    categoria: str
    custo: float = Field(ge=0)
    preco: float = Field(ge=0)
    estoque: float = Field(ge=0)
    estoque_minimo: float = Field(default=5, ge=0)


class VendaIn(BaseModel):
    produto_id: int
    quantidade: float = Field(gt=0)
    desconto: float = Field(default=0, ge=0)
    forma_pagamento: str


class DespesaIn(BaseModel):
    categoria: str
    descricao: str = ""
    valor: float = Field(ge=0)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/seed")
def seed() -> dict:
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM produtos").fetchone()[0]
        if total > 0:
            return {"inserted": False}
        produtos = [
            ("Coxinha", "Salgado", 2.50, 5.00, 120, 20),
            ("Kibe", "Salgado", 2.20, 4.50, 80, 15),
            ("Empada", "Salgado", 2.80, 6.00, 60, 10),
        ]
        conn.executemany(
            "INSERT INTO produtos (nome, categoria, custo, preco, estoque, estoque_minimo) VALUES (?, ?, ?, ?, ?, ?)",
            produtos,
        )
        conn.commit()
    return {"inserted": True}


@app.get("/produtos/ativos")
def listar_produtos_ativos() -> list[dict]:
    df = query_df("SELECT id, nome, preco, custo, estoque FROM produtos WHERE ativo = 1 ORDER BY nome")
    return df.to_dict(orient="records")


@app.post("/produtos")
def cadastrar_produto(produto: ProdutoIn) -> dict:
    if not produto.nome.strip():
        raise HTTPException(status_code=400, detail="Informe o nome do produto.")
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO produtos (nome, categoria, custo, preco, estoque, estoque_minimo) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    produto.nome.strip(),
                    produto.categoria.strip() or "Salgado",
                    produto.custo,
                    produto.preco,
                    produto.estoque,
                    produto.estoque_minimo,
                ),
            )
            conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Já existe um produto com esse nome.")
    return {"ok": True}


@app.post("/vendas")
def registrar_venda(venda: VendaIn) -> dict:
    produto_df = query_df("SELECT id, nome, preco, custo, estoque FROM produtos WHERE id = ?", (venda.produto_id,))
    if produto_df.empty:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto = produto_df.iloc[0]
    if venda.quantidade > float(produto["estoque"]):
        raise HTTPException(status_code=400, detail="Estoque insuficiente para essa venda.")

    total_bruto = venda.quantidade * float(produto["preco"])
    if venda.desconto > total_bruto:
        raise HTTPException(status_code=400, detail="Desconto não pode ser maior que o total da venda.")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        saldo = conn.execute("SELECT estoque FROM produtos WHERE id = ?", (venda.produto_id,)).fetchone()[0]
        if venda.quantidade > float(saldo):
            raise HTTPException(status_code=400, detail="Estoque foi alterado. Atualize a tela e tente novamente.")
        conn.execute(
            "INSERT INTO vendas (data, produto_id, quantidade, preco_unit, desconto, forma_pagamento) VALUES (?, ?, ?, ?, ?, ?)",
            (now, venda.produto_id, venda.quantidade, float(produto["preco"]), venda.desconto, venda.forma_pagamento),
        )
        conn.execute("UPDATE produtos SET estoque = estoque - ? WHERE id = ?", (venda.quantidade, venda.produto_id))
        conn.commit()

    lucro_estimado = (venda.quantidade * (float(produto["preco"]) - float(produto["custo"]))) - venda.desconto
    return {"ok": True, "mensagem": f"Venda registrada. Lucro estimado: R$ {lucro_estimado:,.2f}"}


@app.post("/despesas")
def registrar_despesa(despesa: DespesaIn) -> dict:
    data_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO despesas (data, categoria, descricao, valor) VALUES (?, ?, ?, ?)",
            (data_str, despesa.categoria.strip() or "Outros", despesa.descricao.strip(), despesa.valor),
        )
        conn.commit()
    return {"ok": True}


@app.get("/metricas")
def metricas() -> dict:
    receita = query_df("SELECT COALESCE(SUM((quantidade * preco_unit) - desconto), 0) AS total FROM vendas").iloc[0]["total"]
    custos = query_df(
        "SELECT COALESCE(SUM(v.quantidade * p.custo), 0) AS total FROM vendas v JOIN produtos p ON p.id = v.produto_id"
    ).iloc[0]["total"]
    despesas = query_df("SELECT COALESCE(SUM(valor), 0) AS total FROM despesas").iloc[0]["total"]
    lucro = float(receita) - float(custos) - float(despesas)
    return {"receita": float(receita), "custos": float(custos) + float(despesas), "lucro": lucro}


@app.get("/relatorios/vendas")
def relatorio_vendas(inicio: str, fim: str) -> list[dict]:
    df = query_df(
        """
        SELECT v.data, p.nome AS produto, v.quantidade,
               v.preco_unit, v.desconto,
               (v.quantidade * v.preco_unit) - v.desconto AS total
        FROM vendas v
        JOIN produtos p ON p.id = v.produto_id
        WHERE v.data BETWEEN ? AND ?
        ORDER BY v.data DESC
        """,
        (inicio, fim),
    )
    return df.to_dict(orient="records")


@app.get("/relatorios/despesas")
def relatorio_despesas(inicio: str, fim: str) -> list[dict]:
    df = query_df(
        "SELECT data, categoria, descricao, valor FROM despesas WHERE data BETWEEN ? AND ? ORDER BY data DESC",
        (inicio, fim),
    )
    return df.to_dict(orient="records")


@app.get("/relatorios/estoque-baixo")
def relatorio_estoque_baixo() -> list[dict]:
    df = query_df(
        "SELECT nome, estoque, estoque_minimo FROM produtos WHERE ativo = 1 AND estoque <= estoque_minimo ORDER BY estoque ASC"
    )
    return df.to_dict(orient="records")
