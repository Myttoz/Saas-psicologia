"""Gera releases.xml e releases.rss com TODAS as versões do repositório.

Usa as tags locais (v1.0.0, v1.1.0...) como fonte, em vez da lista de releases
da API. Isso evita dois problemas que aconteceram: a API demora alguns segundos
para mostrar uma release recém-criada, e um commit feito pelo próprio GitHub
Actions não dispara uma nova publicação do Pages. Com as tags, o feed sai
completo e idêntico ao que aparece em "Releases" no GitHub.
"""

import html
import json
import os
import re
import subprocess
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.environ.get("GITHUB_REPOSITORY", "Myttoz/Saas-psicologia")
SAIDA = os.environ.get("FEED_SAIDA", "releases.xml")
SAIDA_RSS = os.environ.get("FEED_SAIDA_RSS", "releases.rss")
URL_RSS = "https://myttoz.github.io/Saas-psicologia/releases.rss"
PADRAO_TAG = re.compile(r"^v\d+\.\d+\.\d+$")


def _data(texto):
    texto = (texto or "").strip()
    for formato in ("%Y-%m-%d %H:%M:%S %z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(texto, formato)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)


def ler_notas(tag):
    caminho = os.path.join(RAIZ, "RELEASE_NOTES_%s.md" % tag)
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return arquivo.read()
    except OSError:
        return ""


def releases_por_tags():
    """Lê todas as tags vX.Y.Z com a data em que foram criadas."""
    formato = "%(refname:short)%09%(creatordate:iso8601)%09%(contents:subject)"
    try:
        saida = subprocess.check_output(
            ["git", "for-each-ref", "--sort=-creatordate", "--format=" + formato, "refs/tags"],
            cwd=RAIZ, text=True, stderr=subprocess.DEVNULL, timeout=20
        )
    except Exception:
        return []

    itens = []
    for linha in saida.splitlines():
        partes = linha.split("\t")
        if len(partes) < 3:
            continue
        tag = partes[0].strip()
        if not PADRAO_TAG.match(tag):
            continue
        data = _data(partes[1]).astimezone(timezone.utc)
        corpo = ler_notas(tag) or partes[2].strip() or ("Versão %s." % tag)
        itens.append({
            "tag_name": tag,
            "name": tag,
            "html_url": "https://github.com/%s/releases/tag/%s" % (REPO, tag),
            "published_at": data.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "body": corpo,
            "draft": False,
        })
    return itens


def releases_por_api():
    """Fallback para quando o script roda fora de um repositório com tags."""
    url = "https://api.github.com/repos/%s/releases?per_page=100" % REPO
    headers = {
        "User-Agent": "gerar-feed-rss",
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GH_TOKEN", "")
    if token:
        headers["Authorization"] = "Bearer " + token
    requisicao = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(requisicao, timeout=30) as resposta:
        return json.load(resposta)


def buscar_releases():
    locais = releases_por_tags()
    return locais if locais else releases_por_api()


def inline(texto):
    texto = html.escape(texto)
    texto = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", texto)
    texto = re.sub(r"`([^`]+)`", r"<code>\1</code>", texto)
    return texto


def markdown_simples(texto):
    """Converte o essencial do Markdown das notas para HTML simples."""
    saida, lista, paragrafo = [], [], []

    def fechar_lista():
        if lista:
            saida.append("<ul>" + "".join("<li>" + x + "</li>" for x in lista) + "</ul>")
            lista.clear()

    def fechar_paragrafo():
        if paragrafo:
            saida.append("<p>" + " ".join(paragrafo) + "</p>")
            paragrafo.clear()

    for bruto in texto.split("\n") + [""]:
        linha = bruto.strip()
        indentado = bruto[:1] in (" ", "\t")
        if not linha:
            fechar_paragrafo()
            fechar_lista()
        elif indentado and lista:
            # Continuação de um item de lista (as notas são quebradas em várias
            # linhas); junta ao item anterior em vez de criar outro parágrafo.
            lista[-1] += " " + inline(linha)
        elif indentado and paragrafo:
            paragrafo.append(inline(linha))
        elif linha.startswith("### "):
            fechar_paragrafo(); fechar_lista()
            saida.append("<h3>" + inline(linha[4:]) + "</h3>")
        elif linha.startswith("## "):
            fechar_paragrafo(); fechar_lista()
            saida.append("<h2>" + inline(linha[3:]) + "</h2>")
        elif linha.startswith("# "):
            fechar_paragrafo(); fechar_lista()
            saida.append("<h2>" + inline(linha[2:]) + "</h2>")
        elif linha.startswith("- "):
            fechar_paragrafo()
            lista.append(inline(linha[2:]))
        elif linha.startswith("---"):
            fechar_paragrafo(); fechar_lista()
        else:
            paragrafo.append(inline(linha))
    return "\n".join(saida)


def gerar(releases):
    publicadas = [r for r in releases if not r.get("draft") and r.get("published_at")]
    publicadas.sort(key=lambda r: r["published_at"], reverse=True)

    itens = []
    for release in publicadas:
        data = datetime.strptime(release["published_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        titulo = html.escape(release.get("name") or release["tag_name"])
        link = html.escape(release["html_url"])
        descricao = markdown_simples(release.get("body") or "")
        itens.append(
            "<item>\n"
            "  <title>%s</title>\n"
            "  <link>%s</link>\n"
            "  <guid isPermaLink=\"true\">%s</guid>\n"
            "  <pubDate>%s</pubDate>\n"
            "  <description><![CDATA[%s]]></description>\n"
            "</item>" % (titulo, link, link, format_datetime(data, usegmt=True), descricao)
        )

    agora = format_datetime(datetime.now(timezone.utc), usegmt=True)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        "    <title>Gestão de Pacientes — novidades</title>\n"
        "    <link>https://github.com/%s/releases</link>\n"
        "    <description>Versões e novidades do Gestão de Pacientes (SaaS by Myttoz).</description>\n"
        "    <language>pt-BR</language>\n"
        '    <atom:link href="%s" rel="self" type="application/rss+xml" />\n'
        "    <lastBuildDate>%s</lastBuildDate>\n"
        "%s\n  </channel>\n</rss>\n"
    ) % (REPO, URL_RSS, agora, "\n".join(itens))


def main():
    feed = gerar(buscar_releases())
    for nome in (SAIDA, SAIDA_RSS):
        caminho = nome if os.path.isabs(nome) else os.path.join(RAIZ, nome)
        with open(caminho, "w", encoding="utf-8") as arquivo:
            arquivo.write(feed)
        print("Feed gerado em", caminho)


if __name__ == "__main__":
    main()
