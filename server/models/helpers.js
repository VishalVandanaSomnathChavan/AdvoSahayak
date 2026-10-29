const ID_PATTERN = /^[1-9]\d{0,19}$/;
const MAX_UNSIGNED_BIGINT = 18446744073709551615n;

function isValidId(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || !ID_PATTERN.test(String(value))) return false;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;
  return BigInt(value) <= MAX_UNSIGNED_BIGINT;
}

function publicRecord(row) {
  if (!row) return null;
  const record = { ...row };
  if (record.id !== undefined) {
    record.id = String(record.id);
    record._id = record.id;
  }
  return record;
}

function publicChild(row) {
  const record = publicRecord(row);
  if (record && record.case_id !== undefined) {
    record.case = String(record.case_id);
    delete record.case_id;
  }
  if (record && record.owner_id !== undefined) delete record.owner_id;
  return record;
}

module.exports = { isValidId, publicRecord, publicChild };
