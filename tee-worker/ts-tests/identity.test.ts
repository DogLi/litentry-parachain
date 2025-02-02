import { describeLitentry, generateVerificationMessage } from './utils';
import { hexToU8a, u8aConcat, u8aToHex, u8aToU8a, stringToU8a } from '@polkadot/util';
import { createIdentity, setUserShieldingKey, removeIdentity, verifyIdentity } from './indirect_calls';
import { step } from 'mocha-steps';
import { assert } from 'chai';
import {
    EvmIdentity,
    IdentityGenericEvent,
    LitentryIdentity,
    LitentryValidationData,
    SubstrateIdentity,
    Web2Identity,
} from './type-definitions';
import { ethers } from 'ethers';
import { HexString } from '@polkadot/util/types';
import { KeyringPair } from '@polkadot/keyring/types';

const twitterIdentity = <LitentryIdentity>{
    Web2: <Web2Identity>{
        address: 'mock_user',
        network: 'Twitter',
    },
};

const ethereumIdentity = <LitentryIdentity>{
    Evm: <EvmIdentity>{
        address: '0xff93B45308FD417dF303D6515aB04D9e89a750Ca',
        network: 'Ethereum',
    },
};

const substrateIdentity = <LitentryIdentity>{
    Substrate: <SubstrateIdentity>{
        address: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d', //Alice
        network: 'Litentry',
    },
};

const substrateExtensionIdentity = <LitentryIdentity>{
    Substrate: <SubstrateIdentity>{
        address: '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48', //Bob
        network: 'Litentry',
    },
};

const twitterValidationData = <LitentryValidationData>{
    Web2Validation: {
        Twitter: {
            tweet_id: `0x${Buffer.from('100', 'utf8').toString('hex')}`,
        },
    },
};

const ethereumValidationData = <LitentryValidationData>{
    Web3Validation: {
        Evm: {
            message: `0x${Buffer.from('mock_message', 'utf8').toString('hex')}`,
            signature: {
                Ethereum: '' as HexString,
            },
        },
    },
};
const substrateValidationData = <LitentryValidationData>{
    Web3Validation: {
        Substrate: {
            message: `0x${Buffer.from('mock_message', 'utf8').toString('hex')}`,
            signature: {
                Sr25519: '' as HexString,
            },
        },
    },
};
const substrateExtensionValidationData = <LitentryValidationData>{
    Web3Validation: {
        Substrate: {
            message: `0x${Buffer.from('mock_message', 'utf8').toString('hex')}`,
            signature: {
                Sr25519: '' as HexString,
            },
        },
    },
};
const discordIdentity = <LitentryIdentity>{
    handle: {
        PlainString: `0x${Buffer.from('859641379851337798', 'utf8').toString('hex')}`,
    },
    web_type: {
        Web2Identity: 'Discord',
    },
};

const discordValidationData = <LitentryValidationData>{
    Web2Validation: {
        Discord: {
            channel_id: `0x${Buffer.from('919848392035794945', 'utf8').toString('hex')}`,
            guild_id: `0x${Buffer.from('919848390156767232', 'utf8').toString('hex')}`,
            message_id: `0x${Buffer.from('859641379851337798', 'utf8').toString('hex')}`,
        },
    },
};

