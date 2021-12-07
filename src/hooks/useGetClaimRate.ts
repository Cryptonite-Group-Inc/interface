import { useMemo } from 'react'

import { NEVER_RELOAD, useSingleCallResult } from '../state/multicall/hooks'
import { useMishka2Contract } from './useContract'

export function useGetClaimRate(): number {
  const contract = useMishka2Contract()
  const claimRate = useSingleCallResult(contract, 'getClaimRate', undefined, NEVER_RELOAD)
  return useMemo(() => {
    if (claimRate.result) {
      return claimRate.result?.[0]
    }
    return undefined
  }, [claimRate.result])
}
