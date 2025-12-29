/**
 * Date formatting utilities for the MCP server.
 */

/**
 * Get current date in readable format
 * @returns {string} e.g., "December 29, 2024"
 */
export function getCurrentDate() {
	return new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns {string} e.g., "2024-12-29"
 */
export function getISODate() {
	return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date string is in valid YYYY-MM-DD format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean}
 */
export function isValidDateFormat(dateStr) {
	return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Check if a date is in the past
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isDateInPast(dateStr) {
	const date = new Date(dateStr);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return date < today;
}