describeLitentry('Test Identity', (context) => {
    const aesKey = '0x22fc82db5b606998ad45099b7978b5b4f9dd4ea6017e57370ac56141caaabd12';
    var signature_ethereum;
    var signature_substrate;

    step('set user shielding key', async function () {
        const alice = await setUserShieldingKey(context, context.defaultSigner[0], aesKey, true);
        assert.equal(alice, u8aToHex(context.defaultSigner[0].addressRaw), 'check caller error');

        const bob = await setUserShieldingKey(context, context.defaultSigner[1], aesKey, true);
        assert.equal(bob, u8aToHex(context.defaultSigner[1].addressRaw), 'check caller error');
    });

    step('create identity', async function () {
        //create twitter identity
        const resp_twitter = await createIdentity(context, context.defaultSigner[0], aesKey, true, twitterIdentity);
        assertIdentityCreated(context.defaultSigner[0], resp_twitter);

        if (resp_twitter) {
            console.log('twitterIdentity challengeCode: ', resp_twitter.challengeCode);
            const msg = generateVerificationMessage(
                context,
                hexToU8a(resp_twitter.challengeCode),
                context.defaultSigner[0].addressRaw,
                twitterIdentity
            );
            console.log('post verification msg to twitter: ', msg);
            assert.isNotEmpty(resp_twitter.challengeCode, 'challengeCode empty');
        }
        //create ethereum identity
        const resp_ethereum = await createIdentity(context, context.defaultSigner[0], aesKey, true, ethereumIdentity);
        assertIdentityCreated(context.defaultSigner[0], resp_ethereum);

        if (resp_ethereum) {
            console.log('ethereumIdentity challengeCode: ', resp_ethereum.challengeCode);
            const msg = generateVerificationMessage(
                context,
                hexToU8a(resp_ethereum.challengeCode),
                context.defaultSigner[0].addressRaw,
                ethereumIdentity
            );
            console.log('post verification msg to ethereum: ', msg);
            ethereumValidationData!.Web3Validation!.Evm!.message = msg;
            const msgHash = ethers.utils.arrayify(msg);
            signature_ethereum = await context.ethersWallet.alice.signMessage(msgHash);
            ethereumValidationData!.Web3Validation!.Evm!.signature!.Ethereum = signature_ethereum;
            assert.isNotEmpty(resp_ethereum.challengeCode, 'challengeCode empty');
        }
        // create substrate identity
        const resp_substrate = await createIdentity(context, context.defaultSigner[0], aesKey, true, substrateIdentity);
        assertIdentityCreated(context.defaultSigner[0], resp_substrate);

        if (resp_substrate) {
            console.log('substrateIdentity challengeCode: ', resp_substrate.challengeCode);
            const msg = generateVerificationMessage(
                context,
                hexToU8a(resp_substrate.challengeCode),
                context.defaultSigner[0].addressRaw,
                substrateIdentity
            );

            console.log('post verification msg to substrate: ', msg);
            substrateValidationData!.Web3Validation!.Substrate!.message = msg;
            signature_substrate = context.defaultSigner[0].sign(msg);
            substrateValidationData!.Web3Validation!.Substrate!.signature!.Sr25519 = u8aToHex(signature_substrate);
            assert.isNotEmpty(resp_substrate.challengeCode, 'challengeCode empty');
        }

        // Bob
        // create extension substrate identity
        // https://github.com/litentry/litentry-parachain/issues/1137
        const resp_extension_substrate = await createIdentity(
            context,
            context.defaultSigner[1],
            aesKey,
            true,
            substrateExtensionIdentity
        );
        assertIdentityCreated(context.defaultSigner[1], resp_extension_substrate);
        if (resp_extension_substrate) {
            console.log('substrateExtensionIdentity challengeCode: ', resp_extension_substrate.challengeCode);
            const msg = generateVerificationMessage(
                context,
                hexToU8a(resp_extension_substrate.challengeCode),
                context.defaultSigner[1].addressRaw,
                substrateExtensionIdentity
            );

            console.log('post verification msg to substrate: ', msg);
            substrateExtensionValidationData!.Web3Validation!.Substrate!.message = msg;
            // sign the wrapped version as in polkadot-extension
            signature_substrate = context.defaultSigner[1].sign(
                u8aConcat(stringToU8a('<Bytes>'), u8aToU8a(msg), stringToU8a('</Bytes>'))
            );
            substrateExtensionValidationData!.Web3Validation!.Substrate!.signature!.Sr25519 =
                u8aToHex(signature_substrate);
            assert.isNotEmpty(resp_extension_substrate.challengeCode, 'challengeCode empty');
        }
    });

    step('verify identity', async function () {
        //Alice
        //verify twitter identity
        const twitter_identity_verified = await verifyIdentity(
            context,
            context.defaultSigner[0],
            aesKey,
            true,
            twitterIdentity,
            twitterValidationData
        );
        assertIdentityVerified(context.defaultSigner[0], twitter_identity_verified);

        // verify ethereum identity
        const ethereum_identity_verified = await verifyIdentity(
            context,
            context.defaultSigner[0],
            aesKey,
            true,
            ethereumIdentity,
            ethereumValidationData
        );
        assertIdentityVerified(context.defaultSigner[0], ethereum_identity_verified);

        //verify substrate identity
        const substrate_identity_verified = await verifyIdentity(
            context,
            context.defaultSigner[0],
            aesKey,
            true,
            substrateIdentity,
            substrateValidationData
        );
        assertIdentityVerified(context.defaultSigner[0], substrate_identity_verified);

        //Bob
        //verify extension substrate identity
        const substrate_extension_identity_verified = await verifyIdentity(
            context,
            context.defaultSigner[1],
            aesKey,
            true,
            substrateExtensionIdentity,
            substrateExtensionValidationData
        );
        assertIdentityVerified(context.defaultSigner[1], substrate_extension_identity_verified);
    });

    step('remove identity', async function () {
        // Alice
        // remove twitter identity
        const twitter_identity_removed = await removeIdentity(
            context,
            context.defaultSigner[0],
            aesKey,
            true,
            twitterIdentity
        );
        assertIdentityRemoved(context.defaultSigner[0], twitter_identity_removed);

        // remove ethereum identity
        const ethereum_identity_removed = await removeIdentity(
            context,
            context.defaultSigner[0],
            aesKey,
            true,
            ethereumIdentity
        );
        assertIdentityRemoved(context.defaultSigner[0], ethereum_identity_removed);

        // remove substrate identity
        const substrate_identity_removed = await removeIdentity(
            context,
            context.defaultSigner[0],
            aesKey,
            true,
            substrateIdentity
        );
        assertIdentityRemoved(context.defaultSigner[0], substrate_identity_removed);

        // Bob
        // remove substrate identity again
        const substrate_extension_identity_removed = await removeIdentity(
            context,
            context.defaultSigner[1],
            aesKey,
            true,
            substrateExtensionIdentity
        );
        assertIdentityRemoved(context.defaultSigner[1], substrate_extension_identity_removed);
    });
});

