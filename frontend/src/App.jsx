import { useEffect, useRef, useState } from 'react'
import './App.css'
import { GameScreen } from './game.jsx'
import { LeaderboardScreen } from './leaderboard.jsx'

const SKY_WIDTH = 320
const SKY_HEIGHT = 213

function drawCloud(context, x, y, tone, scale = 1) {
  const rows = [
    [8, 0, 20],
    [4, 4, 28],
    [0, 8, 36],
    [0, 12, 36],
    [4, 16, 28],
  ]

  context.fillStyle = tone
  rows.forEach(([offset, row, width]) => {
    context.fillRect(x + offset * scale, y + row * scale, width * scale, 4 * scale)
  })
}

function drawSky(context, cloudOffset = 0, calm = false) {
  const bands = ['rgb(255, 248, 217)', 'rgb(246, 242, 216)', '#e4e8f3', '#cbd7ef', '#b5c7ed', '#a3bbea']
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

  if (!calm) {
    drawCloud(context, 0, 177, 'rgb(184, 196, 238)', 2)
    drawCloud(context, 11, 169, '#dfe6fb', 2)
    drawCloud(context, 20, 163, '#ffffff', 2)
    drawCloud(context, 244, 174, '#b8c4ee', 2)
    drawCloud(context, 257, 166, '#dfe6fb', 2)
    drawCloud(context, 270, 160, '#ffffff', 2)
    drawCloud(context, 64 + cloudOffset, 54, '#ffffff')
    drawCloud(context, 216 - cloudOffset, 92, '#dfe6fb')
  }
}

function PixelSky({ calm = false, className = 'pixel-sky' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frameId
    let startTime = performance.now()

    const render = (time) => {
      const elapsedPixels = Math.floor((time - startTime) / 900) % 320
      const offset = calm || reducedMotion.matches ? 0 : elapsedPixels % 2
      drawSky(context, offset, calm)
      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return <canvas ref={canvasRef} className={className} width={SKY_WIDTH} height={SKY_HEIGHT} aria-hidden="true" />
}

function CrtFrame({ children, className = '' }) {
  return (
    <div className={`crt-frame ${className}`}>
      <div className="crt-decor" aria-hidden="true">
        <span className="crt-decor-item decor-star decor-top-left" />
        <span className="crt-decor-item decor-star decor-top-right" />
        <span className="crt-decor-item decor-star decor-middle-left" />
        <span className="crt-decor-item decor-star decor-middle-right" />
        <span className="crt-decor-item decor-star decor-bottom-left" />
        <span className="crt-decor-item decor-star decor-bottom-right" />
      </div>
      <div className="crt-screen">
        <PixelSky />
        <div className="sky-stars" aria-hidden="true">
          <span className="sky-star sky-star-one" />
          <span className="sky-star sky-star-two" />
          <span className="sky-star sky-star-three" />
          <span className="sky-star sky-star-four" />
        </div>
        <div className="crt-scanlines" aria-hidden="true" />
        <div className="crt-vignette" aria-hidden="true" />
        <div className="crt-content">{children}</div>
      </div>
    </div>
  )
}

function PixelButton({ children, variant, onClick, buttonRef, selected }) {
  return (
    <div className={`pixel-button-wrap ${selected ? 'is-selected' : ''}`}>
      {selected && <span className="pixel-cursor" aria-hidden="true" />}
      <button ref={buttonRef} className={`pixel-button pixel-button-${variant}`} type="button" onClick={onClick}>
        {children}
      </button>
    </div>
  )
}

function TitleScreen({ onStart, onLeaderboard }) {
  const [selected, setSelected] = useState(0)
  const buttonRefs = [useRef(null), useRef(null)]

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        setSelected((current) => (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 1 : 1)) % 2)
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        buttonRefs[selected].current?.click()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected])

  return (
    <section className="title-screen" aria-labelledby="game-title">
      <p className="pixel-label">Introducing</p>
      <h1 id="game-title">Saltare</h1>
      <div className="title-actions">
        <PixelButton buttonRef={buttonRefs[0]} variant="primary" selected={selected === 0} onClick={onStart}>Start Game</PixelButton>
        <PixelButton buttonRef={buttonRefs[1]} variant="secondary" selected={selected === 1} onClick={onLeaderboard}>Leaderboard</PixelButton>
      </div>
      <p className="press-start">Press Start</p>
      <p className="pixel-footer">FIND YOUR RHYTHM</p>
    </section>
  )
}

function PlaceholderScreen({ title, onBack }) {
  return (
    <section className="placeholder-screen">
      <p className="pixel-label">SALTARE</p>
      <h1>{title}</h1>
      <p className="placeholder-copy">Coming soon...</p>
      <button className="pixel-button pixel-button-secondary" type="button" onClick={onBack}>Back</button>
    </section>
  )
}

function App() {
  const [screen, setScreen] = useState('title')
  const [isZooming, setIsZooming] = useState(false)
  const forcedStatus = new URLSearchParams(window.location.search).get('status') === 'finished' ? 'finished' : 'playing'

  const startGame = () => {
    setIsZooming(true)
    window.setTimeout(() => {
      setScreen('game')
      setIsZooming(false)
    }, 360)
  }

  if (screen === 'game') {
    return <GameScreen status={forcedStatus} onBack={() => setScreen('title')} />
  }

  if (screen === 'leaderboard') {
    return <LeaderboardScreen playerName="Mina" onBack={() => setScreen('title')} />
  }

  return (
    <main className="app-shell">
      <CrtFrame className={isZooming ? 'is-zooming' : ''}>
        {screen === 'title' && <TitleScreen onStart={startGame} onLeaderboard={() => setScreen('leaderboard')} />}
      </CrtFrame>
    </main>
  )
}

export default App
