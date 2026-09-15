"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardBadge,
  DashboardModal,
  DashboardPanel,
  DashboardSelectField,
  DashboardTextField,
  DashboardToolbarButton,
  type DashboardBadgeVariant,
} from "@dark-horse-safety/ui";
import { ApiError } from "@dark-horse-safety/api-client";
import {
  crmApi,
  type CrmCardReconException,
  type CrmCardReconciliation,
  type CrmPaymentCard,
} from "@/lib/crm-api";
import { toastApiError, toastSuccess, toastValidationError } from "@/lib/toast";
import { BrandLoader } from "@/features/loading/brand-loader";
import { CrmEmptyTabState, CrmLoadFailedState } from "@/features/crm/crm-states";
import { useSetHeaderBreadcrumb } from "@/features/app-shell/header-actions-context";
import { CrmPromptFieldsModal } from "@/features/crm/crm-action-modals";
import { NewExpenseModal } from "@/features/crm/new-expense-modal";

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function kindMeta(kind: string): { label: string; variant: DashboardBadgeVariant } {
  switch (kind.toUpperCase()) {
    case "MISSING_RECEIPT":
      return { label: "MISSING RECEIPT", variant: "gold" };
    case "UNMATCHED_CHARGE":
      return { label: "UNMATCHED CHARGE", variant: "info" };
    case "UNMATCHED_EXPENSE":
      return { label: "UNMATCHED EXPENSE", variant: "error" };
    default:
      return {
        label: kind.replace(/_/g, " ").toUpperCase(),
        variant: "neutral",
      };
  }
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5 14.5 13H1.5L8 1.5Z"
        stroke="#C4A35A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8 6v3.5" stroke="#C4A35A" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.8" fill="#C4A35A" />
    </svg>
  );
}

/**
 * Card Reconciliation — live statement charges + expense exceptions.
 */
