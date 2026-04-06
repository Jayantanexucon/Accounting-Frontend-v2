export function computeClosingBalance(acc) {
  const opening = acc.openingBalance || 0;

  const openingSigned = acc.openingType === "debit" ? opening : -opening;

  const journalSigned = (acc.totalDebit || 0) - (acc.totalCredit || 0);

  const closing = openingSigned + journalSigned;

  return {
    closing,
    debit: closing > 0 ? closing : 0,
    credit: closing < 0 ? Math.abs(closing) : 0,
  };
}
