/** Landing page body, below the hero. */
import React from 'react';
import Link from '@docusaurus/Link';
import { useHistory } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import { LINKS } from '@site/src/data/site';
import './Landing.css';

const refLinks = [
	['Common flags', '/reference/cli/', 'The flags most people set, and the config file'],
	['Fee recipient', '/validators/fee-recipient/', 'Per-validator fee recipient, gas limit and builder'],
	['Networks', '/reference/networks/', 'Live slot, upcoming upgrades, deposit contracts'],
	['Ports', '/reference/ports/', 'What to open, what to keep private'],
];

function FlagSearch() {
	const history = useHistory();
	const target = useBaseUrl('/reference/cli/beacon-chain/');
	return (
		<form
			className="flag-search"
			action={target}
			method="get"
			role="search"
			onSubmit={(e) => {
				e.preventDefault();
				const q = new FormData(e.currentTarget).get('q') ?? '';
				history.push(`${target}?q=${encodeURIComponent(String(q))}`);
			}}
		>
			<label htmlFor="flag-q">Find a beacon node flag</label>
			<div>
				<input id="flag-q" name="q" type="search" placeholder="checkpoint, peers, blob…" autoComplete="off" />
				<button type="submit">Search flags</button>
			</div>
		</form>
	);
}

export default function Landing() {
	return (
		<div className="prysm-landing">

			<section className="band split" aria-labelledby="ref-title">
				<div>
					<h2 id="ref-title">Command-line reference</h2>
					<p>
						Every flag of <code>beacon-chain</code>, <code>validator</code> and <code>prysmctl</code> is detailed: what it
						does, its type and its default value.
					</p>
					<FlagSearch />
				</div>
				<ul className="ref-links">
					{refLinks.map(([label, href, desc]) => (
						<li key={href}>
							<Link to={href}>{label}</Link>
							<span>{desc}</span>
						</li>
					))}
				</ul>
			</section>

			<section className="band community" aria-labelledby="community-title">
				<h2 id="community-title">Talk to the Prysm team</h2>
				<p>
					Core developers and experienced operators answer questions in Discord. Found a bug? Open an issue on GitHub
					with your logs and version.
				</p>
				<div className="community-links">
					<a href={LINKS.discord}>Join the Prysm Discord</a>
					<a href={`${LINKS.github}/issues`}>Open a GitHub issue</a>
					<a href={LINKS.releases}>Read the release notes</a>
				</div>
			</section>
		</div>
	);
}
