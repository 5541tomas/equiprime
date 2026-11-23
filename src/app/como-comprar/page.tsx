import TextPage from "@/components/TextPage";
import { STORE } from "@/lib/config";

export const metadata = { title: "Como comprar" };

export default function Page() {
  return (
    <TextPage title="Como comprar">
      <ol>
        <li><strong>Escolha os produtos</strong> e adicione-os ao carrinho (escolha o tamanho ou a cor quando aplicável).</li>
        <li><strong>Finalize a encomenda</strong>: indique os seus dados e se quer envio por CTT ou levantamento.</li>
        <li><strong>Envie a mensagem no WhatsApp</strong>: abrimos automaticamente o WhatsApp com o resumo da sua encomenda — só tem de carregar em enviar.</li>
        <li><strong>Confirmamos consigo</strong> a disponibilidade, a forma de pagamento (MB WAY, transferência, etc.) e o envio.</li>
      </ol>
      <p>Dúvidas? Fale connosco pelo WhatsApp {STORE.phoneDisplay}.</p>
    </TextPage>
  );
}
