/**
 * Converts a string into a URL-friendly slug.
 * Removes apostrophes and quotes cleanly, replaces spaces and special characters with hyphens,
 * collapses multiple hyphens, and removes leading/trailing hyphens.
 *
 * @param {string} text - Input text (e.g. "Rayal's Space")
 * @returns {string} URL-friendly slug (e.g. "rayals-space")
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return 'space';
  }

  const slug = text
    .normalize('NFKD') // Normalize accented characters
    .replace(/['"’`]/g, '') // Remove apostrophes without replacing with hyphen ("Rayal's" -> "Rayals")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // Trim leading & trailing hyphens
    .replace(/-{2,}/g, '-'); // Collapse multiple hyphens

  return slug || 'space';
}

/**
 * Generates a unique slug for a Space model by checking the database.
 * If the base slug already exists, appends incremental numeric counters (-1, -2, ...)
 * to ensure uniqueness before persistence.
 *
 * @param {string} rawName - User entered space name
 * @param {import('mongoose').Model} spaceModel - Mongoose Space model
 * @param {import('mongoose').ClientSession} [session=null] - Optional MongoDB session
 * @returns {Promise<string>} Globally unique slug
 */
export async function generateUniqueSlug(rawName, spaceModel, session = null) {
  const baseSlug = slugify(rawName);
  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const query = spaceModel.findOne({ slug: candidateSlug });
    if (session) {
      query.session(session);
    }
    const existing = await query.lean().exec();

    if (!existing) {
      return candidateSlug;
    }

    candidateSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

