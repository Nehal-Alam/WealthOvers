import Decimal from "decimal.js";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "@/types/database";
import { toDecimal, addMoney, subtractMoney } from "@/lib/calculations/financial";

export type TransactionType = Database["public"]["Enums"]["transaction_type_enum"];

export interface LedgerEntryItem {
  accountId?: string | null;
  entityType: string;
  entityId?: string | null;
  entryType: "debit" | "credit";
  amount: number | string;
  currency?: string;
  description?: string;
}

export interface CreateFinancialTransactionInput {
  userId: string;
  transactionType: TransactionType;
  transactionSubtype?: string;
  amount: number | string;
  currency?: string;
  transactionDate?: string | Date;
  description: string;
  notes?: string;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  merchantId?: string;
  merchantOrPerson?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  sourceModule?: string;
  relatedTransactionId?: string;
  transferGroupId?: string;
  investmentId?: string;
  creditCardId?: string;
  loanId?: string;
  loanPaymentId?: string;
  sipScheduleId?: string;
  sipInstallmentId?: string;
  assetId?: string;
  idempotencyHash?: string;
  tags?: string[];
  // For repayments or multi-component transactions:
  principalAmount?: number | string;
  interestAmount?: number | string;
  extraPrepayment?: number | string;
  customLedgerEntries?: LedgerEntryItem[];
  // Status
  status?: string;
}

export interface FinancialTransactionResult {
  success: boolean;
  message?: string;
  error?: string;
  transaction?: Tables<"transactions">;
  ledgerEntries?: Tables<"ledger_entries">[];
}

export interface RunningBalanceRow {
  entry_id: string;
  transaction_id: string;
  transaction_number: string;
  transaction_date: string;
  description: string;
  transaction_type: TransactionType;
  entity_type: string;
  entry_type: "debit" | "credit";
  amount: number;
  money_in: number;
  money_out: number;
  running_balance: number;
  category_name?: string;
  merchant_or_person?: string;
}

