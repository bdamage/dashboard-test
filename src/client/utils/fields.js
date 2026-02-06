// Field utility functions for ServiceNow API responses
export const display = (field) => {
  if (typeof field === 'string') {
    return field;
  }
  return field?.display_value || '';
};

export const value = (field) => {
  if (typeof field === 'string') {
    return field;
  }
  return field?.value || '';
};

// Sanitize a value for use in ServiceNow encoded queries.
// Strips characters that could alter query logic (^, =, newlines).
export const sanitizeQueryValue = (val) => {
  if (typeof val !== 'string') return '';
  return val.replace(/[\^=\n\r]/g, '');
};