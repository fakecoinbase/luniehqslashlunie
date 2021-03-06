const terraV3Reducers = require('./terraV3-reducers')

function blockReducer(networkId, block, transactions, data = {}) {
  return {
    id: block.block_id.hash,
    networkId,
    height: block.block.header.height,
    chainId: block.block.header.chain_id,
    hash: block.block_id.hash,
    time: block.block.header.time,
    transactions,
    proposer_address: block.block.header.proposer_address,
    data: JSON.stringify(data)
  }
}

function setTransactionSuccess(transaction) {
  return transaction.code ? false : true
}

function delegationReducer(delegation, validator, network) {
  const coinLookup = network.getCoinLookup(network, delegation.balance.denom)
  const delegationCoin = terraV3Reducers.coinReducer(
    delegation.balance,
    coinLookup
  )
  return {
    id: delegation.validator_address,
    validatorAddress: delegation.validator_address,
    delegatorAddress: delegation.delegator_address,
    validator,
    amount: delegationCoin.amount
  }
}

module.exports = {
  ...terraV3Reducers,
  blockReducer,
  delegationReducer,
  setTransactionSuccess
}
