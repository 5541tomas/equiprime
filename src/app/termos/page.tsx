import TextPage from "@/components/TextPage";
import { STORE } from "@/lib/config";

export const metadata = { title: "Termos e condições" };

// TODO: completar com nome da empresa, NIF e morada (dados legais em falta)
export default function Page() {
  return (
    <TextPage title="Termos e condições">
      <p>Estes termos regulam as compras feitas na loja online Equi Prime ({STORE.url}).</p>
      <h2>Encomendas</h2>
      <p>A encomenda feita no site é um pedido. O contrato de compra só fica concluído após confirmarmos consigo, por WhatsApp, a disponibilidade dos artigos, o preço total e a forma de pagamento.</p>
      <h2>Preços</h2>
      <p>Os preços incluem IVA à taxa legal em vigor, exceto para contas de revenda, onde os preços são apresentados sem IVA. Os portes são indicados antes de finalizar a encomenda.</p>
      <h2>Pagamento</h2>
      <p>O pagamento é combinado após a confirmação da encomenda. A encomenda é enviada depois de confirmado o pagamento.</p>
      <h2>Direito de livre resolução</h2>
      <p>Tem o direito de devolver os artigos no prazo de 14 dias após a receção, sem indicar motivo, nos termos do Decreto-Lei n.º 24/2014. Os custos de devolução são suportados pelo cliente.</p>
      <h2>Garantia</h2>
      <p>Os produtos têm a garantia legal de conformidade de 3 anos (Decreto-Lei n.º 84/2021).</p>
      <h2>Resolução de litígios</h2>
      <p>Em caso de litígio, o consumidor pode recorrer a uma entidade de resolução alternativa de litígios de consumo (consulte www.consumidor.gov.pt) e ao Livro de Reclamações Eletrónico (www.livroreclamacoes.pt).</p>
      <h2>Contactos</h2>
      <p>Equi Prime · {STORE.city} · {STORE.email} · {STORE.phoneDisplay}</p>
    </TextPage>
  );
}