export function CardReconciliationPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  useSetHeaderBreadcrumb("Accounts / Customers / Card Reconciliation");

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<CrmCardReconciliation | null>(null);
  const [cards, setCards] = React.useState<CrmPaymentCard[]>([]);
  const [selectedCardId, setSelectedCardId] = React.useState("");
  const [waiveTarget, setWaiveTarget] = React.useState<CrmCardReconException | null>(
    null,
  );
  const [logTarget, setLogTarget] = React.useState<CrmCardReconException | null>(
    null,
  );
  const [addChargeOpen, setAddChargeOpen] = React.useState(false);
  const [newCardOpen, setNewCardOpen] = React.useState(false);
  const [chargeDate, setChargeDate] = React.useState(todayIso());
  const [chargeMerchant, setChargeMerchant] = React.useState("");
  const [chargeAmount, setChargeAmount] = React.useState("");
  const [cardBrand, setCardBrand] = React.useState("");
  const [cardLast4, setCardLast4] = React.useState("");

  const loadCards = React.useCallback(async () => {
    const res = await crmApi.listPaymentCards({ activeOnly: true });
    setCards(res.data.items ?? []);
  }, []);

  const load = React.useCallback(
    async (paymentCardId?: string) => {
      setLoading(true);
      setError(null);
      try {
        await loadCards();
        const res = await crmApi.getCustomerCardReconciliation(customerId, {
          paymentCardId,
        });
        setData(res.data);
        if (res.data.paymentCardId) setSelectedCardId(res.data.paymentCardId);
      } catch (err) {
        toastApiError(err);
        setError(
          err instanceof Error ? err.message : "Failed to load reconciliation",
        );
      } finally {
        setLoading(false);
      }
    },
    [customerId, loadCards],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  function apply(next: CrmCardReconciliation) {
    setData(next);
  }

  async function run(
    action: () => Promise<{ data: CrmCardReconciliation }>,
    success?: string,
  ) {
    setBusy(true);
    try {
      const res = await action();
      apply(res.data);
      if (success) toastSuccess(success);
    } catch (err) {
      toastApiError(err);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish(force = false) {
    if (!data?.id) return;
    setBusy(true);
    try {
      const res = await crmApi.finishCardReconciliation(data.id, { force });
      apply(res.data);
      toastSuccess(
        force
          ? "Finished — bonus deduction recorded"
          : "Reconciliation finished",
      );
      router.push(`/crm/accounts/${customerId}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "UNRESOLVED_EXCEPTIONS") {
        toastValidationError(
          "Unresolved unmatched charges remain — resolve first or finish and record",
        );
      } else {
        toastApiError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  async function createCardAndStart() {
    if (!cardBrand.trim() || !/^\d{4}$/.test(cardLast4.trim())) {
      toastValidationError("Brand and 4-digit last4 are required");
      return;
    }
    setBusy(true);
    try {
      const created = await crmApi.createPaymentCard({
        brand: cardBrand.trim(),
        last4: cardLast4.trim(),
        isCompanyCard: true,
      });
      setNewCardOpen(false);
      setCardLast4("");
      await load(created.data.id);
      toastSuccess("Payment card added");
    } catch (err) {
      toastApiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitCharge() {
    if (!data?.id) return;
    const amount = Number(chargeAmount);
    if (!chargeMerchant.trim() || !Number.isFinite(amount) || amount < 0) {
      toastValidationError("Merchant and amount are required");
      return;
    }
    await run(
      () =>
        crmApi.addCardReconciliationCharge(data.id!, {
          exceptionDate: new Date(`${chargeDate}T12:00:00`).toISOString(),
          merchant: chargeMerchant.trim(),
          amount,
        }),
      "Statement charge added",
    );
    setAddChargeOpen(false);
    setChargeMerchant("");
    setChargeAmount("");
    setChargeDate(todayIso());
  }

  const cancelHref = `/crm/accounts/${customerId}`;
  const finished = data?.status === "FINISHED";
  const unresolved = data?.unresolvedCharges ?? [];
  const showWarning = unresolved.length > 0 && !finished;
  const needsCard = Boolean(data?.needsPaymentCard) || !data?.id;

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-shell p-6">
        <BrandLoader />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-shell p-3 sm:p-6">
        <CrmLoadFailedState onRetry={() => void load()} />
      </div>
    );
  }

  if (!data) return null;

  if (needsCard) {
    return (
      <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
        <DashboardPanel className="overflow-hidden p-4 sm:p-6">
          <h2 className="font-sans text-[14px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
            Select payment card
          </h2>
          <p className="mt-2 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
            Reconciliation uses a real company card on file — no stub card
            numbers.
          </p>
          {cards.length ? (
            <div className="mt-4 space-y-3">
              <DashboardSelectField
                label="Payment card"
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                options={cards.map((c) => ({
                  value: c.id,
                  label: c.label,
                }))}
                placeholder="Select card"
              />
              <DashboardToolbarButton
                variant="primary"
                disabled={!selectedCardId || busy}
                onClick={() => void load(selectedCardId)}
              >
                Start reconciliation
              </DashboardToolbarButton>
            </div>
          ) : (
            <div className="mt-4">
              <CrmEmptyTabState
                title="No payment cards"
                description="Add a company card to begin statement reconciliation."
                addLabel="Add payment card"
                onAdd={() => setNewCardOpen(true)}
              />
            </div>
          )}
          {cards.length ? (
            <button
              type="button"
              className="mt-3 font-sans text-[11px] uppercase text-[#C4A35A] hover:underline"
              onClick={() => setNewCardOpen(true)}
            >
              + Add another card
            </button>
          ) : null}
        </DashboardPanel>
        <div className="flex justify-end">
          <Link href={cancelHref}>
            <DashboardToolbarButton>Cancel</DashboardToolbarButton>
          </Link>
        </div>
        <DashboardModal
          open={newCardOpen}
          onClose={() => setNewCardOpen(false)}
          title="Add Payment Card"
          footer={
            <div className="flex w-full justify-end gap-2">
              <DashboardToolbarButton onClick={() => setNewCardOpen(false)}>
                Cancel
              </DashboardToolbarButton>
              <DashboardToolbarButton
                variant="primary"
                disabled={busy}
                onClick={() => void createCardAndStart()}
              >
                Save card
              </DashboardToolbarButton>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DashboardTextField
              label="Brand"
              value={cardBrand}
              onChange={(e) => setCardBrand(e.target.value)}
              placeholder="AMEX"
            />
            <DashboardTextField
              label="Last 4"
              value={cardLast4}
              onChange={(e) =>
                setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="4021"
              inputMode="numeric"
            />
          </div>
        </DashboardModal>
      </div>
    );
  }

  const panelTitle = `CREDIT CARD RECONCILIATION · ${data.cardLabel} · ${data.statementLabel}`;

  return (
    <div className="space-y-4 overflow-x-hidden bg-shell p-3 sm:p-6">
      <DashboardPanel className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3">
          <h2 className="min-w-0 font-sans text-[13px] font-normal uppercase leading-snug tracking-[-0.02em] text-[#959597] md:text-[14px]">
            {panelTitle}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <DashboardToolbarButton
              disabled={busy || finished}
              onClick={() => setAddChargeOpen(true)}
            >
              Add statement charge
            </DashboardToolbarButton>
            <DashboardBadge variant="gold" pill>
              {data.exceptionCount} EXCEPTION
              {data.exceptionCount === 1 ? "" : "S"}
            </DashboardBadge>
          </div>
        </div>
        <div className="divider-line-full w-full" aria-hidden />

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-3">
          <div className="rounded-lg bg-[#1A1A1A] px-4 py-3">
            <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              Statement Total
            </p>
            <p className="mt-1 font-sans text-[16px] tracking-[-0.02em] text-[#FDFDFF]">
              {formatMoney(data.statementTotal)}
            </p>
          </div>
          <div className="rounded-lg bg-[#1A1A1A] px-4 py-3">
            <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              Matched
            </p>
            <p className="mt-1 font-sans text-[16px] tracking-[-0.02em] text-[#22C55E]">
              {formatMoney(data.matchedTotal)}
            </p>
          </div>
          <div className="rounded-lg bg-[#1A1A1A] px-4 py-3">
            <p className="font-sans text-[10px] uppercase tracking-[-0.02em] text-[#959597]">
              Unmatched
            </p>
            <p className="mt-1 font-sans text-[16px] tracking-[-0.02em] text-[#C4A35A]">
              {formatMoney(data.unmatchedTotal)}
            </p>
          </div>
        </div>

        <div className="divider-line-full w-full" aria-hidden />
        <div className="px-4 pt-4 pb-2">
          <p className="font-sans text-[12px] uppercase tracking-[-0.02em] text-[#959597]">
            Exceptions
          </p>
        </div>

        {data.exceptions.length === 0 ? (
          <div className="px-4 pb-4">
            <CrmEmptyTabState
              title="No exceptions"
              description="Add statement charges, then auto-match or log expenses."
              addLabel="Add statement charge"
              onAdd={() => setAddChargeOpen(true)}
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#2D2D30]">
            {data.exceptions.map((ex) => {
              const meta = kindMeta(ex.kind);
              return (
                <li
                  key={ex.id}
                  id={`exception-${ex.id}`}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="w-16 shrink-0 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {formatDateShort(ex.exceptionDate)}
                    </span>
                    <DashboardBadge variant={meta.variant} pill>
                      {meta.label}
                    </DashboardBadge>
                    <span className="min-w-0 font-sans text-[12px] uppercase tracking-[-0.02em] text-[#FDFDFF]">
                      {ex.merchant}
                    </span>
                    <span className="font-sans text-[12px] tracking-[-0.02em] text-[#FDFDFF]">
                      {formatMoney(ex.amount)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {ex.kind === "MISSING_RECEIPT" ? (
                      <>
                        <DashboardToolbarButton
                          disabled={busy || finished || !data.id}
                          onClick={() =>
                            void run(
                              () =>
                                crmApi.requestCardExceptionReceipt(
                                  data.id!,
                                  ex.id,
                                ),
                              "Receipt requested",
                            )
                          }
                        >
                          Request receipt
                        </DashboardToolbarButton>
                        <DashboardToolbarButton
                          disabled={busy || finished}
                          onClick={() => setWaiveTarget(ex)}
                        >
                          Waive with reason
                        </DashboardToolbarButton>
                      </>
                    ) : null}
                    {ex.kind === "UNMATCHED_CHARGE" ? (
                      <DashboardToolbarButton
                        disabled={busy || finished}
                        onClick={() => setLogTarget(ex)}
                      >
                        Log expense
                      </DashboardToolbarButton>
                    ) : null}
                    {ex.kind === "UNMATCHED_EXPENSE" ? (
                      <>
                        <DashboardToolbarButton
                          disabled={busy || finished || !data.id}
                          onClick={() =>
                            void run(
                              () =>
                                crmApi.markCardExceptionPersonal(
                                  data.id!,
                                  ex.id,
                                ),
                              "Marked personal",
                            )
                          }
                        >
                          Mark personal
                        </DashboardToolbarButton>
                        <DashboardToolbarButton
                          disabled={busy || finished || !data.id}
                          onClick={() =>
                            void run(
                              () =>
                                crmApi.disputeCardException(data.id!, ex.id),
                              "Disputed",
                            )
                          }
                        >
                          Dispute
                        </DashboardToolbarButton>
                        <DashboardToolbarButton
                          disabled={busy || finished || !data.id}
                          onClick={() =>
                            void run(
                              () =>
                                crmApi.deleteCardException(data.id!, ex.id),
                              "Deleted",
                            )
                          }
                        >
                          Delete
                        </DashboardToolbarButton>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {showWarning ? (
          <>
            <div className="divider-line-full w-full" aria-hidden />
            <div className="px-4 py-4">
              <div className="rounded-xl border border-[#534A1E] bg-[#2A2618] p-4">
                <div className="flex items-start gap-2">
                  <WarningIcon />
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-sans text-[12px] font-[510] uppercase tracking-[-0.02em] text-[#C4A35A]">
                      {unresolved.length} exception
                      {unresolved.length === 1 ? "" : "s"} remain unresolved:
                    </p>
                    <ul className="space-y-1">
                      {unresolved.map((ex) => (
                        <li
                          key={ex.id}
                          className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#FDFDFF]"
                        >
                          {ex.merchant} · {formatMoney(ex.amount)} — no expense
                          logged
                        </li>
                      ))}
                    </ul>
                    {data.bonusDeductionWarning ? (
                      <p className="font-sans text-[11px] uppercase tracking-[-0.02em] text-[#CAC897]">
                        {data.bonusDeductionWarning}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <DashboardToolbarButton
                        disabled={busy}
                        onClick={() => {
                          document
                            .getElementById(`exception-${unresolved[0]?.id}`)
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                        }}
                      >
                        Resolve first
                      </DashboardToolbarButton>
                      <DashboardToolbarButton
                        variant="primary"
                        disabled={busy}
                        onClick={() => void handleFinish(true)}
                      >
                        Finish and record
                      </DashboardToolbarButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="divider-line-full w-full" aria-hidden />
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-4">
          <DashboardToolbarButton
            disabled={busy || finished || !data.id}
            onClick={() =>
              void run(
                () => crmApi.autoMatchCardReconciliation(data.id!),
                "Auto-match complete",
              )
            }
          >
            Auto-Match
          </DashboardToolbarButton>
          <DashboardToolbarButton
            variant="primary"
            disabled={busy || finished || !data.id}
            onClick={() => void handleFinish(false)}
          >
            Finish Reconciliation
          </DashboardToolbarButton>
        </div>
      </DashboardPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={cancelHref} className="inline-flex shrink-0">
          <DashboardToolbarButton>Cancel</DashboardToolbarButton>
        </Link>
      </div>

      <CrmPromptFieldsModal
        open={Boolean(waiveTarget)}
        title="Waive with reason"
        confirmLabel="Waive"
        fields={[
          {
            key: "reason",
            label: "Reason",
            placeholder: "Why is the receipt being waived?",
          },
        ]}
        onClose={() => setWaiveTarget(null)}
        onConfirm={async (values) => {
          if (!data?.id || !waiveTarget) return;
          if (!values.reason?.trim()) {
            toastValidationError("Reason is required");
            throw new Error("validation");
          }
          await run(
            () =>
              crmApi.waiveCardException(data.id!, waiveTarget.id, {
                reason: values.reason,
              }),
            "Exception waived",
          );
          setWaiveTarget(null);
        }}
      />

      <DashboardModal
        open={addChargeOpen}
        onClose={() => setAddChargeOpen(false)}
        title="Add Statement Charge"
        footer={
          <div className="flex w-full justify-end gap-2">
            <DashboardToolbarButton onClick={() => setAddChargeOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy}
              onClick={() => void submitCharge()}
            >
              Add charge
            </DashboardToolbarButton>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <DashboardTextField
            label="Date"
            type="date"
            value={chargeDate}
            onChange={(e) => setChargeDate(e.target.value)}
          />
          <DashboardTextField
            label="Amount"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
          <div className="sm:col-span-2">
            <DashboardTextField
              label="Merchant"
              value={chargeMerchant}
              onChange={(e) => setChargeMerchant(e.target.value)}
              placeholder="Merchant name"
            />
          </div>
        </div>
      </DashboardModal>

      <DashboardModal
        open={newCardOpen}
        onClose={() => setNewCardOpen(false)}
        title="Add Payment Card"
        footer={
          <div className="flex w-full justify-end gap-2">
            <DashboardToolbarButton onClick={() => setNewCardOpen(false)}>
              Cancel
            </DashboardToolbarButton>
            <DashboardToolbarButton
              variant="primary"
              disabled={busy}
              onClick={() => void createCardAndStart()}
            >
              Save card
            </DashboardToolbarButton>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <DashboardTextField
            label="Brand"
            value={cardBrand}
            onChange={(e) => setCardBrand(e.target.value)}
            placeholder="AMEX"
          />
          <DashboardTextField
            label="Last 4"
            value={cardLast4}
            onChange={(e) =>
              setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="4021"
            inputMode="numeric"
          />
        </div>
      </DashboardModal>

      <NewExpenseModal
        open={Boolean(logTarget)}
        customerId={customerId}
        defaults={
          logTarget
            ? {
                merchant: logTarget.merchant,
                amount: logTarget.amount,
                expenseDate: logTarget.exceptionDate,
                paymentMethod: data.cardLabel ?? undefined,
              }
            : undefined
        }
        onClose={() => setLogTarget(null)}
        onCreated={(expense) => {
          if (!data?.id || !logTarget) return;
          void run(
            () =>
              crmApi.linkCardExceptionExpense(data.id!, logTarget.id, {
                expenseId: expense.id,
              }),
            "Expense linked",
          ).finally(() => setLogTarget(null));
        }}
      />
    </div>
  );
}
