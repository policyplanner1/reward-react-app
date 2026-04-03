const cron = require("node-cron");
const TransactionModel = require("../../app/bbps/v1/models/transactionModel");
const ekoService = require("../../app/bbps/v1/services/eko_service");

cron.schedule("*/5 * * * *", async () => {
  console.log("🔁 BBPS retry cron running...");

  const failedTxns = await TransactionModel.getRetryable();

  for (const txn of failedTxns) {
    try {
      const res = await ekoService.payBill({
        utility_acc_no: txn.utility_acc_no,
        operator_id: txn.operator_id,
        amount: txn.amount,
        cycle_number: txn.cycle_number,
      });

      await TransactionModel.updateStatus(txn.id, "PAID", res);

      console.log(`Retried success: ${txn.id}`);
    } catch (err) {
      console.error(`Retry failed: ${txn.id}`);

      await TransactionModel.incrementRetry(txn.id);
    }
  }
});
