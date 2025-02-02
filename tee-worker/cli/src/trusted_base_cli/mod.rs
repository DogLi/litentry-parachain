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

use crate::{
	trusted_base_cli::commands::{
		balance::BalanceCommand,
		litentry::{
			set_challenge_code::SetChallengeCodeCommand,
			set_user_shielding_preflight::SetUserShieldingKeyPreflightCommand,
			user_shielding_key::UserShiledingKeyCommand,
			verify_identity_preflight::VerifyIdentityPreflightCommand,
		},
		nonce::NonceCommand,
		set_balance::SetBalanceCommand,
		transfer::TransferCommand,
		unshield_funds::UnshieldFundsCommand,
	},
	trusted_cli::TrustedCli,
	trusted_command_utils::get_keystore_path,
	Cli,
};
use log::*;
use sp_application_crypto::{ed25519, sr25519};
use sp_core::{crypto::Ss58Codec, Pair};
use substrate_client_keystore::{KeystoreExt, LocalKeystore};

mod commands;

#[derive(Subcommand)]
pub enum TrustedBaseCommand {
	/// generates a new incognito account for the given shard
	NewAccount,

	/// lists all incognito accounts in a given shard
	ListAccounts,

	/// send funds from one incognito account to another
	Transfer(TransferCommand),

	/// ROOT call to set some account balance to an arbitrary number
	SetBalance(SetBalanceCommand),

	/// query balance for incognito account in keystore
	Balance(BalanceCommand),

	/// Transfer funds from an incognito account to an parentchain account
	UnshieldFunds(UnshieldFundsCommand),

	/// gets the nonce of a given account, taking the pending trusted calls
	/// in top pool in consideration
	Nonce(NonceCommand),

	// Litentry's commands below
	// for commands that should trigger parentchain extrins, check non-trusted commands
	/// query a user's shielding key, the setter is non-trusted command
	UserShieldingKey(UserShiledingKeyCommand),

	SetChallengeCode(SetChallengeCodeCommand),

	VerifyIdentityPreflight(VerifyIdentityPreflightCommand),

	SetUserShieldingKeyPreflight(SetUserShieldingKeyPreflightCommand),
}

impl TrustedBaseCommand {
	pub fn run(&self, cli: &Cli, trusted_cli: &TrustedCli) {
		match self {
			TrustedBaseCommand::NewAccount => new_account(trusted_cli),
			TrustedBaseCommand::ListAccounts => list_accounts(trusted_cli),
			TrustedBaseCommand::Transfer(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::SetBalance(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::Balance(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::UnshieldFunds(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::Nonce(cmd) => cmd.run(cli, trusted_cli),
			// Litentry's commands below
			TrustedBaseCommand::UserShieldingKey(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::SetChallengeCode(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::VerifyIdentityPreflight(cmd) => cmd.run(cli, trusted_cli),
			TrustedBaseCommand::SetUserShieldingKeyPreflight(cmd) => cmd.run(cli, trusted_cli),
		}
	}
}

fn new_account(trusted_args: &TrustedCli) {
	let store = LocalKeystore::open(get_keystore_path(trusted_args), None).unwrap();
	let key: sr25519::AppPair = store.generate().unwrap();
	drop(store);
	info!("new account {}", key.public().to_ss58check());
	println!("{}", key.public().to_ss58check());
}

fn list_accounts(trusted_args: &TrustedCli) {
	let store = LocalKeystore::open(get_keystore_path(trusted_args), None).unwrap();
	info!("sr25519 keys:");
	for pubkey in store.public_keys::<sr25519::AppPublic>().unwrap().into_iter() {
		println!("{}", pubkey.to_ss58check());
	}
	info!("ed25519 keys:");
	for pubkey in store.public_keys::<ed25519::AppPublic>().unwrap().into_iter() {
		println!("{}", pubkey.to_ss58check());
	}
	drop(store);
}
