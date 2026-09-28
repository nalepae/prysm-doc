/**
 * Interactive quickstart: the reader picks their OS, network, execution
 * client and options once, and every command on the page is generated for
 * that exact setup. Selections are mirrored to the URL hash so a setup can
 * be shared, and remembered locally for the next visit.
 */
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import { NETWORKS } from '@site/src/data/networks';
import './QuickstartBuilder.css';

const checkpoints: Record<string, string> = Object.fromEntries(NETWORKS.map((n) => [n.id, n.checkpointSyncUrl]));
const launchpads: Record<string, string> = Object.fromEntries(NETWORKS.map((n) => [n.id, n.launchpad ?? '']));

type Key = 'os' | 'net' | 'el' | 'conn' | 'role' | 'sync' | 'mev' | 'fee';
type State = Record<Key, string>;
const STORAGE_KEY = 'prysm-quickstart';
const KEYS: Key[] = ['os', 'net', 'el', 'conn', 'role', 'sync', 'mev', 'fee'];
const FEE_RE = /^0x[0-9a-fA-F]{40}$/;
const FEE_HINT = 'Priority fees and MEV rewards from your proposals go here.';

const groups: { key: Key; legend: string; options: { value: string; label: string }[] }[] = [
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
		options: [
			{ value: 'hoodi', label: 'Hoodi testnet' },
			{ value: 'mainnet', label: 'Mainnet' },
			{ value: 'sepolia', label: 'Sepolia testnet' },
		],
	},
	{
		key: 'el',
		legend: 'Execution client',
		options: [
			{ value: 'geth', label: 'Geth' },
			{ value: 'nethermind', label: 'Nethermind' },
			{ value: 'besu', label: 'Besu' },
			{ value: 'reth', label: 'Reth' },
			{ value: 'erigon', label: 'Erigon' },
			{ value: 'ethrex', label: 'Ethrex' },
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
	{
		key: 'role',
		legend: 'What you want to run',
		options: [
			{ value: 'node', label: 'Node only' },
			{ value: 'validator', label: 'Node and validator' },
		],
	},
	{
		key: 'sync',
		legend: 'Initial sync',
		options: [
			{ value: 'checkpoint', label: 'From a checkpoint' },
			{ value: 'genesis', label: 'From genesis' },
		],
	},
];

const DEFAULTS = {
	...(Object.fromEntries(groups.map((g) => [g.key, g.options[0].value])) as State),
	mev: '',
	fee: '',
};

/** IPC is only documented for Geth. */
const ipcAllowed = (el: string) => ['geth'].includes(el);

/** Drops unknown values and falls back to HTTP with JWT where IPC isn't offered. */
function normalize(raw: Partial<Record<string, unknown>>): State {
	const s = { ...DEFAULTS };
	for (const g of groups) {
		const v = raw[g.key];
		if (typeof v === 'string' && g.options.some((o) => o.value === v)) s[g.key] = v;
	}
	s.mev = raw.mev === 'on' ? 'on' : '';
	s.fee = typeof raw.fee === 'string' ? raw.fee : '';
	if (s.conn === 'ipc' && !ipcAllowed(s.el)) s.conn = 'jwt';
	return s;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Joins flags onto one command, wrapping long lines with the shell's continuation char. */
function command(os: string, parts: string[]) {
	const cont = os === 'win' ? ' ^' : ' \\';
	const [head, ...flags] = parts.filter(Boolean);
	if (flags.length <= 1) return [head, ...flags].join(' ');
	return [head + cont, ...flags.map((f, i) => '  ' + f + (i < flags.length - 1 ? cont : ''))].join('\n');
}

function build(s: State) {
	const win = s.os === 'win';
	const prysm = win ? 'prysm.bat' : './prysm.sh';
	const jwt = win ? '%USERPROFILE%\\ethereum\\jwt.hex' : '$HOME/ethereum/jwt.hex';
	const ipc = win ? '\\\\.\\pipe\\geth.ipc' : '$HOME/ethereum/execution/geth.ipc';
	const net = s.net;
	const fee = FEE_RE.test(s.fee) ? s.fee : '<YOUR_WALLET_ADDRESS>';
	const ipcMode = s.conn === 'ipc';
	const validator = s.role === 'validator';
	const mev = s.mev === 'on';
	const exe = (name: string) => (win ? `${name}.exe` : `./${name}`);

	const install = win
		? 'curl https://raw.githubusercontent.com/OffchainLabs/prysm/master/prysm.bat --output prysm.bat\nreg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1'
		: 'curl https://raw.githubusercontent.com/OffchainLabs/prysm/master/prysm.sh --output prysm.sh && chmod +x prysm.sh';

	const jwtCmd = `${prysm} beacon-chain generate-auth-secret\n${win ? 'move jwt.hex ..' : 'mv jwt.hex ..'}`;

	// Commands mirror the per-client tabs in /setup/connect-execution-client/,
	// which record the client version each was checked against.
	const home = win ? '%USERPROFILE%\\ethereum' : '$HOME/ethereum';
	const sep = win ? '\\' : '/';
	const dd = `${home}${sep}execution`;
	const el: Record<string, string[]> = {
		geth: [
			exe('geth'),
			`--${net}`,
			`--datadir=${dd}`,
			ipcMode ? '' : `--authrpc.jwtsecret=${jwt}`,
		],
		nethermind: [exe('nethermind'), `-c ${net}`, `--data-dir ${dd}`, `--jsonrpc-jwtsecretfile ${jwt}`],
		besu: [
			exe('besu'),
			`--network=${net}`,
			`--data-path=${dd}`,
			`--engine-jwt-secret=${jwt}`,
		],
		erigon: [
			exe('erigon'),
			`--chain=${net}`,
			`--datadir=${dd}`,
			'--externalcl',
			`--authrpc.jwtsecret=${jwt}`,
		],
		reth: [
			`${exe('reth')} node`,
			`--chain ${net}`,
			`--datadir ${dd}`,
			'--full',
			`--authrpc.jwtsecret ${jwt}`,
		],
		ethrex: [
			exe('ethrex'),
			`--network ${net}`,
			`--datadir ${dd}`,
			`--authrpc.jwtsecret ${jwt}`,
		],
	};
	const elParts = el[s.el];

	const elDocs: Record<string, [string, string]> = {
		geth: ['Geth', 'https://geth.ethereum.org/downloads'],
		nethermind: ['Nethermind', 'https://docs.nethermind.io/get-started/installing-nethermind'],
		besu: ['Besu', 'https://besu.hyperledger.org/public-networks/get-started/install/binary-distribution'],
		reth: ['Reth', 'https://reth.rs/installation/overview'],
		erigon: ['Erigon', 'https://docs.erigon.tech/get-started/installation'],
		ethrex: ['Ethrex', 'https://docs.ethrex.xyz/getting-started/index.html'],
	};
	const [elName, elUrl] = elDocs[s.el];
	const elIntro = (
		<>
			Install <a href={elUrl}>{elName}</a> into your <code>execution</code> folder (details in the{' '}
			<Link to="/setup/connect-execution-client/">execution client guide</Link>), then start it from there
			{ipcMode ? '. Geth creates its IPC socket in its data directory, and the beacon node connects to it there' : ''}:
		</>
	);

	const bn = [
		`${prysm} beacon-chain`,
		`--${net}`,
		ipcMode ? `--execution-endpoint=${ipc}` : `--jwt-secret=${jwt}`,
		s.sync === 'checkpoint' ? `--checkpoint-sync-url=${checkpoints[net]}` : '',
		s.sync === 'genesis' && net !== 'mainnet' ? '--genesis-state=genesis.ssz' : '',
		validator || FEE_RE.test(s.fee) ? `--suggested-fee-recipient=${fee}` : '',
		mev ? '--http-mev-relay=http://localhost:18550' : '',
	];
	const genesisRepo: Record<string, string> = {
		hoodi: 'https://github.com/eth-clients/hoodi/raw/main/metadata/genesis.ssz',
		sepolia: 'https://github.com/eth-clients/sepolia/raw/main/metadata/genesis.ssz',
	};
	const bnAfter = (
		<>
			{s.sync === 'checkpoint' ? (
				<p>
					Checkpoint sync fetches a recent finalized state, so the node follows the chain within minutes. It doesn't
					download older blocks unless you add <code>--enable-backfill</code>. <code>{checkpoints[net]}</code> is one of
					several <a href="https://eth-clients.github.io/checkpoint-sync-endpoints/">community endpoints</a>; any one you
					trust works. See <Link to="/setup/checkpoint-sync/">Checkpoint sync</Link>.
				</p>
			) : (
				<p>
					Syncing from genesis replays every block and takes days rather than minutes.
					{net !== 'mainnet' && (
						<>
							{' '}
							Download{' '}
							<a href={genesisRepo[net]}>
								<code>genesis.ssz</code>
							</a>{' '}
							into your <code>consensus</code> folder first.
						</>
					)}
				</p>
			)}
			{mev && (
				<p>
					MEV-Boost must be running on port 18550 with the relays you choose. See{' '}
					<Link to="/validators/mev-boost/">Use MEV-Boost</Link>.
				</p>
			)}
		</>
	);

	const keys = command(s.os, [
		win ? 'deposit.exe new-mnemonic' : './deposit new-mnemonic',
		'--num_validators=1',
		`--chain=${net}`,
		'--withdrawal_address=<YOUR_WITHDRAWAL_ADDRESS>',
	]);
	const wallet = win ? '.\\wallet' : './wallet';
	const importCmd = command(s.os, [
		`${prysm} validator accounts import`,
		`--${net}`,
		'--keys-dir=<PATH_TO_VALIDATOR_KEYS>',
		`--wallet-dir=${wallet}`,
	]);

	let deposit: ReactNode;
	if (net === 'sepolia') {
		deposit = (
			<p className="qs-warn">
				Sepolia has a permissioned validator set, so you can’t create a new validator there. Switch the network to{' '}
				<strong>Hoodi</strong> to rehearse staking.
			</p>
		);
	} else if (net === 'mainnet') {
		deposit = (
			<p>
				Upload <code>deposit_data-*.json</code> on the <a href={launchpads[net]}>Staking Launchpad</a> and follow its
				checks before depositing 32 ETH. Always type the launchpad address yourself; phishing copies are common.
			</p>
		);
	} else {
		deposit = (
			<p>
				Upload <code>deposit_data-*.json</code> on the <a href={launchpads[net]}>Hoodi Launchpad</a> and deposit 32 Hoodi
				ETH. Never send real ETH to a testnet deposit contract.
			</p>
		);
	}

	const vc = [
		`${prysm} validator`,
		`--${net}`,
		`--wallet-dir=${wallet}`,
		`--suggested-fee-recipient=${fee}`,
		mev ? '--enable-builder' : '',
	];

	let note = '';
	if (ipcMode && !ipcAllowed(s.el)) note = `IPC is shown for Geth only, so ${elName} uses HTTP with JWT.`;
	if (win && ['reth', 'ethrex'].includes(s.el))
		note = `${elName} doesn't publish Windows builds (only Linux and Apple-silicon macOS). Pick another execution client on Windows.`;
	if (validator && net === 'sepolia') note = 'Sepolia’s validator set is permissioned. Pick Hoodi to practise running a validator.';

	return {
		install,
		jwt: jwtCmd,
		el: command(s.os, elParts),
		elIntro,
		bn: command(s.os, bn),
		bnAfter,
		keys,
		import: importCmd,
		deposit,
		vc: command(s.os, vc),
		note,
	};
}

function highlight(code: string) {
	// Colour flags and placeholders; everything else stays plain.
	return esc(code)
		.replace(/(&lt;[A-Z_]+&gt;)/g, '<mark class="ph">$1</mark>')
		.replace(/(^|\s)(--?[a-zA-Z][\w.-]*)/g, '$1<span class="fl">$2</span>');
}

/** Briefly swaps a button's label after a clipboard write. */
function useFlash(idle: string, ms: number): [string, (text: string) => void] {
	const [label, setLabel] = useState(idle);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(timer.current), []);
	return [
		label,
		(text) => {
			setLabel(text);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => setLabel(idle), ms);
		},
	];
}

