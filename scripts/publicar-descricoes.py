"""Publica as descrições aprovadas de conteudo/descricoes-rascunho.json.
Guarda antes uma cópia das descrições atuais em conteudo/descricoes-anteriores.json.
Uso: python3 scripts/publicar-descricoes.py [ids separados por vírgula]   (sem ids = todas)"""
import json, os, sys, urllib.request
U = os.environ.get("SUPABASE_URL", "https://pspwfnkmmxlkupxqipqs.supabase.co") + "/rest/v1"
H = {"apikey": os.environ.get("SUPABASE_KEY", "proxy-injected"), "Content-Type": "application/json"}
def req(m, p, b=None):
    r = urllib.request.Request(U + p, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    return json.loads(urllib.request.urlopen(r).read() or "null")
base = os.path.join(os.path.dirname(__file__), "..", "conteudo")
drafts = json.load(open(os.path.join(base, "descricoes-rascunho.json")))
only = set(map(int, sys.argv[1].split(","))) if len(sys.argv) > 1 else None
todo = [d for d in drafts if not only or d["id"] in only]
ids = ",".join(str(d["id"]) for d in todo)
backup = req("GET", f"/products?select=id,title,description&id=in.({ids})")
json.dump(backup, open(os.path.join(base, "descricoes-anteriores.json"), "w"), ensure_ascii=False, indent=1)
for d in todo:
    req("PATCH", f"/products?id=eq.{d['id']}", {"description": d["html"]})
    print("publicada:", d["title"])
