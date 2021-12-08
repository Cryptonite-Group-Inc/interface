import { useMemo } from 'react'

import { useSingleCallResult } from '../state/multicall/hooks'
import { useMishka2Contract } from './useContract'

export function useGetClaimRate(): number {
  const contract = useMishka2Contract()
  const claimRate = useSingleCallResult(contract, 'getClaimRate')
  return useMemo(() => {
    if (claimRate.result) {
      return claimRate.result?.[0]
    }
    return undefined
  }, [claimRate.result])
}
