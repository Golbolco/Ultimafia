const models = require("../db/models");

const COIN_BANK_USER_ID = "30042g6fX";

function getModifiedCount(updateResult) {
  return (
    updateResult?.modifiedCount ??
    updateResult?.nModified ??
    updateResult?.matchedCount ??
    0
  );
}

async function transferCoinsFromBank(recipientUserId, amount) {
  const transferAmount = Number(amount);
  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    return 0;
  }

  const debitResult = await models.User.updateOne(
    { id: COIN_BANK_USER_ID },
    { $inc: { coins: -transferAmount } }
  ).exec();

  if (!getModifiedCount(debitResult)) {
    throw new Error(`Coin bank user ${COIN_BANK_USER_ID} not found.`);
  }

  try {
    const creditResult = await models.User.updateOne(
      { id: recipientUserId },
      { $inc: { coins: transferAmount } }
    ).exec();

    if (!getModifiedCount(creditResult)) {
      throw new Error(`Recipient user ${recipientUserId} not found.`);
    }
  } catch (e) {
    await models.User.updateOne(
      { id: COIN_BANK_USER_ID },
      { $inc: { coins: transferAmount } }
    ).exec();
    throw e;
  }

  return transferAmount;
}

module.exports = {
  COIN_BANK_USER_ID,
  transferCoinsFromBank,
};
