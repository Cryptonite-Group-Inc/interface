import { isAddress } from '@ethersproject/address'
import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { MouseoverTooltip } from 'components/Tooltip'
import { useContext, useEffect, useMemo, useState } from 'react'
import { CheckCircle, HelpCircle } from 'react-feather'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components/macro'

import Circle from '../../assets/images/blue-loader.svg'
import MetaMaskLogo from '../../assets/images/metamask.png'
import TelegramLogo from '../../assets/images/telegram-white.png'
import TokenLogo from '../../assets/images/token-logo.png'
import TwitterLogo from '../../assets/images/twitter-white.png'
import { ButtonPrimary, ButtonSecondary } from '../../components/Button'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import Confetti from '../../components/Confetti'
import { Break, CardSection, DataCard } from '../../components/earn/styled'
import { CardBGImage, CardNoise } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { RowBetween, RowFixed } from '../../components/Row'
import { MISHKA, MISHKA2 } from '../../constants/tokens'
import useAddTokenToMetamask from '../../hooks/useAddTokenToMetamask'
import { ApprovalState } from '../../hooks/useApproveCallback'
import { useMishka2Contract, useMishkaContract } from '../../hooks/useContract'
import useENS from '../../hooks/useENS'
import { useGetClaimRate } from '../../hooks/useGetClaimRate'
import { useTokenAllowance } from '../../hooks/useTokenAllowance'
import { useActiveWeb3React } from '../../hooks/web3'
import { TransactionType } from '../../state/transactions/actions'
import { useIsTransactionPending, useTransactionAdder } from '../../state/transactions/hooks'
import { useCurrencyBalance } from '../../state/wallet/hooks'
import { CustomLightSpinner, ExternalLink, TYPE, UniTokenAnimated } from '../../theme'
import { shortenAddress } from '../../utils'
import { ExplorerDataType, getExplorerLink } from '../../utils/getExplorerLink'
import AppBody from '../AppBody'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
`

const ExtraWrapper = styled.div<{ maxWidth?: string }>`
  max-width: ${({ maxWidth }) => maxWidth ?? '480px'};
  width: 100%;
  padding: 16px 27px;
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
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
  padding: 0 0 30px;
`

const StyledLogo = styled.img`
  height: 16px;
  width: 16px;
  margin-left: 6px;
  margin-right: 6px;
