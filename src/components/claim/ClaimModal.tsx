import { JSBI, TokenAmount } from '@uniswap/sdk'
import { isAddress } from 'ethers/lib/utils'
import React, { useEffect, useState } from 'react'
import { Text } from 'rebass'
import styled from 'styled-components'
import Circle from '../../assets/images/blue-loader.svg'
import tokenLogo from '../../assets/images/token-logo.png'
import { useActiveWeb3React } from '../../hooks'
import { ApplicationModal } from '../../state/application/actions'
import { useModalOpen, useToggleSelfClaimModal } from '../../state/application/hooks'
import { useClaimCallback, useUserClaimData, useUserUnclaimedAmount } from '../../state/claim/hooks'
import { useUserHasSubmittedClaim } from '../../state/transactions/hooks'
import { CloseIcon, CustomLightSpinner, ExternalLink, TYPE, UniTokenAnimated } from '../../theme'
import { getEtherscanLink } from '../../utils'
import { ButtonPrimary } from '../Button'
import { AutoColumn, ColumnCenter } from '../Column'
import { useLoading } from '../../state/application/hooks'
import Confetti from '../Confetti'
import { Break, CardBGImage, CardBGImageSmaller, CardNoise, CardSection, DataCard } from '../earn/styled'
import AddressClaimModal from '../../components/claim/AddressClaimModal'
import Modal from '../Modal'
import { RowBetween } from '../Row'

const LoadingWrap = styled.div`
  margin: 0 auto;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`

const LoadText = styled.div`
  font-size: 24px;
  margin-bottom: 25px;
`

const TipText = styled.div``

const Disclaimer = styled.div`
  margin-top: 40px;
  margin-bottom: 20px;
`

const TipWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

const Input = styled.input`
  margin-top: 10px;
  padding: 5px;
  font-size: 14px;
  width: 90px;
`

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
`

const Center = styled.div`
  display: grid;
  justify-content: center;
`

const ModalUpper = styled(DataCard)`
  background: #fff;
`

const ConfirmOrLoadingWrapper = styled.div<{ activeBG: boolean }>`
  width: 100%;
  padding: 24px;
  position: relative;
  background: #fff;
`

const ConfirmedIcon = styled(ColumnCenter)`
  padding: 60px 0;
