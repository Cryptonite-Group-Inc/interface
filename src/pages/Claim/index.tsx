import { isAddress } from '@ethersproject/address'
import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { MouseoverTooltip } from 'components/Tooltip'
import { useContext, useEffect, useMemo, useState } from 'react'
import { CheckCircle, HelpCircle } from 'react-feather'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components/macro'

import Circle from '../../assets/images/blue-loader.svg'
import tokenLogo from '../../assets/images/token-logo.png'
import { ButtonPrimary } from '../../components/Button'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import Confetti from '../../components/Confetti'
import { Break, CardSection, DataCard } from '../../components/earn/styled'
import { CardBGImage, CardNoise } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { RowBetween } from '../../components/Row'
import { MISHKA, MISHKA2 } from '../../constants/tokens'
import { ApprovalState } from '../../hooks/useApproveCallback'
import { useMishka2Contract, useMishkaContract } from '../../hooks/useContract'
import useENS from '../../hooks/useENS'
import { useTokenAllowance } from '../../hooks/useTokenAllowance'
import { useActiveWeb3React } from '../../hooks/web3'
import { useIsTransactionPending } from '../../state/transactions/hooks'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { CustomLightSpinner, ExternalLink, TYPE, UniTokenAnimated } from '../../theme'
import { shortenAddress } from '../../utils'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import AppBody from '../AppBody'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
`

const ModalUpper = styled(DataCard)`
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #ff007a 0%, #021d43 100%);
`

const ConfirmOrLoadingWrapper = styled.div<{ activeBG: boolean }>`
  width: 100%;
  padding: 24px;
  border-radius: 22px;
  position: relative;
  background: ${({ activeBG }) =>
    activeBG &&
    'radial-gradient(76.02% 75.41% at 1.84% 0%, rgba(255, 0, 122, 0.2) 0%, rgba(33, 114, 229, 0.2) 100%), #FFFFFF;'};
`

const ConfirmedIcon = styled(ColumnCenter)`
  padding: 30px 0;
