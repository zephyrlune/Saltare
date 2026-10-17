import { useEffect, useMemo, useState } from 'react'
import { PixelSky, PixelWindow } from './game.jsx'
import styles from './leaderboard.module.css'

export const DANCES = [
	{ id: 'reference-dance', label: 'Reference Dance' },
	{ id: 'moon-step', label: 'Moon Step' },
	{ id: 'sunny-hop', label: 'Sunny Hop' },
]

const NAMES = ['Mina', 'Rafi', 'Jo', 'Tara', 'Niko', 'Ari', 'Lena', 'Bimo', 'Sora', 'Kian', 'Vee', 'Dara', 'Omar', 'Ira', 'Noel', 'Zia', 'Pip', 'Rio', 'Aya', 'Ken']

const MOCK_ENTRIES = DANCES.flatMap((dance, danceIndex) => NAMES.map((name, index) => ({
	id: `${dance.id}-${index + 1}`,
	name,
	score: Math.max(42, 98 - index * 2 - danceIndex * 3),
	date: `2026-0${danceIndex + 4}-${String(20 - (index % 18)).padStart(2, '0')}`,
	danceId: dance.id,
})))

export function useLeaderboard(danceId) {
	const queryState = new URLSearchParams(window.location.search).get('leaderboard')
	const requestedStatus = ['loading', 'empty', 'error'].includes(queryState) ? queryState : 'ready'
	const [status, setStatus] = useState(requestedStatus)
	const [reloadKey, setReloadKey] = useState(0)

	useEffect(() => {
		setStatus(requestedStatus)
	}, [danceId, reloadKey, requestedStatus])

	const entries = useMemo(() => {
		if (status === 'empty' || status === 'error' || status === 'loading') return []
		return MOCK_ENTRIES.filter((entry) => entry.danceId === danceId).sort((a, b) => b.score - a.score)
	}, [danceId, status])

	return { entries, status, reload: () => { setStatus('ready'); setReloadKey((value) => value + 1) } }
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

function DanceTabs({ activeDance, onChange }) {
	const handleKeyDown = (event, index) => {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
		event.preventDefault()
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? DANCES.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + DANCES.length) % DANCES.length
		onChange(DANCES[next].id)
		document.getElementById(`dance-tab-${DANCES[next].id}`)?.focus()
	}

	return (
		<div className={styles.tabs} role="tablist" aria-label="Choose a dance">
			{DANCES.map((dance, index) => (
				<button
					key={dance.id}
					id={`dance-tab-${dance.id}`}
					className={`${styles.tab} ${dance.id === activeDance ? styles.activeTab : ''}`}
					type="button"
					role="tab"
					aria-selected={dance.id === activeDance}
					aria-controls="leaderboard-panel"
					tabIndex={dance.id === activeDance ? 0 : -1}
					onClick={() => onChange(dance.id)}
					onKeyDown={(event) => handleKeyDown(event, index)}
				>{dance.label}</button>
			))}
		</div>
	)
}

function formatDate(date) {
	return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)).toUpperCase()
}

function LeaderboardTable({ entries, playerName, activeDance }) {
	const visibleEntries = [...entries]
	const playerIndex = visibleEntries.findIndex((entry) => entry.name.toLowerCase() === playerName?.toLowerCase())
	if (playerName && playerIndex < 0) {
		visibleEntries.push({ id: 'player-pinned', name: playerName, score: 0, date: new Date().toISOString(), pinned: true })
	}

	return (
		<div className={styles.tableScroll} role="tabpanel" id="leaderboard-panel" aria-labelledby={`dance-tab-${activeDance}`} tabIndex="0">
			<table className={styles.table}>
				<thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Date</th></tr></thead>
				<tbody>
					{visibleEntries.map((entry, index) => {
						const isPlayer = entry.name.toLowerCase() === playerName?.toLowerCase()
						return (
							<tr key={entry.id} className={`${styles.tableRow} ${isPlayer ? styles.playerRow : ''} ${entry.pinned ? styles.pinnedRow : ''}`} style={{ '--row-delay': `${Math.min(index, 3) * 55}ms` }}>
								<td>{index < 3 && !entry.pinned ? <><RankBadge rank={index + 1} /><span className={styles.visuallyHidden}>{index + 1}</span></> : <span className={styles.rankNumber}>{entry.pinned ? '-' : index + 1}</span>}</td>
								<th scope="row">{entry.name}{isPlayer && <><span className={styles.youTag}>YOU</span><span className={styles.visuallyHidden}>Your score</span></>}</th>
								<td><span className={styles.scoreCell}>{entry.score}<span className={styles.scoreTrack}><span className={styles.scoreFill} style={{ width: `${entry.score}%` }} /></span></span></td>
								<td className={styles.dateCell}>{formatDate(entry.date)}</td>
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
	const [activeDance, setActiveDance] = useState(DANCES[0].id)
	const [maximized, setMaximized] = useState(false)
	const { entries, status, reload } = useLeaderboard(activeDance)
	const activeLabel = DANCES.find((dance) => dance.id === activeDance)?.label

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
						<DanceTabs activeDance={activeDance} onChange={setActiveDance} />
						{status === 'loading' && <div className={styles.loadingRows}>{Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeletonRow} />)}</div>}
						{status === 'empty' && <EmptyState />}
						{status === 'error' && <div className={styles.errorState}><strong>COULD NOT LOAD SCORES</strong><button type="button" className={styles.winButton} onClick={reload}>Retry</button></div>}
						{status === 'ready' && <LeaderboardTable entries={entries} playerName={playerName} activeDance={activeDance} />}
						<StatusBar status={status} count={entries.length} label={activeLabel} />
					</div>
				</PixelWindow>
			</div>
		</main>
	)
}

export default LeaderboardScreen
