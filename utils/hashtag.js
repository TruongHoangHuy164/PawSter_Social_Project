/**
 * Extract hashtags from text content
 * @param {string} text - The text to extract hashtags from
 * @returns {string[]} - Array of unique hashtags (lowercase, without #)
 */
export function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];

  // Regex matches #word including Vietnamese characters, numbers, underscores
  // Supports: #pawster #mèo_cưng #công_viên #hanoi123
  const regex =
    /#([a-zA-Z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]+)/gi;

  const matches = text.match(regex);
  if (!matches) return [];

  // Remove # and convert to lowercase, remove duplicates
  const hashtags = matches.map((tag) => tag.slice(1).toLowerCase());
  return [...new Set(hashtags)]; // Remove duplicates
}

/**
 * Validate hashtag format
 * @param {string} tag - The hashtag to validate (without #)
 * @returns {boolean} - True if valid
 */
export function isValidHashtag(tag) {
  if (!tag || typeof tag !== "string") return false;
  // Must be 2-50 characters, alphanumeric + Vietnamese + underscore
  const regex =
    /^[a-zA-Z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]{2,50}$/;
  return regex.test(tag);
}
