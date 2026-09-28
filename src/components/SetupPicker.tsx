/**
 * Page-level setup picker: the reader picks their OS, network, execution
 * client and Engine API connection once, and every <When> block on the page
 * follows that choice.
 * The choice is stored in the Quickstart's localStorage entry, so a setup
 * picked on either page carries over to the other.
 *
 *   <SetupPicker />
 *   <SetupPicker groups="os net" />   (only these chips; the rest keep their saved value)
 *   <When os="win" el="geth nethermind" conn="jwt">…</When>
 *
 * <When> also fills `{net}` (mainnet, hoodi, sepolia), `{checkpoint}` (the
 * network's checkpoint sync URL), `{checkpoint2}` (a second, independent
 * provider to check it against) and `{explorer}` (the network's block
 * explorer) in the text and code blocks it contains.
 */
import React, { Children, cloneElement, isValidElement, useSyncExternalStore, type ReactNode } from 'react';
import { NETWORKS } from '@site/src/data/networks';
import './SetupPicker.css';

type Key = 'os' | 'net' | 'el' | 'conn';
type Setup = Record<Key, string>;

const STORAGE_KEY = 'prysm-quickstart';

const GROUPS: { key: Key; legend: string; options: { value: string; label: string }[] }[] = [
	{
		key: 'os',
		legend: 'Operating system',
		options: [
			{ value: 'unix', label: 'Linux or macOS' },
			{ value: 'win', label: 'Windows' },
		],
	},
	{
		key: 'net',
		legend: 'Network',
		options: NETWORKS.map((n) => ({ value: n.id, label: n.id === 'mainnet' ? n.name : `${n.name} testnet` })),
	},
	{
		key: 'el',
		legend: 'Execution client',
		options: [
			{ value: 'besu', label: 'Besu' },
			{ value: 'erigon', label: 'Erigon' },
			{ value: 'ethrex', label: 'Ethrex' },
			{ value: 'geth', label: 'Geth' },
			{ value: 'nethermind', label: 'Nethermind' },
			{ value: 'reth', label: 'Reth' },
		],
	},
	{
		key: 'conn',
		legend: 'Engine API connection',
		options: [
			{ value: 'jwt', label: 'HTTP with JWT' },
			{ value: 'ipc', label: 'IPC socket' },
		],
	},
];

// Same defaults as the Quickstart.
const DEFAULTS: Setup = { os: 'unix', net: 'mainnet', el: 'besu', conn: 'jwt' };

/** IPC is only documented for Geth, as in the Quickstart. */
const ipcAllowed = (el: string) => el === 'geth';

const listeners = new Set<() => void>();
let cache: Setup | null = null;
// Choices made on this page, kept even when localStorage is unavailable.
const chosen: Partial<Setup> = {};

function readSaved(): Record<string, unknown> {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
	} catch {
		return {};
	}
}

function read(): Setup {
	if (!cache) {
		const saved: Record<string, unknown> = { ...readSaved(), ...chosen };
		cache = { ...DEFAULTS };
		for (const g of GROUPS) {
			const v = saved[g.key];
			if (typeof v === 'string' && g.options.some((o) => o.value === v)) cache[g.key] = v;
		}
		if (!ipcAllowed(cache.el)) cache.conn = 'jwt';
	}
	return cache;
}

function write(key: Key, value: string) {
	chosen[key] = value;
	// Keep the Quickstart's other settings (role, MEV-Boost, …) as they are.
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), [key]: value }));
	} catch {}
	cache = null;
	listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
	const onStorage = (e: StorageEvent) => {
		if (e.key !== STORAGE_KEY) return;
		cache = null;
		listener();
	};
	listeners.add(listener);
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener('storage', onStorage);
	};
}

function useSetup(): Setup {
	return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

/** `groups` is a space-separated list of the chip groups to show; all by default. */
export function SetupPicker({ groups }: { groups?: string }) {
	const setup = useSetup();
	const shown = groups ? GROUPS.filter((g) => groups.split(/\s+/).includes(g.key)) : GROUPS;
	return (
		<form className="setup-picker" aria-label="Your setup" onSubmit={(e) => e.preventDefault()}>
			{shown.map((g) => (
				<fieldset key={g.key}>
					<legend>{g.legend}</legend>
					<div className="setup-picker-seg">
						{g.options.map((o) => (
							<label key={o.value}>
								<input
									type="radio"
									name={`setup-${g.key}`}
									value={o.value}
									checked={setup[g.key] === o.value}
									disabled={g.key === 'conn' && o.value === 'ipc' && !ipcAllowed(setup.el)}
									onChange={() => write(g.key, o.value)}
								/>
								<span>{o.label}</span>
							</label>
						))}
					</div>
				</fieldset>
			))}
		</form>
	);
}

const checkpoints: Record<string, string> = Object.fromEntries(NETWORKS.map((n) => [n.id, n.checkpointSyncUrl]));
const verifiers: Record<string, string> = Object.fromEntries(NETWORKS.map((n) => [n.id, n.checkpointVerifyUrl]));
const explorers: Record<string, string> = Object.fromEntries(NETWORKS.map((n) => [n.id, n.explorer]));

/** Replaces the placeholders in every string below `node`, code blocks and link targets included. */
function fill(node: ReactNode, setup: Setup): ReactNode {
	if (typeof node === 'string') {
		return node
			.replaceAll('{net}', setup.net)
			.replaceAll('{checkpoint}', checkpoints[setup.net])
			.replaceAll('{checkpoint2}', verifiers[setup.net])
			.replaceAll('{explorer}', explorers[setup.net]);
	}
	if (Array.isArray(node)) return Children.map(node, (child) => fill(child, setup));
	if (isValidElement<{ children?: ReactNode; href?: string }>(node)) {
		const { children, href } = node.props;
		if (children === undefined && typeof href !== 'string') return node;
		// MDX percent-encodes the braces in link targets.
		const target = typeof href === 'string' ? href.replaceAll('%7B', '{').replaceAll('%7D', '}') : undefined;
		const props = target !== undefined ? { href: fill(target, setup) as string } : undefined;
		return children === undefined ? cloneElement(node, props) : cloneElement(node, props, fill(children, setup));
	}
	return node;
}

/** Each prop is a space-separated list of values; content shows when every given prop matches. */
export function When({ children, ...conditions }: Partial<Setup> & { children: ReactNode }) {
	const setup = useSetup();
	const match = (Object.entries(conditions) as [Key, string | undefined][]).every(
		([key, values]) => values === undefined || values.split(/\s+/).includes(setup[key]),
	);
	// Hidden rather than removed, so search still indexes every variant.
	return <div hidden={!match}>{fill(children, setup)}</div>;
}
