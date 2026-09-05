import { crmApi } from "@/lib/crm-api";
import { toastApiError } from "@/lib/toast";

export async function logContactChannel(opts: {
  type: "EMAIL" | "CALL";
  contactId?: string;
  customerId?: string;
  email?: string | null;
  phone?: string | null;
  label?: string;
}) {
  const { type, contactId, customerId, email, phone, label } = opts;

  if (type === "EMAIL") {
    if (!email?.trim()) {
      toastApiError(new Error("No email available"));
      return;
    }
    window.location.href = `mailto:${email.trim()}`;
  } else {
    if (!phone?.trim()) {
      toastApiError(new Error("No phone available"));
      return;
    }
    window.location.href = `tel:${phone.trim()}`;
  }

  try {
    await crmApi.createSalesActivity({
      type,
      contactId: contactId || undefined,
      customerId: customerId || undefined,
      subject: `Outbound ${type}`,
      status: "COMPLETE",
      activityAt: new Date().toISOString(),
      notes: label || undefined,
    });
  } catch (err) {
    toastApiError(err);
  }
}