`

const SOCKS_AMOUNT = 1000
const USER_AMOUNT = 400

export default function ClaimModal() {
  const isOpen = true
  const toggleClaimModal = useToggleSelfClaimModal()

  const { account, chainId } = useActiveWeb3React()
  // const account = '0xb8CcA5D23DC16aD9e56E3426783912F7CF90234c'

  // used for UI loading states
  const [attempting, setAttempting] = useState<boolean>(false)
  const [tipAmount, setTipAmount] = useState(0)

  // get user claim data
  const userClaimData = useUserClaimData(account)

  // monitor the status of the claim from contracts and txns
  const { claimCallback } = useClaimCallback(account, tipAmount)
  const unclaimedAmount: TokenAmount | undefined = useUserUnclaimedAmount(account)
  const { claimSubmitted, claimTxn } = useUserHasSubmittedClaim(account ?? undefined)
  const claimConfirmed = Boolean(claimTxn?.receipt)

  function onClaim() {
    setAttempting(true)
    claimCallback()
      // reset modal and log error
      .catch(error => {
        setAttempting(false)
        console.log(error)
      })
  }

  // once confirmed txn is found, if modal is closed open, mark as not attempting regradless
  useEffect(() => {
    if (claimConfirmed && claimSubmitted && attempting) {
      setAttempting(false)
      if (!isOpen) {
        toggleClaimModal()
      }
    }
  }, [attempting, claimConfirmed, claimSubmitted, isOpen, toggleClaimModal])

  const nonLPAmount = JSBI.multiply(
    JSBI.BigInt((userClaimData?.flags?.isSOCKS ? SOCKS_AMOUNT : 0) + (userClaimData?.flags?.isUser ? USER_AMOUNT : 0)),
    JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18))
  )

  const unclaimedString = unclaimedAmount && unclaimedAmount.toFixed(0)
  const noClaim = !unclaimedAmount || unclaimedString === '0'

  const setTip = evt => {
    const tipPercentage = evt.target.value
    if (tipPercentage > 100) {
      setTipAmount(100)
    } else if (tipPercentage < 0) {
      setTipAmount(0)
    } else if (!tipPercentage) {
      setTipAmount('')
    } else {
      setTipAmount(parseInt(tipPercentage, 10))
    }
  }

  const tip = (
    <TipWrap>
      <TipText>Tip developers:</TipText> {tipAmount.toString()}%
      <input type="range" min="0" max="100" value={tipAmount} onChange={setTip} />
      <Disclaimer>
        The return of funds to you was made possible by a team of volunteers who worked for free to make this happen.
        Please consider tipping them a portion of your recovered funds as a way to say thank you.
      </Disclaimer>
    </TipWrap>
  )

  let content
  const loading = useLoading()
  if (loading) {
    content = (
      <Modal isOpen={loading}>
        <LoadingWrap>
          <LoadText>Looking for DAI</LoadText>
          <CustomLightSpinner src={Circle} alt="" size={'90px'} />
        </LoadingWrap>
      </Modal>
    )
  } else if (noClaim) {
    content = <AddressClaimModal />
  } else {
    content = (
      <Modal isOpen={isOpen} onDismiss={() => {}} maxHeight={90}>
        <Confetti start={Boolean(isOpen && claimConfirmed)} />
        {!attempting && !claimConfirmed && (
          <ContentWrapper gap="lg">
            <ModalUpper>
              <CardSection gap="md">
                <RowBetween>
                  <TYPE.black fontWeight={500}>Claim DAI from Eminence</TYPE.black>
                </RowBetween>
                <Center>
                  <TYPE.black fontWeight={700} fontSize={36}>
                    {unclaimedAmount?.toFixed(0, { groupSeparator: ',' } ?? '-')} DAI
                  </TYPE.black>
                </Center>
              </CardSection>
            </ModalUpper>
            <AutoColumn gap="md" style={{ padding: '1rem', paddingTop: '0' }} justify="center">
              <ButtonPrimary
                disabled={!isAddress(account ?? '')}
                padding="16px 16px"
                width="100%"
                borderRadius="12px"
                mt="1rem"
                onClick={onClaim}
              >
                Claim DAI
              </ButtonPrimary>
            </AutoColumn>
          </ContentWrapper>
        )}
        {(attempting || claimConfirmed) && (
          <ConfirmOrLoadingWrapper activeBG={true}>
            <RowBetween>
              <div />
            </RowBetween>
            <ConfirmedIcon>
              {!claimConfirmed ? (
                <CustomLightSpinner src={Circle} alt="loader" size={'90px'} />
              ) : (
                <UniTokenAnimated width="72px" src={tokenLogo} />
              )}
            </ConfirmedIcon>
            <AutoColumn gap="100px" justify={'center'}>
              <AutoColumn gap="12px" justify={'center'}>
                <TYPE.largeHeader fontWeight={600} color="black">
                  {claimConfirmed ? 'Claimed!' : 'Claiming'}
                </TYPE.largeHeader>
                {!claimConfirmed && (
                  <Text fontSize={36} color={'#000'} fontWeight={800}>
                    {unclaimedAmount?.toFixed(0, { groupSeparator: ',' } ?? '-')} DAI
                  </Text>
                )}
              </AutoColumn>
              {claimConfirmed && (
                <>
                  <TYPE.subHeader fontWeight={500} color="black">
                    <span role="img" aria-label="party-hat">
                      🎉{' '}
                    </span>
                    Welcome to team half rekt :){' '}
                    <span role="img" aria-label="party-hat">
                      🎉
                    </span>
                  </TYPE.subHeader>
                </>
              )}
              {attempting && !claimSubmitted && (
                <TYPE.subHeader color="black">Confirm this transaction in your wallet</TYPE.subHeader>
              )}
              {attempting && claimSubmitted && !claimConfirmed && chainId && claimTxn?.hash && (
                <ExternalLink href={getEtherscanLink(chainId, claimTxn?.hash, 'transaction')} style={{ zIndex: 99 }}>
                  View transaction on Etherscan
                </ExternalLink>
              )}
            </AutoColumn>
          </ConfirmOrLoadingWrapper>
        )}
        {tip}
      </Modal>
    )
  }
  return content
}
