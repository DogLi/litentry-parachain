/*
	Copyright 2021 Integritee AG and Supercomputing Systems AG

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.

*/

use codec::{Decode, Encode};
use frame_metadata::{
	v14::{ExtrinsicMetadata, PalletEventMetadata, PalletMetadata, RuntimeMetadataV14},
	RuntimeMetadataPrefixed,
};
use itc_parentchain_test::{
	parentchain_block_builder::ParentchainBlockBuilder,
	parentchain_header_builder::ParentchainHeaderBuilder,
};
use itp_node_api::api_client::{ApiResult, ChainApi, StorageProof};
use itp_types::{Header, SignedBlock, H256};
use scale_info::{meta_type, TypeInfo};
use sp_finality_grandpa::AuthorityList;
use std::convert::TryFrom;
use substrate_api_client::{Events, Metadata};

pub struct ParentchainApiMock {
	parentchain: Vec<SignedBlock>,
}

impl ParentchainApiMock {
	pub(crate) fn new() -> Self {
		ParentchainApiMock { parentchain: Vec::new() }
	}

	/// Initializes parentchain with a default block chain of a given length.
	pub fn with_default_blocks(mut self, number_of_blocks: u32) -> Self {
		self.parentchain = (1..=number_of_blocks)
			.map(|n| {
				let header = ParentchainHeaderBuilder::default().with_number(n).build();
				ParentchainBlockBuilder::default().with_header(header).build_signed()
			})
			.collect();
		self
	}
}

// Build fake metadata consisting of a single pallet that knows
/// about the event type provided.
fn metadata<E: TypeInfo + 'static>() -> Metadata {
	let pallets = vec![PalletMetadata {
		name: "Test",
		storage: None,
		calls: None,
		event: Some(PalletEventMetadata { ty: meta_type::<E>() }),
		constants: vec![],
		error: None,
		index: 0,
	}];

	let extrinsic =
		ExtrinsicMetadata { ty: meta_type::<()>(), version: 0, signed_extensions: vec![] };

	let v14 = RuntimeMetadataV14::new(pallets, extrinsic, meta_type::<()>());
	let runtime_metadata: RuntimeMetadataPrefixed = v14.into();

	Metadata::try_from(runtime_metadata).unwrap()
}

#[derive(Clone, Copy, Debug, PartialEq, Decode, Encode, TypeInfo)]
enum Event {
	A(u8),
	B(bool),
}

impl ChainApi for ParentchainApiMock {
	fn last_finalized_block(&self) -> ApiResult<Option<SignedBlock>> {
		Ok(self.parentchain.last().cloned())
	}

	fn signed_block(&self, _hash: Option<H256>) -> ApiResult<Option<SignedBlock>> {
		todo!()
	}

	fn get_genesis_hash(&self) -> ApiResult<H256> {
		todo!()
	}

	fn get_header(&self, _header_hash: Option<H256>) -> ApiResult<Option<Header>> {
		todo!()
	}

	fn get_blocks(&self, from: u32, to: u32) -> ApiResult<Vec<SignedBlock>> {
		let num_elements = to.checked_sub(from).map(|n| n + 1).unwrap_or(0);
		let blocks = self
			.parentchain
			.iter()
			.skip(from as usize)
			.take(num_elements as usize)
			.cloned()
			.collect();
		ApiResult::Ok(blocks)
	}

	fn is_grandpa_available(&self) -> ApiResult<bool> {
		todo!()
	}

	fn grandpa_authorities(&self, _hash: Option<H256>) -> ApiResult<AuthorityList> {
		todo!()
	}

	fn grandpa_authorities_proof(&self, _hash: Option<H256>) -> ApiResult<StorageProof> {
		todo!()
	}

	fn events(&self, _hash: Option<H256>) -> ApiResult<Events> {
		let metadata = metadata::<Event>();
		Ok(Events::new(metadata, H256::default(), vec![].into()))
	}
}
