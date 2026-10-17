import { useEffect, useReducer, useRef, useState } from 'react'
import styles from './game.module.css'

const SKY_WIDTH = 320
const SKY_HEIGHT = 213

function drawSky(context) {
	const bands = ['#fff8d9', '#f6f2d8', '#e4e8f3', '#cbd7ef', '#b5c7ed', '#a3bbea']
	const bandHeight = 36

	context.clearRect(0, 0, SKY_WIDTH, SKY_HEIGHT)
	bands.forEach((color, index) => {
		context.fillStyle = color
		context.fillRect(0, index * bandHeight, SKY_WIDTH, bandHeight + 2)
		if (index < bands.length - 1) {
			context.fillStyle = bands[index + 1]
			for (let x = 0; x < SKY_WIDTH; x += 2) {
				for (let y = (index + 1) * bandHeight; y < (index + 1) * bandHeight + 2; y += 2) {
					if ((x / 2 + y / 2) % 2 === 0) context.fillRect(x, y, 2, 2)
				}
			}
		}
	})
}

export function PixelSky({ className = '' }) {
	const canvasRef = useRef(null)

	useEffect(() => {
		const context = canvasRef.current?.getContext('2d')
		if (!context) return undefined
		drawSky(context)
		return undefined
	}, [])

	return <canvas ref={canvasRef} className={`${styles.sky} ${className}`} width={SKY_WIDTH} height={SKY_HEIGHT} aria-hidden="true" />
}

function WindowButton({ label, className, onClick, pressed = false, buttonRef }) {
	return <button ref={buttonRef} className={`${styles.windowButton} ${className}`} type="button" aria-label={label} aria-pressed={label === 'Toggle full window' ? pressed : undefined} onClick={onClick}>{label === 'Close' ? '×' : '↗'}</button>
}

export function PixelWindow({ title, onClose, onExpand, expanded = false, children, ariaLabel, className = '', style, onFocus, onDragStart, closeButtonRef }) {
	return (
		<div className={`${styles.windowShell} ${className}`} style={style} onPointerDown={onFocus}>
			<section className={styles.pixelWindow} aria-label={ariaLabel || title}>
				<header className={styles.windowTitlebar} onPointerDown={onDragStart}>
					<span>{title}</span>
					<div className={styles.windowControls}>
						{onExpand && <WindowButton label="Toggle full window" pressed={expanded} className={styles.expandButton} onClick={onExpand} />}
						<WindowButton buttonRef={closeButtonRef} label="Close" className={styles.closeButton} onClick={onClose} />
					</div>
				</header>
				<div className={styles.windowInner}>{children}</div>
			</section>
		</div>
	)
}

function reducer(state, action) {
	switch (action.type) {
		case 'focus':
			return { ...state, z: { ...state.z, [action.id]: Math.max(...Object.values(state.z)) + 1 } }
		case 'togglePopup':
			return { ...state, popupOpen: !state.popupOpen }
		case 'closePopup':
			return { ...state, popupOpen: false }
		case 'openWarning':
			return { ...state, warningOpen: true }
		case 'closeWarning':
			return { ...state, warningOpen: false }
		case 'toggleMax':
			return { ...state, maximized: !state.maximized }
		case 'move':
			return { ...state, positions: { ...state.positions, popup: action.position } }
		default:
			return state
	}
}

function initialState() {
	const popupWidth = Math.min(window.innerWidth * 0.34, 360)
	return {
		popupOpen: true,
		warningOpen: false,
		maximized: false,
		positions: { popup: { x: Math.max(24, Math.min(window.innerWidth * 0.58, window.innerWidth - popupWidth - 24)), y: Math.max(24, window.innerHeight * 0.12) } },
		z: { main: 2, popup: 3 },
	}
}

function MainWindow({ round, totalRounds, finished, onClose, onExpand, maximized, children, finishedContent, closeRef, onFocus, onDragStart }) {
	return (
		<PixelWindow
			title="SALTARE.EXE"
			ariaLabel="Saltare game window"
			onClose={onClose}
			onExpand={onExpand}
			onFocus={onFocus}
			onDragStart={onDragStart}
			closeButtonRef={closeRef}
			expanded={maximized}
			className={`${styles.mainWindow} ${maximized ? styles.maximized : ''}`}
			style={{ zIndex: 2 }}
		>
			<div className={styles.mainContent}>
				{!finished && children}
				{finished && (finishedContent || <div className={styles.finished} role="status" aria-live="polite">Finished!</div>)}
				<div className={styles.contentScanlines} aria-hidden="true" />
				<div className={styles.contentVignette} aria-hidden="true" />
			</div>
			<footer className={styles.statusBar}>
				<span>ROUND {round} / {totalRounds}</span>
			</footer>
		</PixelWindow>
	)
}

