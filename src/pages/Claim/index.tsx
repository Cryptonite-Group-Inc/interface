import { isAddress } from '@ethersproject/address'
import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useState } from 'react'
import { Text } from 'rebass'
import styled from 'styled-components/macro'

import Circle from '../../assets/images/blue-loader.svg'
import tokenLogo from '../../assets/images/token-logo.png'
import { ButtonPrimary } from '../../components/Button'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import Confetti from '../../components/Confetti'
import { Break, CardSection, DataCard } from '../../components/earn/styled'
import { CardBGImage, CardNoise } from '../../components/earn/styled'
import { RowBetween } from '../../components/Row'
import { MISHKA } from '../../constants/tokens'
import useENS from '../../hooks/useENS'
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
  padding: 60px 0;
`

export default function Claim() {
  const { account, chainId } = useActiveWeb3React()
  const { address: parsedAddress } = useENS(account)

  const mishka = chainId ? MISHKA[chainId] : undefined
  const unclaimedAmount: CurrencyAmount<Currency> | undefined = useCurrencyBalance(parsedAddress ?? undefined, mishka)
  const hasAvailableClaim = !!unclaimedAmount

  // used for UI loading states
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()

  // monitor the status of the claim from contracts and txns
  const claimPending = useIsTransactionPending(hash ?? '')
  const claimConfirmed = hash && !claimPending

  const onClaim = () => {
    setAttempting(true)
  }

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
                <Trans>{unclaimedAmount?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA</Trans>
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
            <ButtonPrimary
              disabled={!isAddress(parsedAddress ?? '') || !hasAvailableClaim}
              padding="16px 16px"
              width="100%"
              $borderRadius="12px"
              mt="1rem"
              onClick={onClaim}
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
          <AutoColumn gap="100px" justify={'center'}>
            <AutoColumn gap="12px" justify={'center'}>
              <TYPE.largeHeader fontWeight={600} color="black">
                {claimConfirmed ? <Trans>Claimed</Trans> : <Trans>Claiming</Trans>}
              </TYPE.largeHeader>
              {!claimConfirmed && (
                <Text fontSize={36} color={'#ff007a'} fontWeight={800}>
                  <Trans>{unclaimedAmount?.toFixed(0, { groupSeparator: ',' } ?? '-') || 0} MISHKA</Trans>
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
