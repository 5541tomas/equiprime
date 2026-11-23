import TextPage from "@/components/TextPage";
import { STORE } from "@/lib/config";

export const metadata = { title: "Política de privacidade" };

export default function Page() {
  return (
    <TextPage title="Política de privacidade">
      <p>A Equi Prime trata os seus dados pessoais de acordo com o Regulamento Geral sobre a Proteção de Dados (RGPD).</p>
      <h2>Que dados recolhemos</h2>
      <p>Nome, contactos, NIF e morada que indica ao criar conta ou encomendar, e o seu e-mail se subscrever a newsletter.</p>
      <h2>Para que os usamos</h2>
      <ul>
        <li>Processar e enviar as suas encomendas e emitir faturas;</li>
        <li>Gerir a sua conta de cliente e lista de desejos;</li>
        <li>Enviar a newsletter, apenas se a subscreveu (pode cancelar a qualquer momento).</li>
      </ul>
      <h2>Partilha</h2>
      <p>Partilhamos apenas o necessário com os CTT para a entrega. As mensagens de encomenda são trocadas via WhatsApp. Os dados são alojados em servidores na União Europeia.</p>
      <h2>Os seus direitos</h2>
      <p>Pode pedir acesso, correção ou eliminação dos seus dados através de {STORE.email}. Pode também apresentar reclamação à CNPD (www.cnpd.pt).</p>
    </TextPage>
  );
}
