function normalize(name) {
  return name.trim().toLowerCase();
}

// Finds the existing Customer matching this name case-insensitively (and
// ignoring leading/trailing whitespace), or creates one. `firstLoggedById`
// is only used when actually creating a new row — it's a one-time "who
// logged this customer first" fact, never overwritten on subsequent
// matches.
//
// NOTE — known limitation, by design per the request: matching is on name
// alone. Two genuinely different customers who happen to share an exact
// name (after case-normalizing) will be treated as the same contact. If
// that turns out to cause real mix-ups, the fix is to also factor in
// customerContact when matching — not implemented here to keep behavior
// exactly as specified.
async function resolveOrCreateCustomer(prisma, rawName, firstLoggedById) {
  const normalizedName = normalize(rawName);

  const existing = await prisma.customer.findFirst({
    where: { normalizedName, deletedAt: null },
  });
  if (existing) return existing;

  return prisma.customer.create({
    data: {
      name: rawName.trim(),
      normalizedName,
      firstLoggedById,
    },
  });
}

module.exports = { resolveOrCreateCustomer, normalize };