`

export default function Claim() {
  const theme = useContext(ThemeContext)
  const { account, chainId } = useActiveWeb3React()
  const { address: parsedAddress } = useENS(account)

  const mishka: Token | undefined = chainId ? MISHKA[chainId] : undefined
  const mishka2: Token | undefined = chainId ? MISHKA2[chainId] : undefined
  const mishkaBalance: CurrencyAmount<Currency> | undefined = useCurrencyBalance(parsedAddress ?? undefined, mishka)
  const unclaimedAmount = Number(mishkaBalance?.toFixed(0))
  const claimableAmount = (unclaimedAmount * 1000000000).toString() // make as string to solve big number issue
  const hasAvailableClaim: boolean = unclaimedAmount > 0

  // used for UI loading states
  const [pendingApproval, setPendingApproval] = useState<boolean>(false)
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
  const [attempting, setAttempting] = useState<boolean>(false)

  const [hash, setHash] = useState<string | undefined>()

  const claimPending = useIsTransactionPending(hash ?? '')
  const claimConfirmed = hash && !claimPending

  const mishkaContract = useMishkaContract()
  const mishka2Contract = useMishka2Contract()
  const spender: string | undefined = mishka2Contract?.address
  const currentAllowance = useTokenAllowance(mishka, parsedAddress ?? undefined, spender)
  // const pendingApproval = useHasPendingApproval(mishka?.address, spender)

  // check the current approval status
  const approvalState: ApprovalState = useMemo(() => {
    if (!currentAllowance) return ApprovalState.UNKNOWN

    return currentAllowance.lessThan(claimableAmount)
      ? pendingApproval
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [currentAllowance, pendingApproval, claimableAmount])

  const showApproveFlow =
    approvalState === ApprovalState.NOT_APPROVED ||
    approvalState === ApprovalState.PENDING ||
    (approvalSubmitted && approvalState === ApprovalState.APPROVED)

  const handleApprove = async () => {
    if (mishkaContract) {
      setPendingApproval(true)
      await mishkaContract
        .approve(mishka2Contract?.address, claimableAmount)
        .then((response: any) => {
          console.log('approve response ', response)
        })
        .catch((error: any) => {
          setPendingApproval(false)
          console.log(error)
        })
    }
  }

  const handleClaim = async () => {
    if (mishka2Contract) {
      setAttempting(true)
      await mishka2Contract
        .claimV2(claimableAmount)
        .then((response: any) => {
          console.log('claim response ', response)
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(error)
        })
    }
  }

  const handleClose = () => {
    setAttempting(false)
    setHash('')
    setApprovalSubmitted(false)
  }

  useEffect(() => {
    if (approvalState === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
    if (approvalState === ApprovalState.APPROVED) {
      setPendingApproval(false)
    }
  }, [approvalState, approvalSubmitted, pendingApproval])

  return (
    <AppBody>
      <Confetti start={Boolean(claimConfirmed && attempting)} />
      {!attempting && (
        <ContentWrapper gap="lg">
          <ModalUpper>
            <CardBGImage />
            <CardNoise />
            <CardSection gap="md">
              <RowBetween>
                <TYPE.white fontWeight={500}>
                  <Trans>Claim MISHKA Token</Trans>
                </TYPE.white>
              </RowBetween>
              <TYPE.white fontWeight={700} fontSize={36}>
                <Trans>{mishkaBalance?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA</Trans>
              </TYPE.white>
            </CardSection>
            <Break />
          </ModalUpper>
          <AutoColumn gap="md" style={{ padding: '1rem', paddingTop: '0' }} justify="center">
            {parsedAddress && !hasAvailableClaim && (
              <TYPE.error error={true}>
                <Trans>Account has no available claim</Trans>
              </TYPE.error>
            )}
            {showApproveFlow && (
              <ButtonPrimary
                disabled={approvalState === ApprovalState.APPROVED}
                padding="16px 16px"
                width="100%"
                $borderRadius="12px"
                mt="1rem"
                onClick={handleApprove}
              >
                <Trans>{approvalState === ApprovalState.APPROVED ? 'You can now claim MISHKA' : 'Approve'}</Trans>
                {approvalState === ApprovalState.PENDING ? (
                  <Loader stroke="white" style={{ position: 'absolute', right: '20px' }} />
                ) : approvalSubmitted && approvalState === ApprovalState.APPROVED ? (
                  <CheckCircle size="20" color={theme.green1} style={{ position: 'absolute', right: '20px' }} />
                ) : (
                  <div style={{ position: 'absolute', right: '20px' }}>
                    <MouseoverTooltip
                      text={
                        <Trans>
                          You must give the Mishka smart contracts permission to use your {mishka2?.symbol}. You only
                          have to do this once per token.
                        </Trans>
                      }
                    >
                      <HelpCircle size="20" color={'white'} style={{ marginLeft: '8px' }} />
                    </MouseoverTooltip>
                  </div>
                )}
              </ButtonPrimary>
            )}
            <ButtonPrimary
              disabled={
                !isAddress(parsedAddress ?? '') || !hasAvailableClaim || approvalState !== ApprovalState.APPROVED
              }
              padding="16px 16px"
              width="100%"
              $borderRadius="12px"
              mt="1rem"
              onClick={handleClaim}
            >
              <Trans>Claim MISHKA</Trans>
            </ButtonPrimary>
          </AutoColumn>
        </ContentWrapper>
      )}
      {(attempting || claimConfirmed) && (
        <ConfirmOrLoadingWrapper activeBG={true}>
          <CardNoise />
          <ConfirmedIcon>
            {!claimConfirmed ? (
              <CustomLightSpinner src={Circle} alt="loader" size={'90px'} />
            ) : (
              <UniTokenAnimated width="72px" src={tokenLogo} alt="MISHKA logo" />
            )}
          </ConfirmedIcon>
          <AutoColumn gap="40px" justify={'center'}>
            <AutoColumn gap="12px" justify={'center'}>
              <TYPE.largeHeader fontWeight={600} color="black">
                {claimConfirmed ? <Trans>Claimed</Trans> : <Trans>Claiming</Trans>}
              </TYPE.largeHeader>
              {!claimConfirmed && (
                <Text fontSize={36} color={'#ff007a'} fontWeight={800}>
                  <Trans>{mishkaBalance?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA</Trans>
                </Text>
              )}
              {parsedAddress && (
                <TYPE.largeHeader fontWeight={600} color="black">
                  <Trans>for {shortenAddress(parsedAddress)}</Trans>
                </TYPE.largeHeader>
              )}
            </AutoColumn>
            {claimConfirmed && (
              <>
                <ButtonPrimary padding="16px 16px" width="100%" $borderRadius="12px" mt="1rem" onClick={handleClose}>
                  <Trans>Close</Trans>
                </ButtonPrimary>
                <TYPE.subHeader fontWeight={500} color="black">
                  <span role="img" aria-label="party-hat">
                    🎉{' '}
                  </span>
                  <Trans>Welcome to team Mishka :) </Trans>
                  <span role="img" aria-label="party-hat">
                    🎉
                  </span>
                </TYPE.subHeader>
              </>
            )}
            {attempting && !hash && (
              <TYPE.subHeader color="black">
                <Trans>Confirm this transaction in your wallet</Trans>
              </TYPE.subHeader>
            )}
            {attempting && hash && !claimConfirmed && chainId && hash && (
              <ExternalLink href={getExplorerLink(chainId, hash, ExplorerDataType.TRANSACTION)} style={{ zIndex: 99 }}>
                <Trans>View transaction on Explorer</Trans>
              </ExternalLink>
            )}
          </AutoColumn>
        </ConfirmOrLoadingWrapper>
      )}
    </AppBody>
  )
}
