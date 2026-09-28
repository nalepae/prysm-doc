// Information architecture: every page of the site, its sidebar group, and
// which writer owns it. `sidebars.ts` builds the
// sidebar from this file, and `node tools/ia.mjs stubs` creates missing pages.

export const IA = [
	{
		label: 'Welcome',
		items: [
			['get-started/introduction', 'What is Prysm?', 'start'],
			['get-started/system-requirements', 'System requirements', 'start'],
			['get-started/quickstart', 'Quickstart', 'start'],
		],
	},
	{
		label: 'Install and update',
		items: [
			['install', 'Install Prysm', 'start'],
			['install/update', 'Update and roll back', 'start'],
		],
	},
	{
		label: 'Run a beacon node',
		items: [
			['setup/connect-execution-client', 'Connect your execution client', 'node'],
			['setup/checkpoint-sync', 'Sync from a checkpoint', 'node'],
			['setup/genesis-sync', 'Sync from genesis', 'node'],
			['setup/networking', 'Ports, peers and router setup', 'node'],
			['setup/run-with-docker-compose', 'Run with Docker Compose [TBR]', 'node'],
			['setup/run-with-systemd', 'Run with systemd [TBR]', 'node'],
			['setup/storage', 'Disk space and archive nodes [TBR]', 'node'],
			['setup/beacon-node-only', 'Beacon node only [TBR]', 'node'],
			['operate/slasher', 'Run a slasher [TBR]', 'node'],
		],
	},
	{
		label: 'Run validators',
		items: [
			['validators/avoid-slashing', 'Avoid slashing [TBR]', 'validators'],
			['validators/create-keys', 'Create validator keys [TBR]', 'validators'],
			['validators/import-keys', 'Import keys [TBR]', 'validators'],
			['validators/connect-to-beacon-nodes', 'Connect to beacon nodes [TBR]', 'validators'],
			['validators/fee-recipient', 'Set your fee recipient [TBR]', 'validators'],
			['validators/deposit', 'Make a deposit [TBR]', 'validators'],
			['validators/mev-boost', 'Use MEV-Boost [TBR]', 'validators'],
			['validators/graffiti', 'Set graffiti [TBR]', 'validators'],
			['validators/remote-signer', 'Use a remote signer [TBR]', 'validators'],
			['validators/keymanager', 'Add or remove validators without restarting [TBR]', 'validators'],
			['validators/several-validator-clients', 'Run several validator clients [TBR]', 'validators'],
			['validators/withdrawals', 'Withdrawals and consolidation [TBR]', 'validators'],
			['validators/exit', 'Exit a validator [TBR]', 'validators'],
		],
	},
	{
		label: 'Monitor and maintain',
		items: [
			['operate/check-health', 'Is my node healthy? [TBR]', 'operate'],
			['operate/metrics', 'Dashboards and alerts [TBR]', 'operate'],
			['operate/validator-monitoring', 'Track validator performance [TBR]', 'operate'],
			['operate/backup-and-restore', 'Back up and restore [TBR]', 'operate'],
			['operate/move-to-new-machine', 'Move to a new machine [TBR]', 'operate'],
			['operate/switch-clients', 'Switch clients [TBR]', 'operate'],
		],
	},
	{
		label: 'Troubleshooting',
		items: [
			['operate/troubleshooting', 'Fix common problems [TBR]', 'operate'],
			['operate/faq', 'FAQ [TBR]', 'operate'],
		],
	},
	{
		label: 'Security',
		items: [['security', 'Security checklist [TBR]', 'operate']],
	},
	{
		label: 'Reference',
		items: [
			['reference/cli', 'Common flags and config file [TBR]', 'reference'],
			['reference/cli/beacon-chain', 'beacon-chain flags [TBR]', 'reference'],
			['reference/cli/validator', 'validator flags [TBR]', 'reference'],
			['reference/cli/prysmctl', 'prysmctl commands [TBR]', 'reference'],
			['reference/apis', 'APIs [TBR]', 'reference'],
			['reference/networks', 'Networks [TBR]', 'reference'],
			['reference/ports', 'Ports [TBR]', 'reference'],
			['reference/glossary', 'Glossary [TBR]', 'reference'],
		],
	},
	{
		label: 'Developer guide',
		items: [
			['developers', 'Overview [TBR]', 'dev'],
			['developers/environment', 'Install Bazel with Bazelisk [TBR]', 'dev'],
			['developers/build', 'Build with Bazel [TBR]', 'dev'],
			['developers/run-from-source', 'Run with Bazel [TBR]', 'dev'],
			['developers/unit-tests', 'Unit tests [TBR]', 'dev'],
			['developers/e2e-tests', 'End-to-end tests [TBR]', 'dev'],
			['developers/gazelle', 'Update BUILD files with Gazelle [TBR]', 'dev'],
			['developers/docker-images', 'Build Docker images [TBR]', 'dev'],
		],
	},
	{
		label: 'Learn',
		items: [
			['learn/how-staking-works', 'How staking works [TBR]', 'reference'],
			['learn/keys-and-withdrawals', 'Keys and withdrawal credentials [TBR]', 'reference'],
			['resources/help', 'Get help and resources [TBR]', 'reference'],
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
