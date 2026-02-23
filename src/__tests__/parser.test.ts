import { parseTransactionDetails } from '../parser';

describe('parseTransactionDetails', () => {
  it('should parse "amount name" format', () => {
    const result = parseTransactionDetails('100 Coffee');
    expect(result).toEqual({ amount: 100, name: 'Coffee' });
  });

  it('should parse "amount name" format with currency symbol', () => {
    const result = parseTransactionDetails('$50.50 Groceries');
    expect(result).toEqual({ amount: 50.5, name: 'Groceries' });
  });

  it('should parse "name amount" format', () => {
    const result = parseTransactionDetails('Gas 75.25');
    expect(result).toEqual({ amount: 75.25, name: 'Gas' });
  });

  it('should handle negative amounts', () => {
    const result = parseTransactionDetails('-100 Refund');
    expect(result).toEqual({ amount: 100, name: 'Refund' });
  });

  it('should reject invalid input', () => {
    expect(parseTransactionDetails('')).toBeNull();
    expect(parseTransactionDetails('   ')).toBeNull();
    expect(parseTransactionDetails('invalid')).toBeNull();
  });

  it('should reject input over max length', () => {
    const longInput = 'a'.repeat(501);
    expect(parseTransactionDetails(longInput)).toBeNull();
  });

  it('should sanitize harmful characters', () => {
    const result = parseTransactionDetails('100 Coffee<script>');
    expect(result).toEqual({ amount: 100, name: 'Coffeescript' });
  });
});
