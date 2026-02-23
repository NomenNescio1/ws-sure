export interface ParsedTransaction {
  amount: number;
  name: string;
}

/**
 * Validates and sanitizes input string
 */
function validateInput(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const maxLength = 500;

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  // Sanitize input to prevent injection attacks
  const sanitized = trimmed.replace(/[<>\"'`]/g, '');
  
  if (sanitized.length === 0) {
    return null;
  }

  return sanitized;
}

export function parseTransactionDetails(input: string): ParsedTransaction | null {
  const validated = validateInput(input);
  if (!validated) {
    return null;
  }
  
  const patterns = [
    /^(-?\d+(?:\.\d{1,2})?)\s+(.+)$/,
    /^(\$?-?\d+(?:\.\d{1,2})?)\s+(.+)$/,
    /^(.+?)\s+(-?\d+(?:\.\d{1,2})?)$/,
    /^(.+?)\s+(\$?-?\d+(?:\.\d{1,2})?)$/,
  ];

  for (const pattern of patterns) {
    const match = validated.match(pattern);
    if (match) {
      let amountStr = match[1].replace('$', '').replace(',', '');
      let name = match[2].trim();
      
      if (pattern === patterns[2] || pattern === patterns[3]) {
        amountStr = match[2].replace('$', '').replace(',', '');
        name = match[1].trim();
      }
      
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && name.length > 0 && name.length <= 255) {
        return { amount: Math.abs(amount), name };
      }
    }
  }

  return null;
}

export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

export function formatTransactionList(transactions: any[]): string {
  if (transactions.length === 0) {
    return 'No transactions found.';
  }

  const lines = transactions.map((t, i) => {
    const amount = parseFloat(t.amount);
    const sign = amount < 0 ? '' : '+';
    const date = new Date(t.date).toLocaleDateString();
    return `${i + 1}. ${sign}${formatCurrency(amount)} - ${t.name}\n   ${date} | ${t.category?.name || 'Uncategorized'}`;
  });

  return `📋 *Recent Transactions*\n\n${lines.join('\n\n')}`;
}