`

export default function Claim() {
  const theme = useContext(ThemeContext)
  const { account, chainId, library } = useActiveWeb3React()
  const { address: parsedAddress } = useENS(account)

  const claimRate = useGetClaimRate()
  const additionalPercent = (claimRate - 1000) / 10

  const mishka: Token | undefined = chainId ? MISHKA[chainId] : undefined
  const mishka2: Token | undefined = chainId ? MISHKA2[chainId] : undefined
  const amountV1: CurrencyAmount<Currency> | undefined = useCurrencyBalance(parsedAddress ?? undefined, mishka)
  const amountV2: CurrencyAmount<Currency> | undefined = claimRate
    ? amountV1?.divide(1e6).multiply(claimRate.toString())
    : undefined
  const unclaimedAmount = Number(amountV1?.toFixed(0))
  const claimableAmount = (unclaimedAmount * 1e9).toString() // make as string to solve big number issue
  const hasAvailableClaim: boolean = unclaimedAmount > 0
  const [receivedAmount, setReceivedAmount] = useState<string>('')

  // used for UI loading states
  const [pendingApproval, setPendingApproval] = useState<boolean>(false)
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
  const [attempting, setAttempting] = useState<boolean>(false)
  const addTransaction = useTransactionAdder()
  const [hash, setHash] = useState<string | undefined>()

  const claimPending = useIsTransactionPending(hash ?? '')
  const claimConfirmed = hash && !claimPending

  const mishkaContract = useMishkaContract()
  const mishka2Contract = useMishka2Contract()
  const spender: string | undefined = mishka2Contract?.address
  const currentAllowance = useTokenAllowance(mishka, parsedAddress ?? undefined, spender)
  const { addToken, success } = useAddTokenToMetamask(mishka2)

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
        .then()
        .catch((error: any) => {
          setPendingApproval(false)
          console.log(error)
        })
    }
  }

  const handleClaim = async () => {
    if (mishka2Contract && account) {
      setAttempting(true)
      await mishka2Contract
        .claimV2(claimableAmount)
        .then((response: any) => {
          addTransaction(response, {
            type: TransactionType.CLAIM,
            recipient: account,
          })
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

    if (claimConfirmed) {
      library?.getTransactionReceipt(hash ?? '').then((receipt) => {
        const amount = receipt.logs.find((log) => log.address === mishka2?.address)?.data
        if (amount && mishka2) {
          const value = parseInt(amount, 16) / 1e18
          const formatedValue = value
            .toFixed(0)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          setReceivedAmount(formatedValue)
        }
      })
    }
  }, [approvalState, approvalSubmitted, claimConfirmed, hash, library, mishka2, mishka2?.address, pendingApproval])

  return (
    <>
      <AppBody>
        <Confetti start={Boolean(claimConfirmed && attempting)} />
        {!attempting && (
          <ContentWrapper gap="lg">
            <ModalUpper>
              <CardBGImage />
              <CardNoise />
              <CardSection gap="md">
                <RowBetween>
                  <TYPE.largeHeader>
                    <Trans>Claim MISHKA Token</Trans>
                  </TYPE.largeHeader>
                </RowBetween>
                {parsedAddress && hasAvailableClaim && (
                  <>
                    <RowBetween>
                      <TYPE.white fontWeight={500}>
                        <Trans>
                          You have {amountV1?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA v1 Tokens.
                          {additionalPercent > 0 ? `With a ${additionalPercent}% Claim Bonus, you` : 'You'} will receive
                          this many MISHKA v2 tokens:
                        </Trans>
                      </TYPE.white>
                    </RowBetween>
                  </>
                )}
                <TYPE.white fontWeight={700} fontSize={36}>
                  <Trans>{amountV2?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA</Trans>
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
                  <Trans>
                    {approvalState === ApprovalState.APPROVED ? 'You can now claim MISHKA' : 'Approve MISHKA V1'}
                  </Trans>
                  {approvalState === ApprovalState.PENDING ? (
                    <Loader stroke="white" style={{ position: 'absolute', right: '20px' }} />
                  ) : approvalSubmitted && approvalState === ApprovalState.APPROVED ? (
                    <CheckCircle size="20" color={theme.green1} style={{ position: 'absolute', right: '20px' }} />
                  ) : (
                    <div style={{ position: 'absolute', right: '20px' }}>
                      <MouseoverTooltip
                        text={
                          <Trans>
                            You must give the Mishka smart contracts permission to use your MISHKA. You only have to do
                            this once per token.
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
                <Trans>Claim MISHKA V2</Trans>
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
                <>
                  <TYPE.largeHeader fontSize={16} color="black">
                    <Trans>Congratulations! You received:</Trans>
                  </TYPE.largeHeader>
                  <UniTokenAnimated width="72px" src={TokenLogo} alt="MISHKA logo" />
                </>
              )}
            </ConfirmedIcon>
            <AutoColumn gap="20px" justify={'center'}>
              <AutoColumn gap="12px" justify={'center'}>
                <TYPE.largeHeader color="black">
                  {claimConfirmed ? <Trans>{receivedAmount} MISHKA</Trans> : <Trans>Claiming</Trans>}
                </TYPE.largeHeader>
                {!claimConfirmed && (
                  <Text fontSize={36} color={'#ff007a'} fontWeight={800}>
                    <Trans>{amountV2?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA</Trans>
                  </Text>
                )}
                {parsedAddress && (
                  <TYPE.subHeader color="black">
                    <Trans>To address {shortenAddress(parsedAddress)}</Trans>
                  </TYPE.subHeader>
                )}
              </AutoColumn>
              {claimConfirmed && (
                <>
                  <ButtonSecondary onClick={addToken}>
                    {!success ? (
                      <RowFixed>
                        <Trans>
                          Add MISHKA to <StyledLogo src={MetaMaskLogo} /> MetaMask
                        </Trans>
                      </RowFixed>
                    ) : (
                      <RowFixed>
                        <Trans>Added MISHKA</Trans>
                        <CheckCircle size={'16px'} stroke={theme.green1} style={{ marginLeft: '6px' }} />
                      </RowFixed>
                    )}
                  </ButtonSecondary>
                  <ButtonPrimary padding="16px 16px" width="100%" $borderRadius="12px" onClick={handleClose}>
                    <Trans>Close</Trans>
                  </ButtonPrimary>
                </>
              )}
              {attempting && !hash && (
                <TYPE.subHeader color="black">
                  <Trans>Confirm this transaction in your wallet</Trans>
                </TYPE.subHeader>
              )}
              {attempting && hash && !claimConfirmed && chainId && hash && (
                <ExternalLink
                  href={getExplorerLink(chainId, hash, ExplorerDataType.TRANSACTION)}
                  style={{ zIndex: 99 }}
                >
                  <Trans>View transaction on Explorer</Trans>
                </ExternalLink>
              )}
            </AutoColumn>
          </ConfirmOrLoadingWrapper>
        )}
      </AppBody>
      <ExtraWrapper>
        <RowBetween>
          <TYPE.italic fontWeight={500} style={{ fontFamily: 'system-ui' }}>
            <Trans>
              Note: MISHKA V1 has 1 Trillion total supply. MISHKA V2 will be 1 Billion total supply across all chains.
              For example, if you have 1,000,000 V1 tokens, you will receive 1,000 V2 tokens.
            </Trans>
          </TYPE.italic>
        </RowBetween>
        {claimConfirmed && (
          <AutoColumn gap="12px" justify={'center'} style={{ marginTop: '50px' }}>
            <TYPE.largeHeader fontSize={16}>
              <Trans>Follow Mishka Token:</Trans>
            </TYPE.largeHeader>
            <ExternalLink href="https://telegram.org/" style={{ width: '100%', textDecoration: 'none' }}>
              <ButtonPrimary padding="16px 16px" width="100%" $borderRadius="12px" mt="1rem">
                <Trans>
                  <StyledLogo src={TelegramLogo} /> Telegram
                </Trans>
              </ButtonPrimary>
            </ExternalLink>
            <ExternalLink href="https://twitter.com/" style={{ width: '100%', textDecoration: 'none' }}>
              <ButtonPrimary padding="16px 16px" width="100%" $borderRadius="12px" mt="1rem">
                <Trans>
                  <StyledLogo src={TwitterLogo} /> Twitter
                </Trans>
              </ButtonPrimary>
            </ExternalLink>
            <ExternalLink href="https://mishkatoken.com/" style={{ width: '100%', textDecoration: 'none' }}>
              <ButtonPrimary padding="16px 16px" width="100%" $borderRadius="12px" mt="1rem">
                <Trans>www.MishkaToken.com</Trans>
              </ButtonPrimary>
            </ExternalLink>
          </AutoColumn>
        )}
      </ExtraWrapper>
    </>
  )
}
