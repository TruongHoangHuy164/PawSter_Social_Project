import { Link } from "react-router-dom";

/**
 * Parse text content and render hashtags as clickable links with highlight
 * @param {string} text - The text content to parse
 * @returns {JSX.Element[]} - Array of React elements
 */
export function renderContentWithHashtags(text) {
  if (!text || typeof text !== "string") return null;

  // Split by hashtags while preserving them
  // Regex matches #word including Vietnamese characters, numbers, underscores
  const parts = text.split(
    /(#[a-zA-Z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]+)/g
  );

  return parts.map((part, index) => {
    // Check if part is a hashtag
    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1); // Remove # symbol
      return (
        <Link
          key={index}
          to={`/hashtag/${tag}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors duration-150 hover:underline"
          onClick={(e) => e.stopPropagation()} // Prevent triggering parent click handlers
        >
          {part}
        </Link>
      );
    }
    // Regular text
    return <span key={index}>{part}</span>;
  });
}

/**
 * Extract hashtags from text (without #)
 * @param {string} text - The text to extract hashtags from
 * @returns {string[]} - Array of hashtags (lowercase, without #)
 */
export function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];

  const regex =
    /#([a-zA-Z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]+)/gi;

  const matches = text.match(regex);
  if (!matches) return [];

  // Remove # and convert to lowercase, remove duplicates
  const hashtags = matches.map((tag) => tag.slice(1).toLowerCase());
  return [...new Set(hashtags)];
}