function assertIdentityCreated(signer: KeyringPair, identityEvent: IdentityGenericEvent | undefined) {
    let idGraphExist = false;
    if (identityEvent) {
        for (let i = 0; i < identityEvent.idGraph.length; i++) {
            if (JSON.stringify(identityEvent.idGraph[i][0]) == JSON.stringify(identityEvent.identity)) {
                idGraphExist = true;
                assert.isFalse(identityEvent.idGraph[i][1].is_verified, 'identity should not be verified');
            }
        }
    }
    assert.isTrue(idGraphExist, 'id_graph should exist');
    assert.equal(identityEvent?.who, u8aToHex(signer.addressRaw), 'check caller error');
}

function assertIdentityVerified(signer: KeyringPair, identityEvent: IdentityGenericEvent | undefined) {
    let idGraphExist = false;

    if (identityEvent) {
        for (let i = 0; i < identityEvent.idGraph.length; i++) {
            if (JSON.stringify(identityEvent.idGraph[i][0]) == JSON.stringify(identityEvent.identity)) {
                idGraphExist = true;
                assert.isTrue(identityEvent.idGraph[i][1].is_verified, 'identity should be verified');
            }
        }
    }
    assert.isTrue(idGraphExist, 'id_graph should exist');
    assert.equal(identityEvent?.who, u8aToHex(signer.addressRaw), 'check caller error');
}

function assertIdentityRemoved(signer: KeyringPair, identityEvent: IdentityGenericEvent | undefined) {
    let idGraphExist = false;
    if (identityEvent) {
        for (let i = 0; i < identityEvent.idGraph.length; i++) {
            if (JSON.stringify(identityEvent.idGraph[i][0]) == JSON.stringify(identityEvent.identity)) {
                idGraphExist = true;
            }
        }
    }
    assert.isFalse(idGraphExist, 'id_graph should be empty');
    assert.equal(identityEvent?.who, u8aToHex(signer.addressRaw), 'check caller error');
}
