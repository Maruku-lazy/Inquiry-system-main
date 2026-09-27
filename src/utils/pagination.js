const { z } = require('zod');

// Page size is restricted to a fixed set (10/20/50) rather than any
// arbitrary number, per the requirement to never let a client pull an
// unbounded slice of a ~50k-row table.
const ALLOWED_PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => ALLOWED_PAGE_SIZES.includes(n), {
      message: `pageSize must be one of ${ALLOWED_PAGE_SIZES.join(', ')}`,
    })
    .default(DEFAULT_PAGE_SIZE),
});

// Parses page/pageSize from req.query and returns both the Prisma
// skip/take pair and the values themselves (for building the response
// envelope). Throws a ZodError on invalid input, same as any other schema
// — asyncHandler + errorHandler turn that into a 400 automatically.
function parsePagination(query) {
  const { page, pageSize } = paginationQuerySchema.parse(query);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// Standard envelope every paginated endpoint returns, so the frontend has
// one shape to handle everywhere.
function paginatedResponse(items, total, page, pageSize) {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

module.exports = { parsePagination, paginatedResponse, ALLOWED_PAGE_SIZES, DEFAULT_PAGE_SIZE };