function WarningDialog({ onYes, onNo, returnFocusRef }) {
	const noRef = useRef(null)
	const dialogRef = useRef(null)
	const dialogCloseRef = useRef(null)

	useEffect(() => {
		noRef.current?.focus()
		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onNo()
			if (event.key !== 'Tab') return
			const focusable = dialogRef.current?.querySelectorAll('button') || []
			if (!focusable.length) return
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
			else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [onNo])

	const handleClose = () => {
		onNo()
		window.requestAnimationFrame(() => returnFocusRef.current?.focus())
	}

	return (
		<div className={styles.modalBackdrop} onMouseDown={(event) => event.target === event.currentTarget && handleClose()}>
			<section ref={dialogRef} className={styles.warningDialog} role="alertdialog" aria-modal="true" aria-labelledby="warning-title">
				<header className={styles.warningTitlebar}>
					<span id="warning-title">WARNING</span>
					  <button ref={dialogCloseRef} className={styles.dialogClose} type="button" aria-label="Close" onClick={handleClose}>×</button>
				</header>
				<div className={styles.warningBody}>
					<p>DO YOU WANT TO<br />GO BACK?</p>
					<div className={styles.dialogActions}>
						<button type="button" onClick={onYes}>Yes</button>
						<button ref={noRef} type="button" onClick={onNo}>No</button>
					</div>
				</div>
			</section>
		</div>
	)
}

export function DesktopScreen({ round = 1, totalRounds = 3, status = 'playing', onBack, children, finishedContent }) {
	const [state, dispatch] = useReducer(reducer, undefined, initialState)
	const closeButtonRef = useRef(null)
	const finished = status === 'finished'

	const closeWarning = () => {
		dispatch({ type: 'closeWarning' })
		window.requestAnimationFrame(() => closeButtonRef.current?.focus())
	}

	return (
		<main className={styles.desktopScreen}>
			<PixelSky className={styles.wallpaper} />
			<div className={styles.wallpaperDots} aria-hidden="true" />
			<div className={styles.spriteLayer} aria-hidden="true"><span>✦</span><span>♥</span><span>✧</span></div>
			<MainWindow
				round={round}
				totalRounds={totalRounds}
				finished={finished}
				maximized={state.maximized}
				onClose={() => dispatch({ type: 'openWarning' })}
				onExpand={() => dispatch({ type: 'toggleMax' })}
				finishedContent={finishedContent}
				closeRef={closeButtonRef}
				onFocus={() => dispatch({ type: 'focus', id: 'main' })}
			>{children}</MainWindow>
			{state.warningOpen && <WarningDialog returnFocusRef={closeButtonRef} onNo={closeWarning} onYes={onBack} />}
		</main>
	)
}

export function GameScreen(props) {
	return <DesktopScreen {...props} />
}

export function GameResults({ roundScores = [], finalScore = 0, name, onNameChange, onAdd, onRestart, saving }) {
	return <section className={styles.resultsScreen} aria-labelledby="results-title">
		<p className={styles.resultsKicker}>DANCE COMPLETE</p>
		<h2 id="results-title">YOUR SCORE</h2>
		<div className={styles.roundScores}>
			{[0, 1, 2].map((index) => <div key={index} className={styles.roundScore}><span>ROUND {index + 1}</span><strong>{roundScores[index] ?? 0}</strong></div>)}
		</div>
		<div className={styles.finalScore}><span>FINAL SCORE</span><strong>{finalScore}</strong></div>
		<label className={styles.nameField} htmlFor="leaderboard-name">NAME
			<input id="leaderboard-name" value={name} maxLength={20} onChange={(event) => onNameChange(event.target.value)} placeholder="ENTER NAME" />
		</label>
		<div className={styles.resultActions}>
			<button type="button" className={styles.addScoreButton} disabled={saving || !name.trim()} onClick={onAdd}>{saving ? 'SAVING...' : 'ADD TO LEADERBOARD'}</button>
			<button type="button" className={styles.restartButton} onClick={onRestart}>RESTART</button>
		</div>
	</section>
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const REFERENCE_VIDEO = '/reference-dance.mp4'

export function PoseGame({ danceId = 'test_video', onRoundChange, onFinished }) {
	const videoRef = useRef(null)
	const referenceRef = useRef(null)
	const canvasRef = useRef(null)
	const streamRef = useRef(null)
	const sessionRef = useRef(null)
	const cameraStartedAtRef = useRef(null)
	const roundDurationRef = useRef(null)
	const roundRef = useRef(1)
	const finishingRef = useRef(false)
	const onRoundChangeRef = useRef(onRoundChange)
	const onFinishedRef = useRef(onFinished)
	const sendingRef = useRef(false)
	const frameLoopRef = useRef(null)
	const lastSentRef = useRef(0)
	const [score, setScore] = useState(null)
	const [phase, setPhase] = useState('reference')
	const [countdown, setCountdown] = useState(3)
	const [message, setMessage] = useState('Watch the reference')
	const phaseRef = useRef(phase)
	useEffect(() => {
		onRoundChangeRef.current = onRoundChange
		onFinishedRef.current = onFinished
	}, [onFinished, onRoundChange])
	useEffect(() => { phaseRef.current = phase }, [phase])

	useEffect(() => {
		if (phase === 'camera' && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
	}, [phase])

	useEffect(() => {
		if (phase !== 'countdown') return undefined
		const timeout = window.setTimeout(() => {
			setCountdown((value) => {
				if (value <= 1) {
					cameraStartedAtRef.current = performance.now()
					setPhase('camera')
					setMessage('Your turn')
					return 0
				}
				return value - 1
			})
		}, 1000)
		return () => window.clearTimeout(timeout)
	}, [phase, countdown])

	useEffect(() => {
		let active = true
		let stream

		const start = async () => {
			try {
				stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
				if (!active) return
				streamRef.current = stream
				const response = await fetch(`${API_URL}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dance_id: danceId }) })
				if (!response.ok) throw new Error('Could not start scoring session')
				const session = await response.json()
				sessionRef.current = session.session_id
				roundDurationRef.current = (session.frames / session.fps) * 1000
				onRoundChangeRef.current?.(1)
				const sendFrame = async (time) => {
					if (!active) return
					frameLoopRef.current = requestAnimationFrame(sendFrame)
					if (phaseRef.current !== 'camera' || !cameraStartedAtRef.current) return
					const elapsed = time - cameraStartedAtRef.current
					if (elapsed >= roundDurationRef.current && !sendingRef.current) {
						if (roundRef.current < 3) {
							roundRef.current += 1
							onRoundChangeRef.current?.(roundRef.current)
							cameraStartedAtRef.current = null
							setPhase('reference')
							setMessage('Watch the reference')
							if (referenceRef.current) {
								referenceRef.current.currentTime = 0
								referenceRef.current.play().catch(() => {})
							}
							return
						}
					}
					if (elapsed >= roundDurationRef.current && roundRef.current === 3 && !finishingRef.current) {
						finishingRef.current = true
						const finishedSessionId = sessionRef.current
						sessionRef.current = null
						const finished = await fetch(`${API_URL}/api/sessions/${finishedSessionId}/finish`, { method: 'POST' })
						const result = finished.ok ? await finished.json() : { score: 0 }
						if (active) onFinishedRef.current?.(result.score, result.round_scores || [])
						return
					}
					if (!sessionRef.current || sendingRef.current || time - lastSentRef.current < 160 || videoRef.current.readyState < 2) return
					const video = videoRef.current
					const canvas = canvasRef.current
					canvas.width = video.videoWidth || 640
					canvas.height = video.videoHeight || 480
					canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
					lastSentRef.current = time
					sendingRef.current = true
					canvas.toBlob(async (blob) => {
						try {
							const form = new FormData()
							form.append('frame', blob, 'camera.jpg')
							form.append('round_number', String(roundRef.current))
							const result = await fetch(`${API_URL}/api/sessions/${sessionRef.current}/frames`, { method: 'POST', body: form })
							if (result.ok && active) setScore((await result.json()).average_score)
						} finally {
							sendingRef.current = false
						}
					}, 'image/jpeg', 0.7)
				}
				frameLoopRef.current = requestAnimationFrame(sendFrame)
			} catch (error) {
				if (active) setMessage(error.message || 'Camera or backend unavailable')
			}
		}

		start()
		return () => {
			active = false
			if (frameLoopRef.current) cancelAnimationFrame(frameLoopRef.current)
			streamRef.current?.getTracks().forEach((track) => track.stop())
			if (sessionRef.current) fetch(`${API_URL}/api/sessions/${sessionRef.current}/finish`, { method: 'POST' }).catch(() => {})
		}
	}, [danceId])

	const startCameraRound = () => {
		setCountdown(3)
		setPhase('countdown')
		setMessage('Get ready')
	}

	return <div className={styles.poseGame}>
		{phase === 'reference' && <video ref={referenceRef} className={styles.referenceFeed} src={REFERENCE_VIDEO} autoPlay muted playsInline onEnded={startCameraRound} aria-label="Reference dance video" />}
		{phase === 'countdown' && <div className={styles.countdown} role="status" aria-live="assertive"><span>GET READY</span><strong>{countdown}</strong></div>}
		{phase === 'camera' && <video ref={videoRef} className={styles.cameraFeed} autoPlay muted playsInline aria-label="Your camera feed" />}
		<canvas ref={canvasRef} className={styles.captureCanvas} aria-hidden="true" />
		<div className={styles.poseHud}><span>{message}</span><strong>{score === null ? '--' : `${score}%`}</strong></div>
	</div>
}
