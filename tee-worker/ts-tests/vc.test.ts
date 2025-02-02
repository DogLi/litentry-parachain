import { describeLitentry } from './utils';
import { step } from 'mocha-steps';
import { requestVC, setUserShieldingKey, disableVC, revokeVC } from './indirect_calls';
import { Assertion } from './type-definitions';
import { assert } from 'chai';
import { u8aToHex } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';

const assertion = <Assertion>{
    A1: 'A1',
    A2: ['A2',],
    A3: ['A3', 'A3', 'A3'],
    A4: [10],
    A7: [10],
    A8: 'A8',
    A10: [10],
    A11: [10],
};
describeLitentry('VC test', async (context) => {
    const aesKey = '0x22fc82db5b606998ad45099b7978b5b4f9dd4ea6017e57370ac56141caaabd12';
    var indexList: HexString[] = [];
    step('set user shielding key', async function () {
        const who = await setUserShieldingKey(context, context.defaultSigner[0], aesKey, true);
        assert.equal(who, u8aToHex(context.defaultSigner[0].addressRaw), 'check caller error');
    });
    step('Request VC', async () => {
        for (const key in assertion) {
            const eventData = await requestVC(context, context.defaultSigner[0], aesKey, true, context.shard, {
                [key]: assertion[key as keyof Assertion],
            });
            assert(eventData![0] == u8aToHex(context.defaultSigner[0].addressRaw) && eventData![1] && eventData![2]);
            indexList.push(eventData![1]);
            const registry = (await context.substrate.query.vcManagement.vcRegistry(eventData![1])) as any;
            assert.equal(registry.toHuman()!['status'], 'Active');
        }
    });

    step('Disable VC', async () => {
        for (const index of indexList) {
            const eventIndex = await disableVC(context, context.defaultSigner[0], aesKey, true, index);
            assert.equal(eventIndex, index, 'check index error');
            const registry = (await context.substrate.query.vcManagement.vcRegistry(index)) as any;
            assert.equal(registry.toHuman()!['status'], 'Disabled');
        }
    });

    step('Revoke VC', async () => {
        for (const index of indexList) {
            const eventIndex = await revokeVC(context, context.defaultSigner[0], aesKey, true, index);
            assert.equal(eventIndex, index, 'check index error');
            const registry = (await context.substrate.query.vcManagement.vcRegistry(index)) as any;
            assert.equal(registry.toHuman(), null);
        }
    });
});
