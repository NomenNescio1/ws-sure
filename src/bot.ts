import { ConversationState, Category, UserSession, Account } from './types';
import { SureAPI } from './sure-api';
import { getSession, updateSession, resetSession, formatCategoriesList, formatAccountsList } from './state';
import { parseTransactionDetails, formatCurrency, formatTransactionList } from './parser';

export class Bot {
  private sureApi: SureAPI;
  private categories: Category[] = [];
  private accounts: Account[] = [];

  constructor(sureApi: SureAPI) {
    this.sureApi = sureApi;
  }

  async initialize(): Promise<void> {
    const cats = await this.sureApi.getCategories();
    this.categories = Array.isArray(cats) ? cats : [];
    console.log(`Loaded ${this.categories.length} categories`);

    const accs = await this.sureApi.getAccounts();
    this.accounts = Array.isArray(accs) ? accs : [];
    console.log(`Loaded ${this.accounts.length} accounts`);
  }

  async handleMessage(userId: string, message: string): Promise<string> {
    const session = getSession(userId);
    const text = message.trim().toLowerCase();

    if (text === '/cancel' || text === 'cancel') {
      resetSession(userId);
      return '❌ Cancelled. Type "new" to add a transaction.';
    }

    if (text === '/back' || text === 'back' || text === 'menu') {
      resetSession(userId);
      return this.getMainMenu();
    }

    if (text === '/help' || text === 'help') {
      return this.getHelpMessage();
    }

    switch (session.state) {
      case ConversationState.IDLE:
        return this.handleIdle(userId, message);
      case ConversationState.SELECT_TYPE:
        return this.handleSelectType(userId, message);
      case ConversationState.SELECT_ACCOUNT:
        return this.handleSelectAccount(userId, message);
      case ConversationState.ENTER_DETAILS:
        return this.handleEnterDetails(userId, message);
      case ConversationState.SELECT_CATEGORY:
        return await this.handleSelectCategory(userId, message);
      default:
        resetSession(userId);
        return 'Something went wrong. Type "new" to start over.';
    }
  }

  private async handleIdle(userId: string, message: string): Promise<string> {
    const text = message.trim().toLowerCase();

    if (text === 'new' || text === '/add' || text === 'add') {
      if (this.accounts.length === 0) {
        return '❌ No accounts found. Please create an account in Sure.am first.';
      }
      updateSession(userId, { state: ConversationState.SELECT_TYPE });
      return `💰 *New Transaction*\n\n1. Expense\n2. Income\n\nReply with 1 or 2.\n\n_Type "/back" to return to main menu._`;
    }

    if (text === '/recent' || text === 'recent') {
      return await this.getRecentTransactions();
    }

    if (text === '/accounts' || text === 'accounts') {
      return this.listAccounts();
    }

    return this.getMainMenu();
  }

  private handleSelectType(userId: string, message: string): string {
    const text = message.trim().toLowerCase();

    if (text === '1' || text === 'expense' || text === 'expenses') {
      updateSession(userId, {
        state: ConversationState.SELECT_ACCOUNT,
        transactionType: 'expense',
        accounts: this.accounts,
      });
      return formatAccountsList(this.accounts);
    }

    if (text === '2' || text === 'income') {
      updateSession(userId, {
        state: ConversationState.SELECT_ACCOUNT,
        transactionType: 'income',
        accounts: this.accounts,
      });
      return formatAccountsList(this.accounts);
    }

    return 'Please reply with *1* (Expense) or *2* (Income).';
  }

  private handleSelectAccount(userId: string, message: string): string {
    const session = getSession(userId);
    const text = message.trim();
    const accounts = session.accounts || this.accounts;

    let selectedAccount: Account | undefined;
    const index = parseInt(text) - 1;

    if (!isNaN(index) && index >= 0 && index < accounts.length) {
      selectedAccount = accounts[index];
    } else {
      selectedAccount = accounts.find(
        a => a.name.toLowerCase() === text.toLowerCase()
      );
    }

    if (!selectedAccount) {
      return `❌ Invalid selection. Please reply with a number from the list.`;
    }

    const prompt = session.transactionType === 'expense'
      ? `📝 Enter amount and name.\n\nExample: \`25.50 Trader Joe's\``
      : `📝 Enter amount and name.\n\nExample: \`1500 Salary\``;

    updateSession(userId, {
      state: ConversationState.ENTER_DETAILS,
      accountId: selectedAccount.id,
    });

    return prompt + `\n\nAccount: *${selectedAccount.name}*\n\n_Type "/back" to return to main menu._`;
  }

