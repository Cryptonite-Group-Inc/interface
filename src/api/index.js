import { get } from './api'

export async function getTokenBalances(account) {
  return get(`https://web3api.io/api/v2/addresses/${account}/token-balances/latest`)
}
