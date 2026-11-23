import TextPage from "@/components/TextPage";
import { STORE } from "@/lib/config";
import { euro } from "@/lib/format";

export const metadata = { title: "Envios e devoluções" };

export default function Page() {
  return (
    <TextPage title="Envios e devoluções">
      <h2>Envios</h2>
      <p>Enviamos por CTT para Portugal continental, Açores, Madeira e toda a União Europeia.</p>
      <ul>
        <li>Portes: <strong>{euro(STORE.shippingCost)}</strong> por encomenda.</li>
        <li><strong>Portes grátis</strong> em encomendas a partir de {euro(STORE.freeShippingFrom)}.</li>
        <li>Também pode <strong>levantar a encomenda</strong> — combinamos consigo o local e a hora por WhatsApp.</li>
      </ul>
      <p>O envio é feito após confirmação do pagamento. Receberá o número de seguimento CTT por WhatsApp.</p>
      <h2>Devoluções</h2>
      <p>Tem 14 dias a contar da receção para devolver um artigo, nos termos da lei. O artigo deve estar em perfeito estado, sem uso e na embalagem original. Contacte-nos por WhatsApp ({STORE.phoneDisplay}) ou e-mail ({STORE.email}) antes de enviar.</p>
    </TextPage>
  );
}
