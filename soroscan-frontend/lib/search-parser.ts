export interface SearchFilters {
  type?: string;
  contract?: string;
  amount?: {
    operator: '>' | '<' | '>=' | '<=' | '=';
    value: number;
  };
  text: string[];
}

/**
 * Parses a search query string into a structured SearchFilters object.
 * Syntax examples:
 * - type:transfer
 * - contract:C...
 * - amount:>1000
 * - plain text search
 */
export function parseSearchQuery(query: string): SearchFilters {
  const filters: SearchFilters = {
    text: [],
  };

  if (!query.trim()) return filters;

  // Regex to match key:value pairs, including operators for amount
  // Matches: key:value or key:opvalue
  const partRegex = /(\w+):([><]=?|==?)?([^\s]+)/g;
  let match;
  let lastIndex = 0;

  while ((match = partRegex.exec(query)) !== null) {
    const [fullMatch, key, operator, value] = match;
    
    // Add any preceding text as general search terms
    const preceding = query.substring(lastIndex, match.index).trim();
    if (preceding) {
      filters.text.push(...preceding.split(/\s+/));
    }

    const normalizedKey = key.toLowerCase();
    
    if (normalizedKey === 'type') {
      filters.type = value;
    } else if (normalizedKey === 'contract') {
      filters.contract = value;
    } else if (normalizedKey === 'amount') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        filters.amount = {
          operator: (['>', '<', '>=', '<=', '='].includes(operator || '') ? operator : '=') as '>' | '<' | '>=' | '<=' | '=',
          value: numValue,
        };
      }
    } else {
      // Treat unknown keys as values? Or just ignore? 
      // For now, let's just add it to text if it doesn't match a known field
      filters.text.push(fullMatch);
    }

    lastIndex = partRegex.lastIndex;
  }

  // Add remaining text
  const remaining = query.substring(lastIndex).trim();
  if (remaining) {
    filters.text.push(...remaining.split(/\s+/));
  }

  return filters;
}

/**
 * Checks if an event payload (or event record) matches the parsed filters.
 * Note: This is an initial client-side implementation.
 */
export function matchesFilters(event: { eventType: string; contractId: string; payload?: unknown }, filters: SearchFilters): boolean {
  if (filters.type && !event.eventType.toLowerCase().includes(filters.type.toLowerCase())) {
    return false;
  }

  if (filters.contract && !event.contractId.toLowerCase().includes(filters.contract.toLowerCase())) {
    return false;
  }

  if (filters.amount && event.payload && typeof event.payload === 'object' && 'amount' in (event.payload as Record<string, unknown>)) {
    const amountVal = (event.payload as Record<string, unknown>).amount;
    const amount = typeof amountVal === 'number' ? amountVal : parseFloat(String(amountVal));
    if (!isNaN(amount)) {
      const { operator, value } = filters.amount;
      switch (operator) {
        case '>': if (!(amount > value)) return false; break;
        case '<': if (!(amount < value)) return false; break;
        case '>=': if (!(amount >= value)) return false; break;
        case '<=': if (!(amount <= value)) return false; break;
        case '=': if (!(amount === value)) return false; break;
      }
    } else if (filters.amount) {
        // If amount filter exists but event has no amount, it's a mismatch
        return false;
    }
  }

  if (filters.text.length > 0) {
    const eventStr = JSON.stringify(event).toLowerCase();
    return filters.text.every(term => eventStr.includes(term.toLowerCase()));
  }

  return true;
}
