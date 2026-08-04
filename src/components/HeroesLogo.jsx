// HeroesLogo — Original truu Heroes Logo (gold). Liegt als JPEG in
// public/heroes-logo.jpeg und wird hier als <img> eingebunden, damit
// die exakte Original-Typografie + Farbgebung erhalten bleibt.

export default function HeroesLogo({ size = 60 }) {
  return (
    <img
      src="/heroes-logo.jpeg"
      alt="truu heroes"
      style={{ width: 'auto', height: size, display: 'block' }}
    />
  )
}
