import { useEffect, useReducer, useRef } from 'react'
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

function MainWindow({ round, totalRounds, finished, onClose, onExpand, maximized, popupOpen, onShowMove, children, closeRef, onFocus, onDragStart }) {
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
				{finished && <div className={styles.finished} role="status" aria-live="polite">Finished!</div>}
				<div className={styles.contentScanlines} aria-hidden="true" />
				<div className={styles.contentVignette} aria-hidden="true" />
			</div>
			<footer className={styles.statusBar}>
				<span>ROUND {round} / {totalRounds}</span>
				{!popupOpen && <button className={styles.showMove} type="button" onClick={onShowMove}>SHOW MOVE</button>}
			</footer>
		</PixelWindow>
	)
}

function CopyMovePopup({ referenceName, onClose, position, onFocus, onDragStart, children }) {
	return (
		<PixelWindow
			title="COPY THIS MOVE"
			ariaLabel="Copy this move"
			onClose={onClose}
			onFocus={onFocus}
			onDragStart={onDragStart}
			className={styles.copyPopup}
			style={{ left: position.x, top: position.y, zIndex: 4 }}
		>
			<div className={styles.copyBody}>
				<div className={styles.movePreview}>{children}</div>
				<span>{referenceName}</span>
			</div>
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

export function DesktopScreen({ referenceName = 'Reference Dance', round = 1, totalRounds = 3, status = 'playing', playerName = 'Player', onBack, children }) {
	const [state, dispatch] = useReducer(reducer, undefined, initialState)
	const closeButtonRef = useRef(null)
	const dragRef = useRef(null)
	const finished = status === 'finished'

	useEffect(() => {
		const move = (event) => {
			if (!dragRef.current) return
			const { startX, startY, origin } = dragRef.current
			const x = Math.max(8, Math.min(window.innerWidth - 190, origin.x + event.clientX - startX))
			const y = Math.max(8, Math.min(window.innerHeight - 160, origin.y + event.clientY - startY))
			dispatch({ type: 'move', position: { x, y } })
		}
		const stop = () => { dragRef.current = null }
		window.addEventListener('pointermove', move)
		window.addEventListener('pointerup', stop)
		return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop) }
	}, [])

	const startDrag = (event) => {
		if (window.innerWidth < 700 || event.target.closest('button')) return
		dragRef.current = { startX: event.clientX, startY: event.clientY, origin: state.positions.popup }
	}

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
				popupOpen={state.popupOpen}
				maximized={state.maximized}
				onClose={() => dispatch({ type: 'openWarning' })}
				onExpand={() => dispatch({ type: 'toggleMax' })}
				onShowMove={() => dispatch({ type: 'togglePopup' })}
				closeRef={closeButtonRef}
				onFocus={() => dispatch({ type: 'focus', id: 'main' })}
			>{children}</MainWindow>
			{state.popupOpen && !finished && <CopyMovePopup referenceName={referenceName} position={state.positions.popup} onClose={() => dispatch({ type: 'closePopup' })} onFocus={() => dispatch({ type: 'focus', id: 'popup' })} onDragStart={startDrag}>{children}</CopyMovePopup>}
			{state.warningOpen && <WarningDialog returnFocusRef={closeButtonRef} onNo={closeWarning} onYes={onBack} />}
			{finished && <p className={styles.scoreCaption} role="status">{playerName}, your score is on the leaderboard.</p>}
		</main>
	)
}

export function GameScreen(props) {
	return <DesktopScreen {...props} />
}
