import { useEffect, useState } from 'react'
import { PixelSky, PixelWindow } from './game.jsx'
import { getTopScores } from './scores.js'
import styles from './leaderboard.module.css'


function useLeaderboard() {
	const [status, setStatus] = useState('loading')
	const [entries, setEntries] = useState([])
	const [reloadKey, setReloadKey] = useState(0)

	useEffect(() => {
		let active = true
		setStatus('loading')

		getTopScores()
			.then((scores) => {
				if (!active) return
				setEntries(scores)
				setStatus(scores.length ? 'ready' : 'empty')
			})
			.catch(() => {
				if (active) setStatus('error')
			})

		return () => { active = false }
	}, [reloadKey])

	return { entries, status, reload: () => setReloadKey((value) => value + 1) }
}

function RankBadge({ rank }) {
	const colors = { 1: ['#f5c518', '#a78000'], 2: ['#c9d1dc', '#7f8996'], 3: ['#c77d3a', '#824a20'] }
	const [fill, outline] = colors[rank]
	return (
		<span className={styles.rankBadge} aria-hidden="true">
			<svg viewBox="0 0 12 12" width="24" height="24">
				<rect x="3" y="0" width="6" height="1" fill={outline} />
				<rect x="2" y="1" width="8" height="2" fill={outline} />
				<rect x="1" y="3" width="10" height="5" fill={outline} />
				<rect x="2" y="8" width="8" height="2" fill={outline} />
				<rect x="4" y="10" width="4" height="2" fill={outline} />
				<rect x="3" y="2" width="6" height="6" fill={fill} />
				<rect x="4" y="8" width="4" height="2" fill={fill} />
			</svg>
		</span>
	)
}

function LeaderboardTable({ entries, playerName }) {
	const visibleEntries = [...entries]
	const playerIndex = visibleEntries.findIndex((entry) => entry.name.toLowerCase() === playerName?.toLowerCase())
	if (playerName && playerIndex < 0) {
		visibleEntries.push({ id: 'player-pinned', name: playerName, score: 0, pinned: true })
	}

	return (
		<div className={styles.tableScroll} role="region" aria-label="Overall leaderboard" tabIndex="0">
			<table className={styles.table}>
				<thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Score</th></tr></thead>
				<tbody>
					{visibleEntries.map((entry, index) => {
						const isPlayer = entry.name.toLowerCase() === playerName?.toLowerCase()
						return (
							<tr key={entry.id} className={`${styles.tableRow} ${isPlayer ? styles.playerRow : ''} ${entry.pinned ? styles.pinnedRow : ''}`} style={{ '--row-delay': `${Math.min(index, 3) * 55}ms` }}>
								<td>{index < 3 && !entry.pinned ? <><RankBadge rank={index + 1} /><span className={styles.visuallyHidden}>{index + 1}</span></> : <span className={styles.rankNumber}>{entry.pinned ? '-' : index + 1}</span>}</td>
								<th scope="row">{entry.name}{isPlayer && <><span className={styles.youTag}>YOU</span><span className={styles.visuallyHidden}>Your score</span></>}</th>
								<td><span className={styles.scoreCell}>{entry.score}<span className={styles.scoreTrack}><span className={styles.scoreFill} style={{ width: `${entry.score}%` }} /></span></span></td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

function EmptyState() {
	return <div className={styles.emptyState}>
		<svg className={styles.trophy} viewBox="0 0 32 28" width="64" height="56" aria-hidden="true">
			<path fill="#a78000" d="M8 2h16v4h4v8h-4v4h-4v4h4v4H8v-4h4v-4H8v-4H4V6h4V2ZM4 8v4h4V8H4Zm20 0v4h4V8h-4Z" />
			<path fill="#f5c518" d="M11 5h10v9l-5 4-5-4V5ZM8 8h3v6H8V8Zm13 0h3v6h-3V8Zm-7 13h4v3h-4v-3Z" />
		</svg>
		<strong>NO SCORES YET</strong><span>Finish a dance to claim the first spot.</span>
	</div>
}

function StatusBar({ status, count, label }) {
	return <footer className={styles.statusBar}><span>{status === 'loading' ? 'LOADING...' : `${count} PLAYERS`}</span><span>{label}</span></footer>
}

export function LeaderboardScreen({ playerName = '', onBack }) {
	const [maximized, setMaximized] = useState(false)
	const { entries, status, reload } = useLeaderboard()

	return (
		<main className={styles.desktopScreen}>
			<PixelSky className={styles.wallpaper} />
			<div className={styles.wallpaperDots} aria-hidden="true" />
			<div className={styles.leaderboardWindowWrap}>
				<PixelWindow
					title="LEADERBOARD.EXE"
					ariaLabel="Saltare leaderboard window"
					onClose={onBack}
					onExpand={() => setMaximized((value) => !value)}
					expanded={maximized}
					className={`${styles.leaderboardWindow} ${maximized ? styles.maximized : ''}`}
				>
					<div className={styles.leaderboardBody}>
						{status === 'loading' && <div className={styles.loadingRows}>{Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeletonRow} />)}</div>}
						{status === 'empty' && <EmptyState />}
						{status === 'error' && <div className={styles.errorState}><strong>COULD NOT LOAD SCORES</strong><button type="button" className={styles.winButton} onClick={reload}>Retry</button></div>}
						{status === 'ready' && <LeaderboardTable entries={entries} playerName={playerName} />}
						<StatusBar status={status} count={entries.length} label="OVERALL SCORES" />
					</div>
				</PixelWindow>
			</div>
		</main>
	)
}

export default LeaderboardScreen
