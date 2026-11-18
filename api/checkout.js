// Vercel Function: cria a cobrança no Mercado Pago (Checkout Pro). Token em MP_ACCESS_TOKEN (variável de ambiente).
const PLANOS = { starter: ["Paraguai Academy - Starter (3 meses de acesso)", 49.9], pro: ["Paraguai Academy - Pro (3 meses de acesso)", 199.9] }; // preço só aqui, nunca vindo do navegador

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "método inválido" });
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: "MP_ACCESS_TOKEN não configurado" });
  const d = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const plano = PLANOS[d.plano];
  if (!plano || !d.email) return res.status(400).json({ error: "dados inválidos" });
  const base = `https://${req.headers.host}`;
  const pref = {
    items: [{ title: plano[0], quantity: 1, unit_price: plano[1], currency_id: "BRL" }],
    payer: { name: String(d.nome || "").slice(0, 80), email: String(d.email).slice(0, 120) },
    metadata: { plano: d.plano, whatsapp: String(d.whatsapp || "").slice(0, 30) },
    back_urls: Object.fromEntries(["success", "pending", "failure"].map((k) => [k, `${base}/obrigado.html?status=${k}`])),
    auto_return: "approved",
  };
  try {
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(pref),
    });
    const j = await r.json();
    if (!r.ok || !j.init_point) { console.error("MP:", JSON.stringify(j)); return res.status(502).json({ error: "Mercado Pago recusou" }); }
    res.status(200).json({ url: j.init_point });
  } catch (e) { console.error(e); res.status(502).json({ error: "falha ao falar com o Mercado Pago" }); }
};
