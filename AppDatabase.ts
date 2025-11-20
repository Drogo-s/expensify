
// AppDatabase.ts
// Combined database handling user authentication and financial transactions

import * as SQLite from 'expo-sqlite';

export class AppDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the database connection and create all tables
   * Call this ONCE when the app starts
   */
  async initDatabase(): Promise<void> {
    if (this.initialized) return;

    try {
      // Open or create the database file
      this.db = await SQLite.openDatabaseAsync('appdata.db');
      
      // Create users table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          pin TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create categories table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('Expense', 'Income')),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, name, type)
        );
      `);

      // Create transactions table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          category_id INTEGER,
          amount REAL NOT NULL,
          date INTEGER NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK (type IN ('Expense', 'Income')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
        );
      `);

      // Add demo user with sample data
      await this.createDemoUser();

      this.initialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create demo user with sample categories and transactions
   */
  private async createDemoUser(): Promise<void> {
    if (!this.db) return;

    try {
      // Check if demo user exists
      const existingUser = await this.db.getFirstAsync<{ id: number }>(
        'SELECT id FROM users WHERE username = ?',
        ['admin']
      );

      if (existingUser) {
        console.log('Demo user already exists');
        return;
      }

      // Create demo user
      const result = await this.db.runAsync(
        'INSERT INTO users (username, pin) VALUES (?, ?)',
        ['admin', '1234']
      );

      const userId = result.lastInsertRowId;

      // Add default categories
      const expenseCategories = [
        'Utilities', 'Electronics', 'Dining Out', 'Breakfast Supplies',
        'Household Items', 'Christmas Gifts', 'New Year Party Supplies',
        'Thanksgiving Groceries', 'Groceries', 'Rent'
      ];

      const incomeCategories = [
        'Bonus', 'Consulting Work', 'Part-time Job', 'Online Sales',
        'Freelance Writing', 'End of Year Bonus', 'Thanksgiving Freelance',
        'Salary', 'Freelancing'
      ];

      for (const category of expenseCategories) {
        await this.db.runAsync(
          'INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)',
          [userId, category, 'Expense']
        );
      }

      for (const category of incomeCategories) {
        await this.db.runAsync(
          'INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)',
          [userId, category, 'Income']
        );
      }

      // Add sample transactions (using category names for simplicity)
      const sampleTransactions = [
        // February 2024 - Expenses
        { category: 'Groceries', amount: 100.50, date: 1709814000, desc: 'Weekly groceries', type: 'Expense' },
        { category: 'Groceries', amount: 75.25, date: 1709900400, desc: 'More groceries', type: 'Expense' },
        { category: 'Rent', amount: 1200, date: 1707740400, desc: 'Monthly rent', type: 'Expense' },
        // January 2024 - Expenses
        { category: 'Breakfast Supplies', amount: 60.00, date: 1707154800, desc: 'Breakfast supplies', type: 'Expense' },
        { category: 'Household Items', amount: 110.75, date: 1707241200, desc: 'Household items', type: 'Expense' },
        { category: 'Utilities', amount: 50.25, date: 1707327600, desc: 'Utilities bill', type: 'Expense' },
        { category: 'Electronics', amount: 200.50, date: 1707414000, desc: 'Electronics', type: 'Expense' },
        { category: 'Dining Out', amount: 15.99, date: 1707500400, desc: 'Dining out', type: 'Expense' },
        // February 2024 - Income
        { category: 'Salary', amount: 3000, date: 1709914800, desc: 'Monthly salary', type: 'Income' },
        { category: 'Freelancing', amount: 500, date: 1710001200, desc: 'Freelance project', type: 'Income' },
        // January 2024 - Income
        { category: 'Bonus', amount: 3200, date: 1707266800, desc: 'Bonus', type: 'Income' },
        { category: 'Consulting Work', amount: 450, date: 1707353200, desc: 'Consulting work', type: 'Income' },
      ];

      for (const trans of sampleTransactions) {
        const category = await this.db.getFirstAsync<{ id: number }>(
          'SELECT id FROM categories WHERE user_id = ? AND name = ? AND type = ?',
          [userId, trans.category, trans.type]
        );

        if (category) {
          await this.db.runAsync(
            'INSERT INTO transactions (user_id, category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, category.id, trans.amount, trans.date, trans.desc, trans.type]
          );
        }
      }

      console.log('✅ Demo user and sample data created');
    } catch (error) {
      console.log('Demo user setup error (may already exist):', error);
    }
  }

  // ==================== USER OPERATIONS ====================

  /**
   * Create a new user account
   */
  async createUser(username: string, pin: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT INTO users (username, pin) VALUES (?, ?)',
        [username, pin]
      );
      console.log(`✅ User '${username}' created`);
      return true;
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        console.log(`❌ Username '${username}' already exists`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Authenticate user with username and PIN
   */
  async authenticateUser(username: string, pin: string): Promise<number | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<{ id: number }>(
        'SELECT id FROM users WHERE username = ? AND pin = ?',
        [username, pin]
      );

      if (result) {
        console.log(`🔐 Login SUCCESS for '${username}' (ID: ${result.id})`);
        return result.id;
      }
      
      console.log(`🔐 Login FAILED for '${username}'`);
      return null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  /**
   * Get all registered usernames
   */
  async getAllUsers(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const users = await this.db.getAllAsync<{ username: string }>(
        'SELECT username FROM users ORDER BY created_at DESC'
      );
      return users.map(u => u.username);
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  /**
   * Delete a user account
   */
  async deleteUser(username: string, pin: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const userId = await this.authenticateUser(username, pin);
      if (!userId) return false;

      await this.db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
      console.log(`✅ User '${username}' deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ==================== CATEGORY OPERATIONS ====================

  /**
   * Get all categories for a user
   */
  async getCategories(userId: number, type?: 'Expense' | 'Income'): Promise<Array<{ id: number; name: string; type: string }>> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const query = type
        ? 'SELECT id, name, type FROM categories WHERE user_id = ? AND type = ? ORDER BY name'
        : 'SELECT id, name, type FROM categories WHERE user_id = ? ORDER BY type, name';
      
      const params = type ? [userId, type] : [userId];
      const categories = await this.db.getAllAsync<{ id: number; name: string; type: string }>(query, params);
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Create a new category
   */
  async createCategory(userId: number, name: string, type: 'Expense' | 'Income'): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)',
        [userId, name, type]
      );
      console.log(`✅ Category '${name}' created`);
      return true;
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        console.log(`❌ Category '${name}' already exists`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(userId: number, categoryId: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'DELETE FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId]
      );
      console.log(`✅ Category deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  // ==================== TRANSACTION OPERATIONS ====================

  /**
   * Get all transactions for a user
   */
  async getTransactions(
    userId: number,
    filters?: {
      type?: 'Expense' | 'Income';
      startDate?: number;
      endDate?: number;
      categoryId?: number;
    }
  ): Promise<Array<{
    id: number;
    amount: number;
    date: number;
    description: string;
    type: string;
    categoryName: string;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = `
        SELECT 
          t.id, t.amount, t.date, t.description, t.type,
          COALESCE(c.name, 'Uncategorized') as categoryName
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
      `;
      const params: any[] = [userId];

      if (filters?.type) {
        query += ' AND t.type = ?';
        params.push(filters.type);
      }

      if (filters?.startDate) {
        query += ' AND t.date >= ?';
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ' AND t.date <= ?';
        params.push(filters.endDate);
      }

      if (filters?.categoryId) {
        query += ' AND t.category_id = ?';
        params.push(filters.categoryId);
      }

      query += ' ORDER BY t.date DESC';

      const transactions = await this.db.getAllAsync<{
        id: number;
        amount: number;
        date: number;
        description: string;
        type: string;
        categoryName: string;
      }>(query, params);

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  /**
   * Create a new transaction
   */
  async createTransaction(
    userId: number,
    categoryId: number | null,
    amount: number,
    date: number,
    description: string,
    type: 'Expense' | 'Income'
  ): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT INTO transactions (user_id, category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, categoryId, amount, date, description, type]
      );
      console.log(`✅ Transaction created: ${type} $${amount}`);
      return true;
    } catch (error) {
      console.error('Error creating transaction:', error);
      return false;
    }
  }

  /**
   * Update a transaction
   */
  async updateTransaction(
    userId: number,
    transactionId: number,
    updates: {
      categoryId?: number | null;
      amount?: number;
      date?: number;
      description?: string;
    }
  ): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const setParts: string[] = [];
      const params: any[] = [];

      if (updates.categoryId !== undefined) {
        setParts.push('category_id = ?');
        params.push(updates.categoryId);
      }
      if (updates.amount !== undefined) {
        setParts.push('amount = ?');
        params.push(updates.amount);
      }
      if (updates.date !== undefined) {
        setParts.push('date = ?');
        params.push(updates.date);
      }
      if (updates.description !== undefined) {
        setParts.push('description = ?');
        params.push(updates.description);
      }

      if (setParts.length === 0) return false;

      params.push(transactionId, userId);

      await this.db.runAsync(
        `UPDATE transactions SET ${setParts.join(', ')} WHERE id = ? AND user_id = ?`,
        params
      );
      console.log(`✅ Transaction updated`);
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(userId: number, transactionId: number): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'DELETE FROM transactions WHERE id = ? AND user_id = ?',
        [transactionId, userId]
      );
      console.log(`✅ Transaction deleted`);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }

  /**
   * Get financial summary for a user
   */
  async getFinancialSummary(
    userId: number,
    startDate?: number,
    endDate?: number
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as totalIncome,
          COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as totalExpenses,
          COUNT(*) as transactionCount
        FROM transactions
        WHERE user_id = ?
      `;
      const params: any[] = [userId];

      if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
      }

      const result = await this.db.getFirstAsync<{
        totalIncome: number;
        totalExpenses: number;
        transactionCount: number;
      }>(query, params);

      if (result) {
        return {
          totalIncome: result.totalIncome,
          totalExpenses: result.totalExpenses,
          balance: result.totalIncome - result.totalExpenses,
          transactionCount: result.transactionCount,
        };
      }

      return { totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return { totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 };
    }
  }

  /**
   * Close the database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
      console.log('🔒 Database connection closed');
    }
  }
}

// Export a singleton instance
export const appDatabase = new AppDatabase();