  private handleEnterDetails(userId: string, message: string): string {
    const parsed = parseTransactionDetails(message);

    if (!parsed) {
      return `❌ Couldn't parse that. Please use format:\n\`25.50 Store Name\``;
    }

    updateSession(userId, {
      state: ConversationState.SELECT_CATEGORY,
      amount: parsed.amount,
      name: parsed.name,
      categories: this.categories,
    });

    return formatCategoriesList(this.categories);
  }

  private async handleSelectCategory(userId: string, message: string): Promise<string> {
    const session = getSession(userId);
    const text = message.trim();

    let selectedCategory: Category | undefined;
    const index = parseInt(text) - 1;

    if (!isNaN(index) && index >= 0 && index < this.categories.length) {
      selectedCategory = this.categories[index];
    } else {
      selectedCategory = this.categories.find(
        c => c.name.toLowerCase() === text.toLowerCase()
      );
    }

    if (!selectedCategory) {
      return `❌ Invalid selection. Please reply with a number from the list.`;
    }

    const amount = session.transactionType === 'expense'
      ? -Math.abs(session.amount!)
      : Math.abs(session.amount!);

    const account = this.accounts.find(a => a.id === session.accountId);
    const accountName = account?.name || 'Unknown';

    try {
      await this.sureApi.createTransaction({
        account_id: session.accountId!,
        date: new Date().toISOString().split('T')[0],
        amount: amount,
        name: session.name!,
        category_id: selectedCategory.id,
        nature: session.transactionType,
      });

      resetSession(userId);

      const sign = amount < 0 ? '-' : '+';
      return `✅ *Transaction added!*\n\n${sign}${formatCurrency(Math.abs(amount))} - ${session.name}\nCategory: ${selectedCategory.name}\nAccount: ${accountName}\n\nType "new" to add another.`;
    } catch (error: any) {
      console.error('Failed to create transaction:', error.message);
      return `❌ Failed to create transaction. Please try again.\n\nError: ${error.response?.data?.message || error.message}`;
    }
  }

  private async getRecentTransactions(): Promise<string> {
    try {
      const transactions = await this.sureApi.getTransactions(5);
      return formatTransactionList(transactions);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error.message);
      return `❌ Failed to fetch transactions: ${error.response?.data?.message || error.message}`;
    }
  }

  private listAccounts(): string {
    if (this.accounts.length === 0) {
      return '❌ No accounts found.';
    }

    let message = '🏦 *Your Accounts:*\n\n';
    this.accounts.forEach((acc, i) => {
      const balance = acc.balance ? ` - ${acc.balance}` : '';
      message += `${i + 1}. ${acc.name}${balance}\n`;
    });
    return message;
  }

  private getHelpMessage(): string {
    return `📚 *Sure.am WhatsApp Bot Help*\n\n*Commands:*\n• *new* or */add* - Add a new transaction\n• */recent* - View recent transactions\n• */accounts* - List your accounts\n• */back* - Go back to main menu\n• */cancel* - Cancel current operation\n• */help* - Show this message\n\n*How to add a transaction:*\n1. Type "new"\n2. Select Expense or Income\n3. Select an account\n4. Enter amount and name (e.g., "25.50 Store")\n5. Select a category\n\n*Tips:*\n• Amounts can be formatted as "25.50" or "$25.50"\n• You can put the name before or after the amount\n• Type "/back" at any time to return to main menu`;
  }

  private getMainMenu(): string {
    return `🏠 *Main Menu*\n\nCommands:\n• *new* - Add transaction\n• */recent* - View recent transactions\n• */accounts* - List accounts\n• */help* - Show this message`;
  }
}
