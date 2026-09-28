/**
 * Animated walkthrough of one 12-second slot across the validator client,
 * beacon node, execution client and the P2P network. A playhead sweeps the
 * slot; each message lights up as it's sent and its explanation is shown
 * below. Readers can pause, step, or click any message.
 *
 * Timings follow Prysm's mainnet config (config/params/mainnet_config.go):
 * attestations are due at 3333 bps of the slot (4 s), aggregates at 6667 bps
 * (8 s), sync committee messages at 3333 bps. Attesters also go early if a
 * valid block for the slot arrives first (validator/client/attest.go).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import './SlotTimeline.css';

type Lane = 'vc' | 'bn' | 'el' | 'net';
interface Step {
	t: number;
	from: Lane;
	to: Lane;
	label: string;
	title: string;
	body: string;
	who: 'proposer' | 'everyone' | 'attesters' | 'aggregators';
}

const lanes: { id: Lane; name: string; sub: string }[] = [
	{ id: 'vc', name: 'Validator client', sub: 'holds keys, signs' },
	{ id: 'bn', name: 'Beacon node', sub: 'consensus, fork choice' },
	{ id: 'el', name: 'Execution client', sub: 'transactions, state' },
	{ id: 'net', name: 'P2P network', sub: 'other nodes' },
];

const steps: Step[] = [
	{
		t: 0,
		from: 'bn',
		to: 'el',
		label: 'forkchoiceUpdated + attributes',
		who: 'proposer',
		title: 'The proposer’s node asks for a payload',
		body: 'The beacon node already knows its validator proposes this slot. It calls engine_forkchoiceUpdated with payload attributes (timestamp, fee recipient, withdrawals) so the execution client starts packing transactions. Prysm sends this ahead of the slot when it can.',
	},
	{
		t: 0.35,
		from: 'vc',
		to: 'bn',
		label: 'request block',
		who: 'proposer',
		title: 'The validator client requests a block',
		body: 'At the start of the slot, the validator client with the proposer duty asks the beacon node for a block to sign, passing its RANDAO reveal and graffiti.',
	},
	{
		t: 0.7,
		from: 'bn',
		to: 'el',
		label: 'getPayload',
		who: 'proposer',
		title: 'The beacon node collects the payload',
		body: 'engine_getPayload returns the execution payload the client has been building, with blob bundles. With MEV-Boost, the node also asks relays for a builder bid and uses whichever is better, falling back to the local payload.',
	},
	{
		t: 1.1,
		from: 'bn',
		to: 'vc',
		label: 'unsigned block',
		who: 'proposer',
		title: 'The block comes back to be signed',
		body: 'The beacon node assembles the beacon block (attestations, deposits, slashings, execution payload) and returns it. The validator client checks slashing protection, then signs it.',
	},
	{
		t: 1.45,
		from: 'vc',
		to: 'bn',
		label: 'signed block',
		who: 'proposer',
		title: 'The signed block is submitted',
		body: 'The validator client never talks to the network itself. It hands the signed block back to its beacon node.',
	},
	{
		t: 1.8,
		from: 'bn',
		to: 'net',
		label: 'gossip block + blobs',
		who: 'proposer',
		title: 'The block is broadcast',
		body: 'The beacon node publishes the block on the beacon_block gossip topic, and blob data as data column sidecars. It propagates across the network in well under a second when peers are healthy.',
	},
	{
		t: 2.4,
		from: 'net',
		to: 'bn',
		label: 'block arrives',
		who: 'everyone',
		title: 'Every node receives the block',
		body: 'Now switch perspective to any node on the network. Its beacon node validates the block’s consensus rules and checks that the data columns it custodies are available.',
	},
	{
		t: 2.8,
		from: 'bn',
		to: 'el',
		label: 'newPayload',
		who: 'everyone',
		title: 'The execution client verifies the payload',
		body: 'engine_newPayload hands the execution payload to the execution client, which runs every transaction and answers VALID, INVALID or SYNCING. If it is still syncing, Prysm imports the block optimistically.',
	},
	{
		t: 3.3,
		from: 'bn',
		to: 'el',
		label: 'forkchoiceUpdated',
		who: 'everyone',
		title: 'Fork choice moves the head',
		body: 'The beacon node runs fork choice and tells the execution client the new head, safe and finalized blocks with engine_forkchoiceUpdated. The execution client updates its canonical chain.',
	},
	{
		t: 4,
		from: 'vc',
		to: 'bn',
		label: 'attestation + sync message',
		who: 'attesters',
		title: 'Attesters vote at one third of the slot',
		body: 'Validators assigned to this slot ask for attestation data, sign a vote for the head they see, and submit it. Prysm attests at 4 seconds, or as soon as a valid block for the slot has been imported. Sync committee members sign the head at the same time.',
	},
	{
		t: 4.4,
		from: 'bn',
		to: 'net',
		label: 'gossip on subnets',
		who: 'attesters',
		title: 'Votes spread over subnets',
		body: 'Attestations go to one of 64 attestation subnets rather than to everyone, which keeps bandwidth manageable.',
	},
	{
		t: 8,
		from: 'vc',
		to: 'bn',
		label: 'aggregate and proof',
		who: 'aggregators',
		title: 'Aggregators combine votes at two thirds',
		body: 'A few validators per committee are selected as aggregators. At 8 seconds they merge the attestations they saw on their subnet into one aggregate signature.',
	},
	{
		t: 8.4,
		from: 'bn',
		to: 'net',
		label: 'gossip aggregate',
		who: 'aggregators',
		title: 'Aggregates reach the next proposer',
		body: 'Aggregates are published on a global topic. The next proposer packs them into its block, which is how votes end up on chain and earn rewards.',
	},
];

const X0 = 170;
const X1 = 980;
const x = (t: number) => X0 + ((X1 - X0) * t) / 12;
const laneY: Record<Lane, number> = { vc: 60, bn: 130, el: 200, net: 270 };
const whoLabel = {
	proposer: 'Proposer’s node',
	everyone: 'Every node',
	attesters: 'Attesters',
	aggregators: 'Aggregators',
};
const SLOT = 12;
const laneName = (id: Lane) => lanes.find((l) => l.id === id)!.name;
const indexAt = (time: number) => {
	let idx = 0;
	steps.forEach((s, i) => {
		if (s.t <= time) idx = i;
	});
	return idx;
};

export default function SlotTimeline() {
	const id = `st-${useId().replace(/[^\w-]/g, '')}`;
	const rootRef = useRef<HTMLDivElement>(null);
	const visible = useRef(true);
	const [t, setT] = useState(0);
	// Off until mounted so the server renders the first step statically.
	const [playing, setPlaying] = useState(false);
	const current = indexAt(t);

	useEffect(() => {
		setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);
		const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
		io.observe(rootRef.current!);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		if (!playing) return;
		let last = performance.now();
		let raf = requestAnimationFrame(function frame(now) {
			const dt = (now - last) / 1000;
			last = now;
			if (visible.current) setT((prev) => (prev + dt >= SLOT ? 0 : prev + dt));
			raf = requestAnimationFrame(frame);
		});
		return () => cancelAnimationFrame(raf);
	}, [playing]);

	const jump = (i: number) => {
		setT(steps[(i + steps.length) % steps.length].t);
		setPlaying(false);
	};
	const s = steps[current];

	return (
		<div className="slot-timeline not-content" ref={rootRef}>
			<div className="st-frame">
				<svg viewBox="0 0 1000 320" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
					<title id={`${id}-title`}>One slot, second by second</title>
					<desc id={`${id}-desc`}>
						A timeline from 0 to 12 seconds with four lanes: validator client, beacon node, execution client and the
						P2P network. Messages flow between lanes: block production in the first two seconds, block import around
						three seconds, attestations at four seconds and aggregates at eight seconds.
					</desc>
					<defs>
						<marker
							id={`${id}-arrow`}
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="6"
							markerHeight="6"
							orient="auto-start-reverse"
						>
							<path d="M0 0 10 5 0 10z" className="st-head" />
						</marker>
					</defs>

					{/* Phase bands */}
					<rect className="st-band" x={x(0)} y="22" width={x(4) - x(0)} height="276" />
					<rect className="st-band st-band-alt" x={x(4)} y="22" width={x(8) - x(4)} height="276" />
					<rect className="st-band" x={x(8)} y="22" width={x(12) - x(8)} height="276" />

					{/* Seconds axis */}
					{Array.from({ length: 13 }, (_, sec) => (
						<g key={sec}>
							<line className={sec % 4 === 0 ? 'st-tick st-tick-major' : 'st-tick'} x1={x(sec)} x2={x(sec)} y1="22" y2="298" />
							<text className="st-sec" x={x(sec)} y="318">
								{sec}s
							</text>
						</g>
					))}
					<text className="st-phase" x={(x(0) + x(4)) / 2} y="14">Propose and import</text>
					<text className="st-phase" x={(x(4) + x(8)) / 2} y="14">Attest</text>
					<text className="st-phase" x={(x(8) + x(12)) / 2} y="14">Aggregate</text>

					{/* Lanes */}
					{lanes.map((l) => (
						<g key={l.id}>
							<line className="st-lane" x1={X0} x2={X1} y1={laneY[l.id]} y2={laneY[l.id]} />
							<text className="st-lane-name" x="10" y={laneY[l.id] - 3}>
								{l.name}
							</text>
							<text className="st-lane-sub" x="10" y={laneY[l.id] + 17}>
								{l.sub}
							</text>
						</g>
					))}

					{/* Messages */}
					{steps.map((m, i) => {
						const y1 = laneY[m.from];
						const y2 = laneY[m.to];
						const dir = y2 > y1 ? 1 : -1;
						return (
							<g
								key={i}
								className={`st-msg${i === current ? ' on' : ''}${i < current ? ' past' : ''}`}
								tabIndex={0}
								role="button"
								aria-label={`${m.t} seconds: ${m.title}`}
								onClick={() => jump(i)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										jump(i);
									}
								}}
							>
								<line x1={x(m.t)} x2={x(m.t)} y1={y1 + dir * 6} y2={y2 - dir * 6} markerEnd={`url(#${id}-arrow)`} />
								<circle cx={x(m.t)} cy={y1} r="5" />
								<rect className="st-hit" x={x(m.t) - 12} y={Math.min(y1, y2) - 8} width="24" height={Math.abs(y2 - y1) + 16} />
							</g>
						);
					})}

					{/* Playhead */}
					<g className="st-playhead" transform={`translate(${x(t)} 0)`}>
						<line x1="0" x2="0" y1="22" y2="298" />
						<circle cx="0" cy="22" r="4" />
					</g>
				</svg>
			</div>

			<div className="st-panel" aria-live="polite">
				<div className="st-controls">
					<button type="button" aria-label="Previous step" onClick={() => jump(current - 1)}>
						←
					</button>
					<button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}>
						{playing ? 'Pause' : 'Play'}
					</button>
					<button type="button" aria-label="Next step" onClick={() => jump(current + 1)}>
						→
					</button>
					<span className="st-clock">{t.toFixed(1)} s</span>
				</div>
				<article className="st-card" key={current}>
					<p className="st-meta">
						<span className={`st-who st-who-${s.who}`}>{whoLabel[s.who]}</span>
						<span>
							{s.t.toFixed(1)} s, {laneName(s.from)} to {laneName(s.to)}
						</span>
					</p>
					<h4>{s.title}</h4>
					<p>{s.body}</p>
					<p className="st-call">
						<code>{s.label}</code>
					</p>
				</article>
			</div>
		</div>
	);
}
