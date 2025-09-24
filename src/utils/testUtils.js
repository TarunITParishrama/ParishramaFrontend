// src/utils/testUtils.js
// Helpers for extracting test-prefixes (PPT, PDT, IPDT, etc.) from testName strings

/**
 * Extract alphabetic prefix from a testName.
 * Examples:
 *  - "PPT - 01"  -> "PPT"
 *  - "PDT01"      -> "PDT"
 *  - "IPDT - 02A" -> "IPDT"
 * Returns null if no leading letters found.
 */
export const extractTestPrefix = (testName = "") => {
  if (!testName || typeof testName !== "string") return null;
  const match = testName.trim().match(/^([A-Za-z]+)/);
  return match ? match[1].toUpperCase() : null;
};

/**
 * Given an array of report objects (each having testName),
 * return a sorted array of unique prefixes (uppercase).
 */
export const getTestPrefixes = (reports = []) => {
  const s = new Set();
  reports.forEach((r) => {
    const prefix = extractTestPrefix(r.testName);
    if (prefix) s.add(prefix);
  });
  return Array.from(s).sort((a, b) => a.localeCompare(b));
};

/**
 * Filter reports by a selected prefix.
 * If selectedPrefix is falsy, returns the original array.
 * Uses prefix match at start of testName (case-insensitive).
 */
export const filterReportsByPrefix = (reports = [], selectedPrefix) => {
  if (!selectedPrefix) return reports;
  const up = selectedPrefix.toUpperCase();
  return reports.filter((r) => {
    const p = extractTestPrefix(r.testName);
    return p === up;
  });
};
