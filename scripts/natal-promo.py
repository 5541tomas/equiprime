"""Aplica ou remove a promoção de Natal (preço promocional = preço - 10%).
Uso: SUPABASE_URL=... python3 scripts/natal-promo.py aplicar|remover   (chave secreta no cabeçalho apikey)"""
import json, os, sys, urllib.request
cfg = json.load(open(os.path.join(os.path.dirname(__file__), "natal-promo.json")))
U = os.environ.get("SUPABASE_URL", "https://pspwfnkmmxlkupxqipqs.supabase.co") + "/rest/v1"
H = {"apikey": os.environ.get("SUPABASE_KEY", "proxy-injected"), "Content-Type": "application/json", "Prefer": "return=representation"}
def req(m, p, b=None):
    r = urllib.request.Request(U + p, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    return json.loads(urllib.request.urlopen(r).read() or "null")
acao = sys.argv[1]
ids = ",".join(map(str, cfg["produtos"]))
for p in req("GET", f"/products?select=id,title,price&id=in.({ids})"):
    promo = round(float(p["price"]) * (1 - cfg["desconto"]), 2) if acao == "aplicar" else None
    req("PATCH", f"/products?id=eq.{p['id']}", {"price_promo": promo})
    # variantes com preço próprio também levam desconto
    for v in req("GET", f"/variants?select=id,price&product_id=eq.{p['id']}&price=not.is.null"):
        vp = round(float(v["price"]) * (1 - cfg["desconto"]), 2) if acao == "aplicar" else None
        req("PATCH", f"/variants?id=eq.{v['id']}", {"price_promo": vp})
    print(f"{p['title'][:50]:50} {p['price']:>7} → {promo if promo else 'sem promoção'}")
