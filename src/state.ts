import { UserSession, ConversationState, Category, Account } from './types';

const sessions = new Map<string, UserSession>();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      state: ConversationState.IDLE,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    });
  }
  return sessions.get(userId)!;
}

export function updateSession(userId: string, updates: Partial<UserSession>): UserSession {
  const session = getSession(userId);
  const updated = { ...session, ...updates, lastActivityAt: new Date() };
  sessions.set(userId, updated);
  return updated;
}

export function resetSession(userId: string): void {
  sessions.set(userId, {
    state: ConversationState.IDLE,
    createdAt: new Date(),
    lastActivityAt: new Date(),
  });
}

export function formatCategoriesList(categories: Category[]): string {
  const expenseCategories = categories.filter(c => c.classification === 'expense');
  const incomeCategories = categories.filter(c => c.classification === 'income');
  
  let message = '📁 *Select a category:*\n\n';
  
  if (expenseCategories.length > 0) {
    message += '*Expenses:*\n';
    expenseCategories.forEach((cat, i) => {
      message += `${i + 1}. ${cat.name}\n`;
    });
  }
  
  if (incomeCategories.length > 0) {
    message += '\n*Income:*\n';
    const startIndex = expenseCategories.length;
    incomeCategories.forEach((cat, i) => {
      message += `${startIndex + i + 1}. ${cat.name}\n`;
    });
  }
  
  message += '\nReply with the number or type the category name.\n\n_Type "/back" to return to main menu._';
  return message;
}

export function formatAccountsList(accounts: Account[]): string {
  if (accounts.length === 0) {
    return '❌ No accounts found. Please create an account in Sure.am first.';
  }

  let message = '🏦 *Select an account:*\n\n';
  accounts.forEach((acc, i) => {
    const balance = acc.balance ? ` (${acc.balance})` : '';
    message += `${i + 1}. ${acc.name}${balance}\n`;
  });
  message += '\nReply with the number.\n\n_Type "/back" to return to main menu._';
  return message;
}
