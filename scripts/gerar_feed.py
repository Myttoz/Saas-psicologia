"""Gera releases.xml (RSS 2.0) a partir das releases públicas do repositório.

É chamado pelo workflow de release depois que a nova release é criada. O
arquivo gerado é publicado pelo GitHub Pages e pode ser lido por widgets RSS
como o start.me, que nem sempre consegue acessar o feed do próprio GitHub.
"""

import html
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime

REPO = os.environ.get("GITHUB_REPOSITORY", "Myttoz/Saas-psicologia")
SAIDA = os.environ.get("FEED_SAIDA", "releases.xml")


def buscar_releases():
    url = f"https://api.github.com/repos/{REPO}/releases?per_page=100"
    headers = {
        "User-Agent": "gerar-feed-rss",
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GH_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    requisicao = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(requisicao, timeout=30) as resposta:
        return json.load(resposta)


def inline(texto):
    texto = html.escape(texto)
    texto = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", texto)
    texto = re.sub(r"`([^`]+)`", r"<code>\1</code>", texto)
    return texto


def markdown_simples(texto):
    """Converte o essencial do Markdown das notas para HTML simples."""
    saida, lista = [], []

    def fechar_lista():
        if lista:
            saida.append("<ul>" + "".join("<li>" + x + "</li>" for x in lista) + "</ul>")
            lista.clear()

    for linha in texto.split("\n") + [""]:
        linha = linha.strip()
        if not linha:
            fechar_lista()
        elif linha.startswith("### "):
            fechar_lista()
            saida.append("<h3>" + inline(linha[4:]) + "</h3>")
        elif linha.startswith("## "):
            fechar_lista()
            saida.append("<h2>" + inline(linha[3:]) + "</h2>")
        elif linha.startswith("# "):
            fechar_lista()
            saida.append("<h2>" + inline(linha[2:]) + "</h2>")
        elif linha.startswith("- "):
            lista.append(inline(linha[2:]))
        elif linha.startswith("---"):
            fechar_lista()
        else:
            fechar_lista()
            saida.append("<p>" + inline(linha) + "</p>")
    return "\n".join(saida)


def gerar(releases):
    itens = []
    for release in releases:
        if release.get("draft"):
            continue
        data = datetime.strptime(
            release["published_at"], "%Y-%m-%dT%H:%M:%SZ"
        ).replace(tzinfo=timezone.utc)
        titulo = html.escape(release.get("name") or release["tag_name"])
        link = html.escape(release["html_url"])
        guid = html.escape(release["tag_name"])
        descricao = markdown_simples(release.get("body") or "")
        itens.append(
            "<item>\n"
            f"  <title>{titulo}</title>\n"
            f"  <link>{link}</link>\n"
            f"  <guid isPermaLink=\"false\">{guid}</guid>\n"
            f"  <pubDate>{format_datetime(data, usegmt=True)}</pubDate>\n"
            f"  <description><![CDATA[{descricao}]]></description>\n"
            "</item>"
        )

    agora = format_datetime(datetime.now(timezone.utc), usegmt=True)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0">\n'
        "  <channel>\n"
        "    <title>Gestão de Pacientes — novidades</title>\n"
        "    <link>https://github.com/Myttoz/Saas-psicologia/releases</link>\n"
        "    <description>Versões e novidades do Gestão de Pacientes (SaaS by Myttoz).</description>\n"
        "    <language>pt-BR</language>\n"
        f"    <lastBuildDate>{agora}</lastBuildDate>\n"
        + "\n".join(itens)
        + "\n  </channel>\n</rss>\n"
    )


def main():
    feed = gerar(buscar_releases())
    with open(SAIDA, "w", encoding="utf-8") as arquivo:
        arquivo.write(feed)
    print("Feed gerado em", SAIDA)


if __name__ == "__main__":
    main()
