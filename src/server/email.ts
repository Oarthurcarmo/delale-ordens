import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface OrderEmailData {
  orderCode: string;
  storeName: string;
  managerName: string;
  itemsCount: number;
  supervisorEmail: string;
}

interface EditRequestDecisionData {
  orderCode: string;
  status: "approved" | "rejected";
  managerEmail: string;
  managerName: string;
}

export async function sendNewOrderNotification(data: OrderEmailData) {
  if (!resend) {
    console.warn(
      "RESEND_API_KEY não configurada. E-mail não será enviado. Configure a variável de ambiente para habilitar notificações por e-mail."
    );
    return { success: false, message: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: "Sistema Confeitaria <onboarding@resend.dev>",
      to: data.supervisorEmail,
      subject: `Novo Pedido Recebido - ${data.orderCode}`,
      html: `
        <h2>Novo Pedido Recebido!</h2>
        <p><strong>Código do Pedido:</strong> ${data.orderCode}</p>
        <p><strong>Loja:</strong> ${data.storeName}</p>
        <p><strong>Gerente:</strong> ${data.managerName}</p>
        <p><strong>Quantidade de Itens:</strong> ${data.itemsCount}</p>
        <p>Acesse o sistema para visualizar os detalhes completos do pedido.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

export async function sendEditRequestDecisionNotification(
  data: EditRequestDecisionData
) {
  if (!resend) {
    console.warn("RESEND_API_KEY não configurada. E-mail não será enviado.");
    return { success: false, message: "Email service not configured" };
  }

  const statusText = data.status === "approved" ? "APROVADA" : "REJEITADA";
  const statusColor = data.status === "approved" ? "#22c55e" : "#ef4444";

  try {
    await resend.emails.send({
      from: "Sistema Confeitaria <onboarding@resend.dev>",
      to: data.managerEmail,
      subject: `Solicitação de Edição ${statusText} - ${data.orderCode}`,
      html: `
        <h2>Solicitação de Edição ${statusText}</h2>
        <p>Olá ${data.managerName},</p>
        <p>Sua solicitação de edição para o pedido <strong>${data.orderCode}</strong> foi <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
        <p>Acesse o sistema para mais detalhes.</p>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