export class FinancialTransactionService {
  /**
   * Primary entry point for creating any financial transaction with balanced double-entry ledger postings.
   */
  static async createFinancialTransaction(
    supabase: SupabaseClient<Database>,
    input: CreateFinancialTransactionInput
  ): Promise<FinancialTransactionResult> {
    try {
      const amountDec = toDecimal(input.amount);
      if (amountDec.lessThanOrEqualTo(0)) {
        return { success: false, error: "Transaction amount must be strictly greater than zero." };
      }

      const currency = input.currency || "INR";
      const txDateStr = input.transactionDate
        ? new Date(input.transactionDate).toISOString()
        : new Date().toISOString();

      // 1. Validate Account Ownership
      const { data: sourceAccount, error: accErr } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", input.accountId)
        .eq("user_id", input.userId)
        .single();

      if (accErr || !sourceAccount) {
        return { success: false, error: `Account not found or access denied: ${input.accountId}` };
      }

      // If transfer, validate destination account
      let destAccount: Tables<"accounts"> | null = null;
      if (input.transactionType === "transfer") {
        if (!input.destinationAccountId || input.destinationAccountId === input.accountId) {
          return {
            success: false,
            error: "Transfers require a valid and distinct destination account.",
          };
        }

        const { data: destAcc, error: destErr } = await supabase
          .from("accounts")
          .select("*")
          .eq("id", input.destinationAccountId)
          .eq("user_id", input.userId)
          .single();

        if (destErr || !destAcc) {
          return { success: false, error: "Destination account not found or access denied." };
        }
        destAccount = destAcc;
      }

      // 2. Determine Balanced Ledger Entries
      const ledgerEntriesToInsert: LedgerEntryItem[] = [];

      if (input.customLedgerEntries && input.customLedgerEntries.length > 0) {
        ledgerEntriesToInsert.push(...input.customLedgerEntries);
      } else {
        const autoEntries = this.buildStandardLedgerEntries(input, sourceAccount, destAccount);
        ledgerEntriesToInsert.push(...autoEntries);
      }

      // Verify Double-Entry Balance: sum(debits) must equal sum(credits)
      let totalDebits = toDecimal(0);
      let totalCredits = toDecimal(0);

      for (const entry of ledgerEntriesToInsert) {
        const entAmt = toDecimal(entry.amount);
        if (entry.entryType === "debit") {
          totalDebits = totalDebits.plus(entAmt);
        } else if (entry.entryType === "credit") {
          totalCredits = totalCredits.plus(entAmt);
        }
      }

      const imbalance = totalDebits.minus(totalCredits).abs();
      if (imbalance.greaterThan(0.0001)) {
        return {
          success: false,
          error: `Accounting imbalance detected: Total Debits (₹${totalDebits.toFixed(
            2
          )}) do not equal Total Credits (₹${totalCredits.toFixed(2)}).`,
        };
      }

      // 3. Insert Master Transaction
      const { data: newTx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: input.userId,
          account_id: input.accountId,
          destination_account_id: input.destinationAccountId || null,
          category_id: input.categoryId || null,
          subcategory_id: input.subcategoryId || null,
          merchant_id: input.merchantId || null,
          amount: amountDec.toNumber(),
          currency: currency,
          transaction_type: input.transactionType,
          transaction_date: txDateStr,
          description: input.description.trim(),
          notes: input.notes?.trim() || null,
          reference_number: input.referenceNumber?.trim() || null,
          source: "manual",
          is_reviewed: true,
          transaction_subtype: input.transactionSubtype || null,
          merchant_or_person: input.merchantOrPerson?.trim() || null,
          payment_method: input.paymentMethod || null,
          status: input.status || "completed",
          source_module: input.sourceModule || "transactions",
          related_transaction_id: input.relatedTransactionId || null,
          transfer_group_id: input.transferGroupId || null,
          investment_id: input.investmentId || null,
          credit_card_id: input.creditCardId || null,
          loan_id: input.loanId || null,
          loan_payment_id: input.loanPaymentId || null,
          sip_schedule_id: input.sipScheduleId || null,
          sip_installment_id: input.sipInstallmentId || null,
          asset_id: input.assetId || null,
          idempotency_hash: input.idempotencyHash || null,
          tags: input.tags || [],
        })
        .select()
        .single();

      if (txError || !newTx) {
        return { success: false, error: txError?.message || "Failed to create master transaction" };
      }

      // 4. Insert Ledger Entries
      const dbLedgerEntries = ledgerEntriesToInsert.map((e) => ({
        transaction_id: newTx.id,
        user_id: input.userId,
        account_id: e.accountId || null,
        entity_type: e.entityType,
        entity_id: e.entityId || null,
        entry_type: e.entryType,
        amount: toDecimal(e.amount).toNumber(),
        currency: e.currency || currency,
        description: e.description || input.description.trim(),
      }));

      const { data: insertedEntries, error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert(dbLedgerEntries)
        .select();

      if (ledgerError) {
        // Rollback transaction if ledger insert fails
        await supabase.from("transactions").delete().eq("id", newTx.id);
        return { success: false, error: `Ledger entry creation failed: ${ledgerError.message}` };
      }

      // 5. Atomic Account Balance Adjustments
      await this.applyBalanceAdjustments(supabase, input, sourceAccount, destAccount, amountDec);

      return {
        success: true,
        message: "Financial transaction posted successfully to unified ledger",
        transaction: newTx,
        ledgerEntries: insertedEntries || [],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected transaction processing error";
      return { success: false, error: msg };
    }
  }

  /**
   * Builds standardized, double-entry balanced entries based on fintech accounting principles.
   */
  private static buildStandardLedgerEntries(
    input: CreateFinancialTransactionInput,
    sourceAccount: Tables<"accounts">,
    destAccount: Tables<"accounts"> | null
  ): LedgerEntryItem[] {
    const amountDec = toDecimal(input.amount);
    const currency = input.currency || sourceAccount.currency || "INR";
    const entries: LedgerEntryItem[] = [];

    switch (input.transactionType) {
      case "income":
        // Debit: Bank Account (Asset increases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Income Category (Income increases)
        entries.push({
          accountId: null,
          entityType: "income",
          entityId: input.categoryId || null,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "expense":
      case "bank_charges":
        // Debit: Expense Category (Expense increases)
        entries.push({
          accountId: null,
          entityType: "expense",
          entityId: input.categoryId || null,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Bank Account (Asset decreases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "transfer":
        if (destAccount) {
          // Debit: Destination Account (Asset increases)
          entries.push({
            accountId: destAccount.id,
            entityType: "bank_account",
            entityId: destAccount.id,
            entryType: "debit",
            amount: amountDec.toString(),
            currency,
            description: input.description,
          });
          // Credit: Source Account (Asset decreases)
          entries.push({
            accountId: sourceAccount.id,
            entityType: "bank_account",
            entityId: sourceAccount.id,
            entryType: "credit",
            amount: amountDec.toString(),
            currency,
            description: input.description,
          });
        }
        break;

      case "borrowing":
        // Debit: Bank Account (Asset increases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Loan Payable (Liability increases)
        entries.push({
          accountId: null,
          entityType: "loan_payable",
          entityId: input.loanId || null,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "borrowing_repayment":
      case "loan_repayment": {
        const principalPart = input.principalAmount
          ? toDecimal(input.principalAmount)
          : amountDec;
        const interestPart = input.interestAmount ? toDecimal(input.interestAmount) : toDecimal(0);

        // Debit: Loan Payable (Liability decreases by principal portion)
        if (principalPart.greaterThan(0)) {
          entries.push({
            accountId: null,
            entityType: "loan_payable",
            entityId: input.loanId || null,
            entryType: "debit",
            amount: principalPart.toString(),
            currency,
            description: `Principal repayment: ${input.description}`,
          });
        }

        // Debit: Expense / Interest (Expense increases by interest portion)
        if (interestPart.greaterThan(0)) {
          entries.push({
            accountId: null,
            entityType: "expense",
            entityId: input.categoryId || null,
            entryType: "debit",
            amount: interestPart.toString(),
            currency,
            description: `Interest expense: ${input.description}`,
          });
        }

        // Credit: Bank Account (Asset decreases by total cash paid)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;
      }

      case "lending":
        // Debit: Loan Receivable (Asset increases)
        entries.push({
          accountId: null,
          entityType: "loan_receivable",
          entityId: input.loanId || null,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Bank Account (Asset decreases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "lending_collection": {
        const principalPart = input.principalAmount
          ? toDecimal(input.principalAmount)
          : amountDec;
        const interestPart = input.interestAmount ? toDecimal(input.interestAmount) : toDecimal(0);

        // Debit: Bank Account (Asset increases by total cash collected)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });

        // Credit: Loan Receivable (Asset decreases by principal recovered)
        if (principalPart.greaterThan(0)) {
          entries.push({
            accountId: null,
            entityType: "loan_receivable",
            entityId: input.loanId || null,
            entryType: "credit",
            amount: principalPart.toString(),
            currency,
            description: `Principal collection: ${input.description}`,
          });
        }

        // Credit: Income / Interest (Income increases by interest earned)
        if (interestPart.greaterThan(0)) {
          entries.push({
            accountId: null,
            entityType: "income",
            entityId: input.categoryId || null,
            entryType: "credit",
            amount: interestPart.toString(),
            currency,
            description: `Interest income: ${input.description}`,
          });
        }
        break;
      }

      case "investment_buy":
      case "sip":
        // Debit: Investment Holding (Asset increases)
        entries.push({
          accountId: null,
          entityType: "investment_holding",
          entityId: input.investmentId || null,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Bank Account (Asset decreases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "investment_sell":
        // Debit: Bank Account (Asset increases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Investment Holding (Asset decreases)
        entries.push({
          accountId: null,
          entityType: "investment_holding",
          entityId: input.investmentId || null,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "credit_card_purchase":
        // Debit: Expense Category (Expense increases)
        entries.push({
          accountId: null,
          entityType: "expense",
          entityId: input.categoryId || null,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Credit Card Liability (Liability increases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "credit_card_liability",
          entityId: input.creditCardId || sourceAccount.id,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "credit_card_repayment":
        // Debit: Credit Card Liability (Liability decreases)
        entries.push({
          accountId: input.destinationAccountId || null,
          entityType: "credit_card_liability",
          entityId: input.creditCardId || null,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Bank Account (Asset decreases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "refund":
        // Debit: Bank Account (Asset increases)
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        // Credit: Expense Category (Expense decreases / contra-expense)
        entries.push({
          accountId: null,
          entityType: "expense",
          entityId: input.categoryId || null,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;

      case "loan_disbursement": {
        // If account_type is lending vs borrowing
        const isLending = input.transactionSubtype === "lending";
        if (isLending) {
          entries.push({
            accountId: null,
            entityType: "loan_receivable",
            entityId: input.loanId || null,
            entryType: "debit",
            amount: amountDec.toString(),
            currency,
            description: input.description,
          });
          entries.push({
            accountId: sourceAccount.id,
            entityType: "bank_account",
            entityId: sourceAccount.id,
            entryType: "credit",
            amount: amountDec.toString(),
            currency,
            description: input.description,
          });
        } else {
          entries.push({
            accountId: sourceAccount.id,
            entityType: "bank_account",
            entityId: sourceAccount.id,
            entryType: "debit",
            amount: amountDec.toString(),
            currency,
            description: input.description,
          });
          entries.push({
            accountId: null,
            entityType: "loan_payable",
            entityId: input.loanId || null,
            entryType: "credit",
            amount: amountDec.toString(),
            currency,
            description: input.description,
          });
        }
        break;
      }

      default:
        // Generic fallback balanced posting
        entries.push({
          accountId: sourceAccount.id,
          entityType: "bank_account",
          entityId: sourceAccount.id,
          entryType: "debit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        entries.push({
          accountId: null,
          entityType: "equity_adjustment",
          entityId: null,
          entryType: "credit",
          amount: amountDec.toString(),
          currency,
          description: input.description,
        });
        break;
    }

    return entries;
  }

  /**
   * Applies atomic state updates to account balances, credit cards, or loan entities.
   */
  private static async applyBalanceAdjustments(
    supabase: SupabaseClient<Database>,
    input: CreateFinancialTransactionInput,
    sourceAccount: Tables<"accounts">,
    destAccount: Tables<"accounts"> | null,
    amountDec: Decimal
  ): Promise<void> {
    const curSourceBal = toDecimal(sourceAccount.current_balance);

    // 1. Bank Account adjustment
    switch (input.transactionType) {
      case "income":
      case "borrowing":
      case "lending_collection":
      case "investment_sell":
      case "refund": {
        const newBal = curSourceBal.plus(amountDec);
        await supabase
          .from("accounts")
          .update({ current_balance: newBal.toNumber(), updated_at: new Date().toISOString() })
          .eq("id", sourceAccount.id);
        break;
      }

      case "expense":
      case "bank_charges":
      case "lending":
      case "investment_buy":
      case "sip":
      case "credit_card_repayment":
      case "borrowing_repayment":
      case "loan_repayment": {
        const newBal = curSourceBal.minus(amountDec);
        await supabase
          .from("accounts")
          .update({ current_balance: newBal.toNumber(), updated_at: new Date().toISOString() })
          .eq("id", sourceAccount.id);
        break;
      }

      case "transfer": {
        if (destAccount) {
          const newSourceBal = curSourceBal.minus(amountDec);
          const newDestBal = toDecimal(destAccount.current_balance).plus(amountDec);

          await supabase
            .from("accounts")
            .update({
              current_balance: newSourceBal.toNumber(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", sourceAccount.id);

          await supabase
            .from("accounts")
            .update({
              current_balance: newDestBal.toNumber(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", destAccount.id);
        }
        break;
      }

      case "credit_card_purchase": {
        // Bank account is NOT touched!
        // Credit card liability increases!
        if (input.creditCardId) {
          const { data: card } = await supabase
            .from("credit_cards")
            .select("id, current_outstanding")
            .eq("id", input.creditCardId)
            .single();

          if (card) {
            const newOutstanding = toDecimal(card.current_outstanding).plus(amountDec);
            await supabase
              .from("credit_cards")
              .update({
                current_outstanding: newOutstanding.toNumber(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", card.id);
          }
        }
        break;
      }

      case "loan_disbursement": {
        const isLending = input.transactionSubtype === "lending";
        const newBal = isLending ? curSourceBal.minus(amountDec) : curSourceBal.plus(amountDec);
        await supabase
          .from("accounts")
          .update({ current_balance: newBal.toNumber(), updated_at: new Date().toISOString() })
          .eq("id", sourceAccount.id);
        break;
      }
    }

    // 2. Credit Card Repayment adjustment on the card entity
    if (input.transactionType === "credit_card_repayment" && input.creditCardId) {
      const { data: card } = await supabase
        .from("credit_cards")
        .select("id, current_outstanding")
        .eq("id", input.creditCardId)
        .single();

      if (card) {
        const newOutstanding = Decimal.max(0, toDecimal(card.current_outstanding).minus(amountDec));
        await supabase
          .from("credit_cards")
          .update({
            current_outstanding: newOutstanding.toNumber(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.id);
      }
    }
  }

  /**
   * Reverses a completed financial transaction through immutable contra-entries.
   */
  static async reverseFinancialTransaction(
    supabase: SupabaseClient<Database>,
    transactionId: string,
    userId: string,
    reason: string
  ): Promise<FinancialTransactionResult> {
    try {
      const { data: origTx, error: origErr } = await supabase
        .from("transactions")
        .select("*, ledger_entries(*)")
        .eq("id", transactionId)
        .eq("user_id", userId)
        .single();

      if (origErr || !origTx) {
        return { success: false, error: "Original transaction not found or access denied." };
      }

      if (origTx.status === "reversed") {
        return { success: false, error: "This transaction has already been reversed." };
      }

      const origEntries = (origTx as any).ledger_entries as Tables<"ledger_entries">[] | undefined;
      if (!origEntries || origEntries.length === 0) {
        return { success: false, error: "No ledger entries found for the original transaction." };
      }

      // Invert all ledger entries: debits become credits, credits become debits
      const contraEntries: LedgerEntryItem[] = origEntries.map((e) => ({
        accountId: e.account_id,
        entityType: e.entity_type,
        entityId: e.entity_id,
        entryType: e.entry_type === "debit" ? "credit" : "debit",
        amount: e.amount,
        currency: e.currency,
        description: `Reversal of ${origTx.transaction_number || origTx.id}: ${reason}`,
      }));

      // Create Reversal Transaction
      const reversalResult = await this.createFinancialTransaction(supabase, {
        userId,
        transactionType: "refund",
        transactionSubtype: "reversal",
        amount: origTx.amount,
        currency: origTx.currency,
        description: `REVERSAL: ${origTx.description} (${reason})`,
        notes: `Reversal for transaction ${origTx.transaction_number || origTx.id}. Reason: ${reason}`,
        accountId: origTx.account_id,
        destinationAccountId: origTx.destination_account_id || undefined,
        categoryId: origTx.category_id || undefined,
        relatedTransactionId: origTx.id,
        customLedgerEntries: contraEntries,
        status: "completed",
        sourceModule: origTx.source_module || "transactions",
      });

      if (!reversalResult.success) {
        return reversalResult;
      }

      // Mark original transaction as reversed
      await supabase
        .from("transactions")
        .update({
          status: "reversed",
          notes: `${origTx.notes ? origTx.notes + "\n" : ""}[REVERSED on ${new Date().toISOString()}: ${reason}]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", origTx.id);

      return {
        success: true,
        message: "Transaction successfully reversed with immutable ledger audit trail.",
        transaction: reversalResult.transaction,
        ledgerEntries: reversalResult.ledgerEntries,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reverse transaction";
      return { success: false, error: msg };
    }
  }

  /**
   * Retrieves a single transaction with complete ledger postings and linked entities.
   */
  static async getTransactionWithDetails(
    supabase: SupabaseClient<Database>,
    transactionId: string,
    userId: string
  ) {
    const { data: txn, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        account:accounts!transactions_account_id_fkey(id, name, account_type, color, current_balance, currency),
        destination_account:accounts!transactions_destination_account_id_fkey(id, name, account_type, color, current_balance, currency),
        category:categories(id, name, icon, color),
        ledger_entries(*),
        investment:investments(id, name, symbol, asset_type, broker_name, current_valuation),
        credit_card:credit_cards(id, card_name, issuer_name, last_four_digits, current_outstanding),
        loan:loans(id, lender_or_borrower_name, loan_type, principal_amount, outstanding_balance, annual_interest_rate),
        loan_payment:loan_payments(id, payment_date, emi_amount, principal_component, interest_component, extra_prepayment, remaining_balance),
        sip_schedule:sip_schedules(id, sip_name, amount, frequency, next_due_date),
        related_transaction:transactions!transactions_related_transaction_id_fkey(id, transaction_number, description, amount, transaction_type, transaction_date)
      `
      )
      .eq("id", transactionId)
      .eq("user_id", userId)
      .single();

    if (error || !txn) return null;
    return txn;
  }

  /**
   * Traces all linked transactions for any financial entity (loan, borrowing, investment, credit card).
   */
  static async getLinkedTransactionsForEntity(
    supabase: SupabaseClient<Database>,
    params: {
      entityType: "loan" | "credit_card" | "investment" | "sip" | "account";
      entityId: string;
      userId: string;
    }
  ) {
    let query = supabase
      .from("transactions")
      .select(
        `
        id, transaction_number, transaction_type, transaction_subtype, amount, currency, transaction_date, description, merchant_or_person, status, notes,
        account:accounts!transactions_account_id_fkey(id, name, color),
        category:categories(id, name, icon, color),
        ledger_entries(*)
      `
      )
      .eq("user_id", params.userId)
      .order("transaction_date", { ascending: false });

    if (params.entityType === "loan") {
      query = query.eq("loan_id", params.entityId);
    } else if (params.entityType === "credit_card") {
      query = query.eq("credit_card_id", params.entityId);
    } else if (params.entityType === "investment") {
      query = query.eq("investment_id", params.entityId);
    } else if (params.entityType === "sip") {
      query = query.eq("sip_schedule_id", params.entityId);
    } else if (params.entityType === "account") {
      query = query.or(`account_id.eq.${params.entityId},destination_account_id.eq.${params.entityId}`);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  }

  /**
   * Computes exact account running balance history from opening balance and ledger movements.
   * Running Balance = Opening Balance + Sum(Money In) - Sum(Money Out)
   */
  static async getAccountRunningBalanceHistory(
    supabase: SupabaseClient<Database>,
    accountId: string,
    userId: string
  ): Promise<{
    account: Tables<"accounts"> | null;
    openingBalance: number;
    closingBalance: number;
    totalMoneyIn: number;
    totalMoneyOut: number;
    rows: RunningBalanceRow[];
  }> {
    // 1. Fetch account
    const { data: account } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (!account) {
      return {
        account: null,
        openingBalance: 0,
        closingBalance: 0,
        totalMoneyIn: 0,
        totalMoneyOut: 0,
        rows: [],
      };
    }

    // 2. Fetch all ledger entries affecting this account chronologically
    const { data: entries, error } = await supabase
      .from("ledger_entries")
      .select(
        `
        id, transaction_id, entity_type, entry_type, amount, currency, description, created_at,
        transaction:transactions(
          id, transaction_number, transaction_type, transaction_date, merchant_or_person,
          category:categories(name)
        )
      `
      )
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error || !entries) {
      return {
        account,
        openingBalance: 0,
        closingBalance: Number(account.current_balance || 0),
        totalMoneyIn: 0,
        totalMoneyOut: 0,
        rows: [],
      };
    }

    // Starting baseline
    let currentRunning = toDecimal(0);
    let totalIn = toDecimal(0);
    let totalOut = toDecimal(0);
    const rows: RunningBalanceRow[] = [];

    for (const ent of entries) {
      const amt = toDecimal(ent.amount);
      const isDebit = ent.entry_type === "debit";
      // For asset accounts (bank, cash, wallet):
      // Debit increases cash (Money In), Credit decreases cash (Money Out)
      const moneyIn = isDebit ? amt.toNumber() : 0;
      const moneyOut = !isDebit ? amt.toNumber() : 0;

      if (isDebit) {
        currentRunning = currentRunning.plus(amt);
        totalIn = totalIn.plus(amt);
      } else {
        currentRunning = currentRunning.minus(amt);
        totalOut = totalOut.plus(amt);
      }

      const txnData = (ent as any).transaction;

      rows.push({
        entry_id: ent.id,
        transaction_id: ent.transaction_id,
        transaction_number: txnData?.transaction_number || `TXN-${ent.id.slice(0, 8)}`,
        transaction_date: txnData?.transaction_date || ent.created_at,
        description: ent.description || txnData?.description || "Ledger entry",
        transaction_type: (txnData?.transaction_type as TransactionType) || "expense",
        entity_type: ent.entity_type,
        entry_type: ent.entry_type as "debit" | "credit",
        amount: amt.toNumber(),
        money_in: moneyIn,
        money_out: moneyOut,
        running_balance: currentRunning.toNumber(),
        category_name: txnData?.category?.name || undefined,
        merchant_or_person: txnData?.merchant_or_person || undefined,
      });
    }

    // Return in reverse chronological order for UX display (newest first)
    rows.reverse();

    return {
      account,
      openingBalance: 0,
      closingBalance: currentRunning.toNumber(),
      totalMoneyIn: totalIn.toNumber(),
      totalMoneyOut: totalOut.toNumber(),
      rows,
    };
  }
}
