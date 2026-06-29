/**
 * Groups transactions by student, date, and a close time window,
 * then assigns sequential slip numbers (e.g., SICF-00001, SICF-00002).
 * 
 * @param {Array} transactions List of transactions containing id, student_id, date_paid, created_at
 * @returns {Object} { slipMap: Map, uuidPrefixMap: Map, totalSlips: number }
 */
export function getSequentialSlips(transactions) {
  if (!transactions || transactions.length === 0) {
    return { slipMap: new Map(), uuidPrefixMap: new Map(), totalSlips: 0 };
  }

  // Sort transactions chronologically by created_at ascending
  const sorted = [...transactions].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  const slipMap = new Map(); // Maps transaction UUID -> sequential slip number (e.g., "SICF-00001")
  const uuidPrefixMap = new Map(); // Maps UUID prefix -> sequential slip number
  let slipCounter = 0;
  let lastTx = null;

  for (const tx of sorted) {
    const txTime = tx.created_at ? new Date(tx.created_at).getTime() : 0;
    const lastTxTime = lastTx && lastTx.created_at ? new Date(lastTx.created_at).getTime() : 0;

    // Group transactions if they belong to the same student, same date,
    // and were created within a 10-second window (a typical batch submission).
    const isSameGroup = lastTx &&
      tx.student_id === lastTx.student_id &&
      tx.date_paid === lastTx.date_paid &&
      Math.abs(txTime - lastTxTime) < 10000;

    if (!isSameGroup) {
      slipCounter++;
    }

    const slipNo = `SICF-${String(slipCounter).padStart(5, '0')}`;
    slipMap.set(tx.id, slipNo);

    if (tx.id && typeof tx.id === 'string') {
      const prefix = tx.id.split('-')[0].toUpperCase();
      uuidPrefixMap.set(prefix, slipNo);
    }

    lastTx = tx;
  }

  return { slipMap, uuidPrefixMap, totalSlips: slipCounter };
}
