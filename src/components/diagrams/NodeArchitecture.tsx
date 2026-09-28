/**
 * Every process in a staking node and every interface between them:
 * beacon node, execution client, validator client(s), optional remote signer,
 * optional MEV-Boost and relays, and the two P2P networks.
 *
 * Ports are Prysm defaults (src/data/cli-*.json): Engine API 8551,
 * Beacon REST 3500, gRPC 4000, libp2p TCP/QUIC 13000, discv5 UDP 12000.
 */
import React, { useId } from 'react';
import './NodeArchitecture.css';

export default function NodeArchitecture() {
	const id = `arch-${useId().replace(/[^\w-]/g, '')}`;
	const arrow = `url(#${id}-arrow)`;
	return (
		<figure className="arch not-content">
			<svg viewBox="0 0 800 540" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
				<title id={`${id}-title`}>The processes of an Ethereum staking node and the APIs between them</title>
				<desc id={`${id}-desc`}>
					The beacon node talks to the consensus peer-to-peer network and the execution client talks to the execution
					peer-to-peer network. The beacon node drives the execution client over the Engine API on port 8551,
					authenticated with a JWT secret: it sends newPayload, forkchoiceUpdated and getPayload, and receives payload
					statuses and built payloads. One or more validator clients connect to the beacon node over the Beacon API
					(REST, port 3500) or gRPC (port 4000): they receive duties and data to sign and return signed messages. A
					validator client can delegate signing to a remote signer such as Web3Signer. Optionally, the beacon node asks
					MEV-Boost for builder blocks over the Builder API, and MEV-Boost talks to relays and block builders.
				</desc>
				<defs>
					<marker
						id={`${id}-arrow`}
						viewBox="0 0 10 10"
						refX="9"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M0 0 10 5 0 10z" className="a-arrowhead" />
					</marker>
				</defs>

				{/* P2P networks */}
				<g className="a-net">
					<rect x="20" y="16" width="220" height="48" rx="24" />
					<text x="130" y="45">Consensus P2P (libp2p)</text>
					<rect x="560" y="16" width="220" height="48" rx="24" />
					<text x="670" y="45">Execution P2P (devp2p)</text>
				</g>
				<g className="a-link">
					<line x1="130" y1="66" x2="130" y2="146" markerStart={arrow} markerEnd={arrow} />
					<line x1="670" y1="66" x2="670" y2="146" markerStart={arrow} markerEnd={arrow} />
				</g>
				<text className="a-label a-left a-muted" x="142" y="100">gossip: blocks, attestations,</text>
				<text className="a-label a-left a-muted" x="142" y="116">blob data columns · TCP/QUIC 13000, UDP 12000</text>
				<text className="a-label a-right a-muted" x="658" y="100">gossip: transactions,</text>
				<text className="a-label a-right a-muted" x="658" y="116">blob transactions</text>

				{/* Beacon node */}
				<g className="a-box a-prysm">
					<rect x="20" y="150" width="220" height="130" rx="14" />
					<text className="a-title" x="130" y="186">Beacon node</text>
					<text className="a-sub" x="130" y="207">Prysm beacon-chain</text>
					<text className="a-small" x="130" y="237">fork choice, beacon state,</text>
					<text className="a-small" x="130" y="254">blocks, blobs, data columns</text>
				</g>

				{/* Execution client */}
				<g className="a-box">
					<rect x="560" y="150" width="220" height="130" rx="14" />
					<text className="a-title" x="670" y="186">Execution client</text>
					<text className="a-sub" x="670" y="207">Geth, Nethermind, Besu, Reth…</text>
					<text className="a-small" x="670" y="237">EVM, accounts and contracts,</text>
					<text className="a-small" x="670" y="254">mempool, payload building</text>
				</g>

				{/* Engine API */}
				<text className="a-label a-strong" x="400" y="164">Engine API</text>
				<text className="a-label a-muted" x="400" y="180">port 8551, JWT-authenticated</text>
				<g className="a-link a-accent">
					<line x1="244" y1="196" x2="554" y2="196" markerEnd={arrow} />
					<line x1="556" y1="230" x2="246" y2="230" markerEnd={arrow} />
				</g>
				<text className="a-label" x="400" y="215">newPayload · forkchoiceUpdated · getPayload</text>
				<text className="a-label a-muted" x="400" y="249">payload status (VALID, SYNCING…), built payloads</text>

				{/* Builder API to MEV-Boost */}
				<g className="a-link a-dashed">
					<path d="M244 268 H500 V358 H554" fill="none" markerEnd={arrow} markerStart={arrow} />
				</g>
				<text className="a-label a-right" x="492" y="312">Builder API</text>
				<text className="a-label a-right a-muted" x="492" y="328">optional</text>

				<g className="a-box a-optional">
					<rect x="560" y="330" width="220" height="56" rx="14" />
					<text className="a-title" x="670" y="356">MEV-Boost</text>
					<text className="a-sub" x="670" y="375">sidecar, optional</text>
				</g>
				<g className="a-link a-dashed">
					<line x1="670" y1="390" x2="670" y2="446" markerStart={arrow} markerEnd={arrow} />
				</g>
				<text className="a-label a-right a-muted" x="658" y="416">bids, blinded blocks</text>
				<g className="a-net">
					<rect x="560" y="450" width="220" height="48" rx="24" />
					<text x="670" y="479">Relays and block builders</text>
				</g>

				{/* Validator clients (stacked: one beacon node can serve many) */}
				<g className="a-box a-prysm a-stack">
					<rect x="36" y="344" width="220" height="64" rx="14" />
					<rect x="28" y="352" width="220" height="64" rx="14" />
				</g>
				<g className="a-box a-prysm">
					<rect x="20" y="360" width="220" height="64" rx="14" />
					<text className="a-title" x="130" y="388">Validator client</text>
					<text className="a-sub" x="130" y="408">one or many · holds keys</text>
				</g>
				<g className="a-link a-accent">
					<line x1="130" y1="340" x2="130" y2="284" markerStart={arrow} markerEnd={arrow} />
				</g>
				<text className="a-label a-left a-strong" x="142" y="300">Beacon API (REST, 3500) or gRPC (4000)</text>
				<text className="a-label a-left a-muted" x="142" y="317">↓ duties, data to sign</text>
				<text className="a-label a-left a-muted" x="142" y="333">↑ signatures, signed blocks</text>

				{/* Remote signer */}
				<g className="a-link a-dashed">
					<line x1="130" y1="428" x2="130" y2="468" markerStart={arrow} markerEnd={arrow} />
				</g>
				<text className="a-label a-left a-muted" x="142" y="452">signing requests over HTTP</text>
				<g className="a-box a-optional">
					<rect x="20" y="472" width="220" height="52" rx="14" />
					<text className="a-title" x="130" y="496">Remote signer</text>
					<text className="a-sub" x="130" y="514">Web3Signer, optional</text>
				</g>
			</svg>
		</figure>
	);
}
