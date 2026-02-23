import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Account,
  Category,
  Transaction,
  CreateTransactionParams,
} from './types';

export class SureAPI {
  private client: AxiosInstance;
  private requestTimeout = 30000; // 30 seconds

  constructor(baseUrl: string, apiKey: string) {
    if (!baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!apiKey) {
      throw new Error('apiKey is required');
    }

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: this.requestTimeout,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Formats error message from API response
   */
  private formatErrorMessage(error: AxiosError<any>): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.statusText) {
      return error.response.statusText;
    }
    return error.message;
  }

  async getAccounts(): Promise<Account[]> {
    try {
      const response = await this.client.get('/api/v1/accounts');
      return response.data.accounts || response.data;
    } catch (error: any) {
      console.error('Failed to fetch accounts:', {
        status: error.response?.status,
        message: this.formatErrorMessage(error),
      });
      throw new Error(`Failed to fetch accounts: ${this.formatErrorMessage(error)}`);
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.client.get('/api/v1/categories');
      return response.data.categories || response.data;
    } catch (error: any) {
      console.error('Failed to fetch categories:', {
        status: error.response?.status,
        message: this.formatErrorMessage(error),
      });
      throw new Error(`Failed to fetch categories: ${this.formatErrorMessage(error)}`);
    }
  }

  async getTransactions(limit: number = 5): Promise<Transaction[]> {
    try {
      // Validate limit
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Limit must be an integer between 1 and 100');
      }

      const response = await this.client.get('/api/v1/transactions', {
        params: { limit },
      });
      return response.data.transactions || response.data;
    } catch (error: any) {
      console.error('Failed to fetch transactions:', {
        status: error.response?.status,
        message: this.formatErrorMessage(error),
        limit,
      });
      throw new Error(`Failed to fetch transactions: ${this.formatErrorMessage(error)}`);
    }
  }

  async createTransaction(params: CreateTransactionParams): Promise<Transaction> {
    try {
      // Validate required parameters
      if (!params.account_id) {
        throw new Error('account_id is required');
      }
      if (!params.date) {
        throw new Error('date is required');
      }
      if (!params.name) {
        throw new Error('name is required');
      }
      if (params.name.length > 255) {
        throw new Error('name must be 255 characters or less');
      }

      // Validate date format (ISO 8601)
      const dateObj = new Date(params.date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('date must be a valid ISO 8601 date');
      }

      const response = await this.client.post('/api/v1/transactions', {
        transaction: params,
      });
      return response.data;
    } catch (error: any) {
      if (error.message.startsWith('Failed to fetch')) {
        throw error;
      }
      const message = error.response?.data?.message || this.formatErrorMessage(error);
      console.error('Failed to create transaction:', {
        status: error.response?.status,
        message,
        params,
      });
      throw new Error(`Failed to create transaction: ${message}`);
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('Transaction ID is required');
      }
      
      await this.client.delete(`/api/v1/transactions/${id}`);
    } catch (error: any) {
      console.error('Failed to delete transaction:', {
        status: error.response?.status,
        message: this.formatErrorMessage(error),
        id,
      });
      throw new Error(`Failed to delete transaction: ${this.formatErrorMessage(error)}`);
    }
  }
}