function Code({ name, code }: { name: string; code: string }) {
	const [label, flash] = useFlash('Copy', 1600);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			flash('Copied');
		} catch {
			flash('Select and copy');
		}
	};
	return (
		<div className="qs-code" data-cmd={name}>
			<pre>
				<code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
			</pre>
			<button type="button" className="qs-copy" aria-label="Copy command" onClick={copy}>
				{label}
			</button>
		</div>
	);
}

const STEP_IDS = [
	'install-prysm',
	'create-a-jwt-secret',
	'start-your-execution-client',
	'start-your-beacon-node',
	'create-validator-keys',
	'import-your-keys',
	'make-your-deposit',
	'start-your-validator',
];

export default function QuickstartBuilder() {
	const brokenLinks = useBrokenLinks();
	STEP_IDS.forEach((id) => brokenLinks.collectAnchor(id));

	const [s, setS] = useState<State>(DEFAULTS);
	const [restored, setRestored] = useState(false);
	const [shareLabel, flashShare] = useFlash('Copy link to this setup', 1800);

	// Restore: a shared link in the URL hash wins over the remembered setup.
	// The hash leaves out unset options and the fee address, so only the fee
	// is carried over from the remembered setup.
	useEffect(() => {
		const fromHash = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
		let saved: Partial<State> = {};
		try {
			saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
		} catch {}
		setS(normalize(fromHash.net ? { fee: saved.fee, ...fromHash } : saved));
		setRestored(true);
	}, []);

	useEffect(() => {
		if (!restored) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
		} catch {}
		const params = new URLSearchParams(Object.entries(s).filter(([k, v]) => v && k !== 'fee'));
		history.replaceState(history.state, '', `#${params}`);
	}, [s, restored]);

	const set = (k: Key, v: string) => setS((prev) => normalize({ ...prev, [k]: v }));
	const out = build(s);
	const badFee = s.fee !== '' && !FEE_RE.test(s.fee);
	const validator = s.role === 'validator';

	const share = async () => {
		try {
			await navigator.clipboard.writeText(location.href);
			flashShare('Link copied');
		} catch {
			flashShare('Copy the address bar');
		}
	};

	return (
		<div className="qs">
			<form className="qs-config" aria-label="Your setup" onSubmit={(e) => e.preventDefault()}>
				<div className="qs-config-head">
					<p className="qs-config-title">Your setup</p>
					<button type="button" className="qs-share" onClick={share}>
						{shareLabel}
					</button>
				</div>
				<div className="qs-groups">
					{groups.map((g) => (
						<fieldset className="qs-group" key={g.key}>
							<legend>{g.legend}</legend>
							<div className="qs-seg">
								{g.options.map((o) => (
									<label key={o.value}>
										<input
											type="radio"
											name={g.key}
											value={o.value}
											checked={s[g.key] === o.value}
											disabled={g.key === 'conn' && o.value === 'ipc' && !ipcAllowed(s.el)}
											onChange={() => set(g.key, o.value)}
										/>
										<span>{o.label}</span>
									</label>
								))}
							</div>
						</fieldset>
					))}
					<fieldset className="qs-group qs-wide">
						<legend>Options</legend>
						<label className="qs-check">
							<input type="checkbox" name="mev" checked={s.mev === 'on'} onChange={(e) => set('mev', e.target.checked ? 'on' : '')} />
							<span>Use MEV-Boost for block building</span>
						</label>
						<label className="qs-text">
							<span>Fee recipient address (optional)</span>
							<input
								type="text"
								name="fee"
								placeholder="0x… an address you control"
								spellCheck={false}
								autoComplete="off"
								pattern="^0x[0-9a-fA-F]{40}$"
								value={s.fee}
								onChange={(e) => set('fee', e.target.value)}
							/>
							<small className={badFee ? 'bad' : undefined}>
								{badFee ? 'Enter a 20-byte address: 0x followed by 40 hex characters.' : FEE_HINT}
							</small>
						</label>
					</fieldset>
				</div>
				<p className="qs-note" hidden={!out.note}>
					{out.note}
				</p>
			</form>

			<ol className="qs-steps">
				<li>
					<h2 id="install-prysm">Install Prysm</h2>
					<p>
						Create an <code>ethereum</code> folder in your home directory, on your SSD, with two subfolders:{' '}
						<code>consensus</code> and <code>execution</code>. The commands below assume this layout. Then, from the{' '}
						<code>consensus</code> folder, download the Prysm launcher script:
					</p>
					<Code name="install" code={out.install} />
					<p hidden={s.os !== 'unix'}>
						<code>prysm.sh</code> downloads the latest release binaries on first run and verifies their checksums and
						signatures. Pin a release with <code>USE_PRYSM_VERSION</code>; see <Link to="/install/update/">Update and roll back</Link>.
					</p>
					<p hidden={s.os !== 'win'}>
						The registry change enables coloured log output in Windows terminals. <code>prysm.bat</code> downloads the
						latest release on first run.
					</p>
				</li>

				<li hidden={s.conn !== 'jwt'}>
					<h2 id="create-a-jwt-secret">Create a JWT secret</h2>
					<p>
						The beacon node and execution client authenticate each other with a shared secret. Generate it from the{' '}
						<code>consensus</code> folder and move it up into <code>ethereum</code>, where both clients can read it:
					</p>
					<Code name="jwt" code={out.jwt} />
					<pre className="qs-tree" aria-label="Folder layout">
						{'ethereum/\n├── consensus/\n├── execution/\n└── jwt.hex'}
					</pre>
				</li>

				<li>
					<h2 id="start-your-execution-client">Start your execution client</h2>
					<p data-cmd-text="elIntro">{out.elIntro}</p>
					<Code name="el" code={out.el} />
					<p>
						The execution client waits for a beacon node before it starts syncing, so don't worry if it looks idle. Leave
						it running in its own terminal.
					</p>
				</li>

				<li>
					<h2 id="start-your-beacon-node">Start your beacon node</h2>
					<p>
						From the <code>consensus</code> folder, start the beacon node. The first run asks you to accept the terms of
						use.
					</p>
					<Code name="bn" code={out.bn} />
					<div data-cmd-html="bnAfter">{out.bnAfter}</div>
					<p>
						Check progress with <code>curl http://localhost:3500/eth/v1/node/syncing</code>, or see{' '}
						<Link to="/operate/check-health/">Is my node healthy?</Link>.
					</p>
				</li>

				<li hidden={!validator}>
					<h2 id="create-validator-keys">Create validator keys</h2>
					<p>
						Download the <a href="https://github.com/ethstaker/ethstaker-deposit-cli/releases">EthStaker deposit CLI</a>,
						ideally onto a machine that has never been connected to the internet. Generate a mnemonic and one validator
						key:
					</p>
					<Code name="keys" code={out.keys} />
					<p>
						Replace <code>&lt;YOUR_WITHDRAWAL_ADDRESS&gt;</code> with an address you control: withdrawals and the stake
						itself go there when you exit. See <Link to="/validators/create-keys/">Create validator keys</Link> for
						compounding (0x02) validators. Write the 24-word mnemonic down on paper and keep it offline. Anyone who has it
						controls your validator and its withdrawal. The CLI writes a <code>validator_keys</code> folder containing a{' '}
						<code>deposit_data-*.json</code> file and one <code>keystore-m_*.json</code> per validator.
					</p>
				</li>

				<li hidden={!validator}>
					<h2 id="import-your-keys">Import your keys into Prysm</h2>
					<p>
						Copy <code>validator_keys</code> to your node, then import it from the <code>consensus</code> folder. Prysm
						creates a wallet in <code>consensus/wallet</code> and asks you to choose a wallet password, then for the
						keystore password you set in the deposit CLI.
					</p>
					<Code name="import" code={out.import} />
				</li>

				<li hidden={!validator}>
					<h2 id="make-your-deposit">Make your deposit</h2>
					<div data-cmd-html="deposit">{out.deposit}</div>
				</li>

				<li hidden={!validator}>
					<h2 id="start-your-validator">Start your validator</h2>
					<p>
						From the <code>consensus</code> folder, start the validator client with the wallet you just created. It asks
						for the wallet password on startup; use <code>--wallet-password-file</code> to run it unattended.
					</p>
					<Code name="vc" code={out.vc} />
					<p>
						Activation takes anywhere from hours to weeks depending on the entry queue. Keep all three processes running;
						once active, your validator attests and proposes automatically. To keep them running after a reboot, see{' '}
						<Link to="/setup/run-as-a-service/">Run as a service</Link>.
					</p>
				</li>
			</ol>
		</div>
	);
}
