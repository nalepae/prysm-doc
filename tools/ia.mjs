// Information architecture: every page of the site, its sidebar group, and
// which writer owns it. `sidebars.ts` builds the
// sidebar from this file, and `node tools/ia.mjs stubs` creates missing pages.

export const IA = [
	{
		label: 'Welcome',
		items: [
			['get-started/introduction', 'What is Prysm?', 'start'],
			['get-started/choose-your-path', 'Pick your path', 'start'],
			['get-started/system-requirements', 'System requirements', 'start'],
		],
	},
	{
		label: 'Quickstart',
		items: [
			['get-started/quickstart', 'Run a node', 'start'],
			['get-started/become-a-validator', 'Become a validator', 'start'],
			['get-started/try-on-hoodi', 'Try it on Hoodi first', 'start'],
			['get-started/mainnet-checklist', 'Mainnet launch checklist', 'start'],
		],
	},
	{
		label: 'Install and update',
		items: [
			['install', 'Install Prysm', 'start'],
			['install/verify', 'Verify your download', 'start'],
			['install/update', 'Update and roll back', 'start'],
		],
	},
	{
		label: 'Run a beacon node',
		items: [
			['setup/connect-execution-client', 'Connect your execution client', 'node'],
			['setup/checkpoint-sync', 'Checkpoint sync', 'node'],
			['setup/networking', 'Ports, peers and router setup', 'node'],
			['setup/run-as-a-service', 'Run as a service', 'node'],
			['setup/storage', 'Disk space and archive nodes', 'node'],
			['setup/beacon-node-only', 'Beacon node only', 'node'],
			['operate/slasher', 'Run a slasher', 'node'],
		],
	},
	{
		label: 'Run validators',
		items: [
			['validators/avoid-slashing', 'Avoid slashing', 'validators'],
			['validators/create-keys', 'Create validator keys', 'validators'],
			['validators/import-keys', 'Import keys', 'validators'],
			['validators/connect-to-beacon-nodes', 'Connect to beacon nodes', 'validators'],
			['validators/fee-recipient', 'Set your fee recipient', 'validators'],
			['validators/deposit', 'Make a deposit', 'validators'],
			['validators/mev-boost', 'Use MEV-Boost', 'validators'],
			['validators/graffiti', 'Set graffiti', 'validators'],
			['validators/remote-signer', 'Use a remote signer', 'validators'],
			['validators/keymanager', 'Add or remove validators without restarting', 'validators'],
			['validators/several-validator-clients', 'Run several validator clients', 'validators'],
			['validators/withdrawals', 'Withdrawals and consolidation', 'validators'],
			['validators/exit', 'Exit a validator', 'validators'],
		],
	},
	{
		label: 'Monitor and maintain',
		items: [
			['operate/check-health', 'Is my node healthy?', 'operate'],
			['operate/metrics', 'Dashboards and alerts', 'operate'],
			['operate/validator-monitoring', 'Track validator performance', 'operate'],
			['operate/backup-and-restore', 'Back up and restore', 'operate'],
			['operate/move-to-new-machine', 'Move to a new machine', 'operate'],
			['operate/switch-clients', 'Switch clients', 'operate'],
		],
	},
	{
		label: 'Troubleshooting',
		items: [
			['operate/troubleshooting', 'Fix common problems', 'operate'],
			['operate/faq', 'FAQ', 'operate'],
		],
	},
	{
		label: 'Security',
		items: [['security', 'Security checklist', 'operate']],
	},
	{
		label: 'Reference',
		items: [
			['reference/cli', 'Common flags and config file', 'reference'],
			['reference/cli/beacon-chain', 'beacon-chain flags', 'reference'],
			['reference/cli/validator', 'validator flags', 'reference'],
			['reference/cli/prysmctl', 'prysmctl commands', 'reference'],
			['reference/apis', 'APIs', 'reference'],
			['reference/networks', 'Networks', 'reference'],
			['reference/ports', 'Ports', 'reference'],
			['reference/glossary', 'Glossary', 'reference'],
		],
	},
	{
		label: 'Developer guide',
		items: [
			['developers', 'Overview', 'dev'],
			['developers/environment', 'Install Bazel with Bazelisk', 'dev'],
			['developers/build', 'Build with Bazel', 'dev'],
			['developers/run-from-source', 'Run with Bazel', 'dev'],
			['developers/unit-tests', 'Unit tests', 'dev'],
			['developers/e2e-tests', 'End-to-end tests', 'dev'],
			['developers/gazelle', 'Update BUILD files with Gazelle', 'dev'],
			['developers/docker-images', 'Build Docker images', 'dev'],
		],
	},
	{
		label: 'Learn',
		items: [
			['learn/how-staking-works', 'How staking works', 'reference'],
			['learn/keys-and-withdrawals', 'Keys and withdrawal credentials', 'reference'],
			['resources/help', 'Get help and resources', 'reference'],
		],
	},
];

/**
 * Docusaurus sidebar derived from IA. A slug maps to the doc id `slug`, or
 * `slug/index` when the page is a folder index.
 */
import { existsSync } from 'node:fs';
const docId = (slug) => (existsSync(`docs/${slug}/index.mdx`) ? `${slug}/index` : slug);
export function sidebar(groups = IA) {
	return groups.map((g) => ({
		type: 'category',
		label: g.label,
		collapsed: Boolean(g.collapsed),
		items: g.items.map((it) =>
			Array.isArray(it) ? { type: 'doc', id: docId(it[0]), label: it[1] } : sidebar([it])[0],
		),
	}));
}

/** Flat list of [slug, title, owner]. */
export function pages(groups = IA) {
	return groups.flatMap((g) => g.items.flatMap((it) => (Array.isArray(it) ? [it] : pages([it]))));
}
