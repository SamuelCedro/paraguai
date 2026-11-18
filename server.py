"""Site estático + POST /api/checkout (Mercado Pago Checkout Pro). Token em MP_ACCESS_TOKEN (env ou .env)."""
import json, os, urllib.request, urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

if os.path.exists(".env"):
    for l in open(".env", encoding="utf-8"):
        if "=" in l and not l.startswith("#"):
            k, v = l.strip().split("=", 1); os.environ.setdefault(k, v.strip('"\''))

PLANOS = {"starter": ("Paraguai Academy - Starter (3 meses de acesso)", 49.90), "pro": ("Paraguai Academy - Pro (3 meses de acesso)", 199.90)}  # preço sempre definido aqui, nunca pelo navegador
PORT = int(os.environ.get("PORT", 8000))

class H(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/checkout": return self.reply(404, {"error": "not found"})
        token = os.environ.get("MP_ACCESS_TOKEN")
        if not token: return self.reply(500, {"error": "MP_ACCESS_TOKEN não configurado"})
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            titulo, preco = PLANOS[d["plano"]]
            base = os.environ.get("BASE_URL", f"http://localhost:{PORT}")
            pref = {"items": [{"title": titulo, "quantity": 1, "unit_price": preco, "currency_id": "BRL"}],
                    "payer": {"name": str(d.get("nome", ""))[:80], "email": str(d["email"])[:120]},
                    "metadata": {"plano": d["plano"], "whatsapp": str(d.get("whatsapp", ""))[:30]},
                    "back_urls": {k: f"{base}/obrigado.html?status={k}" for k in ("success", "pending", "failure")}}
            if base.startswith("https"):  # MP só aceita auto_return/webhook com URL pública
                pref["auto_return"] = "approved"; pref["notification_url"] = f"{base}/api/webhook"
            req = urllib.request.Request("https://api.mercadopago.com/checkout/preferences", json.dumps(pref).encode(),
                                         {"Authorization": "Bearer " + token, "Content-Type": "application/json"})
            r = json.load(urllib.request.urlopen(req, timeout=20))
            self.reply(200, {"url": r["init_point"]})
        except (KeyError, ValueError): self.reply(400, {"error": "dados inválidos"})
        except urllib.error.HTTPError as e: print("MP:", e.read().decode()); self.reply(502, {"error": "Mercado Pago recusou"})
        except Exception as e: print("erro:", e); self.reply(502, {"error": "falha ao falar com o Mercado Pago"})
    def reply(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code)
        self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

if __name__ == "__main__":
    print(f"http://localhost:{PORT}"); ThreadingHTTPServer(("", PORT), H).serve_forever()
